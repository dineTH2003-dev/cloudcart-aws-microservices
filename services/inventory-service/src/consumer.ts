import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { pool } from './db';
import { logger } from './logger';

const region = process.env.AWS_REGION || 'us-east-1';
const endpoint = process.env.SQS_ENDPOINT || undefined;

const clientConfig: { region: string; endpoint?: string; credentials?: { accessKeyId: string; secretAccessKey: string } } = {
  region,
};

if (endpoint) {
  clientConfig.endpoint = endpoint;
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  };
  logger.info(`Configured SQS client with custom endpoint: ${endpoint}`);
}

export const sqsClient = new SQSClient(clientConfig);
export const INVENTORY_QUEUE_URL = process.env.INVENTORY_QUEUE_URL || 'http://localhost:4566/000000000000/cloudcart-inventory-queue';

interface OrderItem {
  productId: string;
  quantity: number;
}

interface OrderEventPayload {
  eventType: string;
  orderId: string;
  userId: string;
  items: OrderItem[];
}

let isRunning = true;

export function stopConsumer() {
  isRunning = false;
}

export async function startInventoryConsumer() {
  logger.info(`Starting Inventory SQS Consumer on queue: ${INVENTORY_QUEUE_URL}`);

  while (isRunning) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: INVENTORY_QUEUE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 5, // Long polling
        VisibilityTimeout: 30,
      });

      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          if (!message.Body || !message.ReceiptHandle) continue;

          try {
            await processMessage(message.Body);
            // Delete message upon successful handling
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: INVENTORY_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
          } catch (processingErr) {
            logger.error('Failed to process inventory message, leaving in queue for retry / DLQ', processingErr);
          }
        }
      }
    } catch (err) {
      if (!isRunning) break;
      logger.error('Error polling SQS messages in inventory-service', err);
      // Wait 3 seconds before next poll to avoid tight loop on error
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function processMessage(rawBody: string) {
  let event: OrderEventPayload;
  try {
    const parsed = JSON.parse(rawBody);
    // Handle SNS envelope if message was published via SNS-SQS subscription
    if (parsed.Message && typeof parsed.Message === 'string') {
      event = JSON.parse(parsed.Message);
    } else {
      event = parsed;
    }
  } catch (parseErr) {
    logger.error('Malformed JSON received in inventory-service queue', parseErr, { rawBody });
    throw parseErr;
  }

  if (event.eventType !== 'OrderCreated') {
    logger.info(`Ignoring non-OrderCreated event: ${event.eventType}`);
    return;
  }

  const { orderId, items } = event;
  logger.info(`Processing stock reservation for order ${orderId}`, { itemsCount: items?.length });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    let allAvailable = true;
    for (const item of items) {
      // Check current stock
      const stockRes = await client.query('SELECT stock_quantity FROM products WHERE id = $1 FOR UPDATE', [item.productId]);
      const rowCount = stockRes.rowCount ?? 0;
      if (rowCount === 0 || stockRes.rows[0].stock_quantity < item.quantity) {
        allAvailable = false;
        logger.warn(`Insufficient stock for product ${item.productId}`, {
          requested: item.quantity,
          available: rowCount > 0 ? stockRes.rows[0].stock_quantity : 0,
        });
        break;
      }
    }

    if (allAvailable) {
      // Deduct stock for each item
      for (const item of items) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
          [item.quantity, item.productId]
        );
      }
      // Confirm order status in PostgreSQL
      await client.query("UPDATE orders SET status = 'CONFIRMED', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [orderId]);
      await client.query('COMMIT');
      logger.info(`Stock successfully reserved and order confirmed: ${orderId}`);
    } else {
      // Reject order
      await client.query("UPDATE orders SET status = 'CANCELLED_OUT_OF_STOCK', updated_at = CURRENT_TIMESTAMP WHERE id = $1", [orderId]);
      await client.query('COMMIT');
      logger.warn(`Order rejected due to out-of-stock items: ${orderId}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
