import { Router, Request, Response } from 'express';
import { pool, checkDbConnection } from './db';
import { publishOrderEvent } from './sns';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

interface OrderItemInput {
  productId: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
}

// Health check endpoint
router.get('/healthz', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  if (dbOk) {
    return res.status(200).json({
      status: 'healthy',
      service: 'order-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  }
  return res.status(503).json({
    status: 'unhealthy',
    service: 'order-service',
    database: 'disconnected',
  });
});

// Create Order (Checkout)
router.post('/api/orders', async (req: Request, res: Response) => {
  const client = await pool.connect();
  try {
    const { userId, items, shippingAddress } = req.body as {
      userId: string;
      items: OrderItemInput[];
      shippingAddress?: string;
    };

    if (!userId || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'userId and non-empty items array are required' });
    }

    // Compute total
    let totalAmountCents = 0;
    for (const item of items) {
      if (!item.productId || !item.quantity || item.quantity <= 0 || item.unitPriceCents === undefined) {
        return res.status(400).json({ error: 'Invalid order item payload' });
      }
      totalAmountCents += item.quantity * item.unitPriceCents;
    }

    const orderId = `ord-${uuidv4().substring(0, 8)}`;
    const address = shippingAddress || 'Default customer shipping address';

    await client.query('BEGIN');

    // Insert order header
    await client.query(
      `INSERT INTO orders (id, user_id, status, total_amount_cents, shipping_address)
       VALUES ($1, $2, 'PENDING', $3, $4)`,
      [orderId, userId, totalAmountCents, address]
    );

    // Insert order line items
    for (const item of items) {
      const itemId = `item-${uuidv4().substring(0, 8)}`;
      await client.query(
        `INSERT INTO order_items (id, order_id, product_id, product_name, quantity, unit_price_cents)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, orderId, item.productId, item.productName, item.quantity, item.unitPriceCents]
      );
    }

    await client.query('COMMIT');
    logger.info('Order persisted in database with PENDING status', { orderId, userId, totalAmountCents });

    // Publish OrderCreated event asynchronously to SNS
    try {
      await publishOrderEvent('OrderCreated', {
        orderId,
        userId,
        items,
        totalAmountCents,
        shippingAddress: address,
      });
    } catch (snsErr) {
      logger.error('Failed to publish OrderCreated event to SNS', snsErr, { orderId });
      // Note: In production we can rely on transactional outbox pattern or retry
    }

    return res.status(201).json({
      id: orderId,
      userId,
      status: 'PENDING',
      totalAmountCents,
      itemsCount: items.length,
      shippingAddress: address,
      createdAt: new Date().toISOString(),
    });
  } catch (err) {
    await client.query('ROLLBACK');
    logger.error('Failed to create order', err);
    return res.status(500).json({ error: 'Internal server error creating order' });
  } finally {
    client.release();
  }
});

// Get order by ID with line items
router.get('/api/orders/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const orderRes = await pool.query('SELECT * FROM orders WHERE id = $1', [id]);

    if (orderRes.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    const itemsRes = await pool.query('SELECT * FROM order_items WHERE order_id = $1', [id]);

    return res.json({
      ...orderRes.rows[0],
      items: itemsRes.rows,
    });
  } catch (err) {
    logger.error('Failed to fetch order', err, { orderId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List orders for a specific user
router.get('/api/orders/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const orderRes = await pool.query(
      'SELECT * FROM orders WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );

    return res.json({
      count: orderRes.rowCount,
      orders: orderRes.rows,
    });
  } catch (err) {
    logger.error('Failed to list user orders', err, { userId: req.params.userId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Update order status (Called by Inventory Service on reservation or cancellation)
router.patch('/api/orders/:id/status', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'status is required' });
    }

    const result = await pool.query(
      'UPDATE orders SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [status, id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Order not found' });
    }

    logger.info('Order status updated', { orderId: id, newStatus: status });
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to update order status', err, { orderId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// List recent orders (For demo/testing)
router.get('/api/orders', async (_req: Request, res: Response) => {
  try {
    const result = await pool.query('SELECT * FROM orders ORDER BY created_at DESC LIMIT 50');
    return res.json({ count: result.rowCount, orders: result.rows });
  } catch (err) {
    logger.error('Failed to fetch recent orders', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});
