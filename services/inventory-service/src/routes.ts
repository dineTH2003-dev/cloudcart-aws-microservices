import { Router, Request, Response } from 'express';
import { pool, checkDbConnection } from './db';
import { logger } from './logger';

export const router = Router();

// Health check endpoint
router.get('/healthz', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  if (dbOk) {
    return res.status(200).json({
      status: 'healthy',
      service: 'inventory-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  }
  return res.status(503).json({
    status: 'unhealthy',
    service: 'inventory-service',
    database: 'disconnected',
  });
});

// Check current inventory for a specific product
router.get('/api/inventory/:productId', async (req: Request, res: Response) => {
  try {
    const { productId } = req.params;
    const result = await pool.query('SELECT id, name, stock_quantity FROM products WHERE id = $1', [productId]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to get product inventory', err, { productId: req.params.productId });
    return res.status(500).json({ error: 'Internal server error' });
  }
});
