import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

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
export const NOTIFICATION_QUEUE_URL = process.env.NOTIFICATION_QUEUE_URL || 'http://localhost:4566/000000000000/cloudcart-notification-queue';

export interface NotificationRecord {
  id: string;
  orderId: string;
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  dispatchedAt: string;
}

// In-memory buffer storing recent notifications (for live demo and verification)
export const notificationHistory: NotificationRecord[] = [];

let isRunning = true;

export function stopConsumer() {
  isRunning = false;
}

export async function startNotificationConsumer() {
  logger.info(`Starting Notification SQS Consumer on queue: ${NOTIFICATION_QUEUE_URL}`);

  while (isRunning) {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: NOTIFICATION_QUEUE_URL,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 5, // Long polling
        VisibilityTimeout: 30,
      });

      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          if (!message.Body || !message.ReceiptHandle) continue;

          try {
            await processNotification(message.Body);
            // Delete message upon successful handling
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: NOTIFICATION_QUEUE_URL,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
          } catch (processingErr) {
            logger.error('Failed to process notification message, leaving in queue for retry / DLQ', processingErr);
          }
        }
      }
    } catch (err) {
      if (!isRunning) break;
      logger.error('Error polling SQS messages in notification-service', err);
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  }
}

async function processNotification(rawBody: string) {
  let event: Record<string, unknown>;
  try {
    const parsed = JSON.parse(rawBody);
    if (parsed.Message && typeof parsed.Message === 'string') {
      event = JSON.parse(parsed.Message);
    } else {
      event = parsed;
    }
  } catch (parseErr) {
    logger.error('Malformed notification event JSON', parseErr, { rawBody });
    throw parseErr;
  }

  const orderId = (event.orderId as string) || 'unknown';
  const userId = (event.userId as string) || 'unknown';
  const totalAmountCents = (event.totalAmountCents as number) || 0;
  const itemsCount = Array.isArray(event.items) ? event.items.length : 1;

  const notification: NotificationRecord = {
    id: `notif-${uuidv4().substring(0, 8)}`,
    orderId,
    userId,
    recipientEmail: `${userId}@example.com`,
    subject: `Order Confirmation #${orderId} - CloudCart`,
    body: `Hello ${userId}! Your CloudCart order for ${itemsCount} items ($${(totalAmountCents / 100).toFixed(2)}) was successfully received and queued for fulfillment.`,
    dispatchedAt: new Date().toISOString(),
  };

  notificationHistory.unshift(notification);
  if (notificationHistory.length > 50) {
    notificationHistory.pop();
  }

  logger.info('Customer notification generated and sent', {
    notificationId: notification.id,
    orderId,
    recipientEmail: notification.recipientEmail,
  });
}
