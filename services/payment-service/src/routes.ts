import { Router, Request, Response } from 'express';
import { PutCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { ddbDocClient, PAYMENTS_TABLE } from './dynamo';
import { publishPaymentEvent } from './sns';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// ─── Health Check ─────────────────────────────────────────────────
router.get('/healthz', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'payment-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    table: PAYMENTS_TABLE,
  });
});

// ─── Process Payment ───────────────────────────────────────────────
// POST /api/payments/process
// Body: { orderId, userId, amountCents, cardLastFour?, cardNetwork? }
// Simulates a Stripe-style payment gateway: 90% approval rate.
router.post('/api/payments/process', async (req: Request, res: Response) => {
  try {
    const { orderId, userId, amountCents, cardLastFour = '4242', cardNetwork = 'VISA' } = req.body;

    if (!orderId || !userId || amountCents === undefined) {
      return res.status(400).json({ error: 'orderId, userId, and amountCents are required' });
    }

    const paymentId = `pay-${uuidv4().substring(0, 8)}`;
    const createdAt = new Date().toISOString();

    // Simulate payment gateway: DECLINED if amount > $5000 or random 10% failure
    const tooLarge = amountCents > 500000;
    const randomDecline = Math.random() < 0.10;
    const status: 'APPROVED' | 'DECLINED' = (tooLarge || randomDecline) ? 'DECLINED' : 'APPROVED';
    const declineReason = tooLarge
      ? 'Amount exceeds single-transaction limit'
      : randomDecline
      ? 'Card issuer declined the transaction'
      : undefined;

    const paymentRecord = {
      PK: `PAYMENT#${paymentId}`,
      SK: 'RECORD',
      id: paymentId,
      orderId,
      userId,
      amountCents,
      cardLastFour: String(cardLastFour).slice(-4),
      cardNetwork: cardNetwork.toUpperCase(),
      status,
      declineReason: declineReason || null,
      gateway: 'ShopSphere-SimPay-v1',
      createdAt,
    };

    // Persist payment record to DynamoDB
    await ddbDocClient.send(new PutCommand({ TableName: PAYMENTS_TABLE, Item: paymentRecord }));

    // Also index by orderId for easy lookup
    await ddbDocClient.send(
      new PutCommand({
        TableName: PAYMENTS_TABLE,
        Item: {
          PK: `ORDER#${orderId}`,
          SK: `PAYMENT#${paymentId}`,
          paymentId,
          status,
          amountCents,
          createdAt,
        },
      })
    );

    // Publish event to SNS for downstream services
    const eventType = status === 'APPROVED' ? 'PaymentProcessed' : 'PaymentFailed';
    try {
      await publishPaymentEvent(eventType, {
        paymentId,
        orderId,
        userId,
        amountCents,
        status,
      });
    } catch (snsErr) {
      logger.warn('SNS publish failed, payment already persisted', { paymentId, error: snsErr });
    }

    logger.info(`Payment ${status}`, { paymentId, orderId, amountCents, status });

    const httpStatus = status === 'APPROVED' ? 201 : 402;
    return res.status(httpStatus).json({
      id: paymentId,
      orderId,
      status,
      amountCents,
      cardLastFour: String(cardLastFour).slice(-4),
      cardNetwork: cardNetwork.toUpperCase(),
      declineReason: declineReason || undefined,
      createdAt,
    });
  } catch (err) {
    logger.error('Failed to process payment', err);
    return res.status(500).json({ error: 'Internal server error processing payment' });
  }
});

// ─── Get Payment by Payment ID ─────────────────────────────────────
router.get('/api/payments/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await ddbDocClient.send(
      new GetCommand({ TableName: PAYMENTS_TABLE, Key: { PK: `PAYMENT#${id}`, SK: 'RECORD' } })
    );

    if (!result.Item) {
      return res.status(404).json({ error: 'Payment not found' });
    }

    return res.json({
      id: result.Item.id,
      orderId: result.Item.orderId,
      userId: result.Item.userId,
      amountCents: result.Item.amountCents,
      cardLastFour: result.Item.cardLastFour,
      cardNetwork: result.Item.cardNetwork,
      status: result.Item.status,
      declineReason: result.Item.declineReason,
      gateway: result.Item.gateway,
      createdAt: result.Item.createdAt,
    });
  } catch (err) {
    logger.error('Failed to get payment', err, { paymentId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── Get Payment by Order ID ───────────────────────────────────────
router.get('/api/payments/order/:orderId', async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const result = await ddbDocClient.send(
      new QueryCommand({
        TableName: PAYMENTS_TABLE,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: { ':pk': `ORDER#${orderId}`, ':sk': 'PAYMENT#' },
      })
    );

    return res.json({ orderId, count: result.Count || 0, payments: result.Items || [] });
  } catch (err) {
    logger.error('Failed to get payments for order', err, { orderId: req.params.orderId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
