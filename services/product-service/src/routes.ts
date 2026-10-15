import { Router, Request, Response } from 'express';
import { pool, checkDbConnection } from './db';
import { logger } from './logger';
import { v4 as uuidv4 } from 'uuid';

export const router = Router();

// Liveness / Readiness Probe
router.get('/healthz', async (_req: Request, res: Response) => {
  const dbOk = await checkDbConnection();
  if (dbOk) {
    return res.status(200).json({
      status: 'healthy',
      service: 'product-service',
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  }
  return res.status(503).json({
    status: 'unhealthy',
    service: 'product-service',
    database: 'disconnected',
  });
});

// List all products (with optional category and search query)
router.get('/api/products', async (req: Request, res: Response) => {
  try {
    const { category, q } = req.query;
    let query = 'SELECT * FROM products WHERE 1=1';
    const params: unknown[] = [];

    if (category) {
      params.push(category);
      query += ` AND category = $${params.length}`;
    }

    if (q) {
      params.push(`%${q}%`);
      query += ` AND (name ILIKE $${params.length} OR description ILIKE $${params.length})`;
    }

    query += ' ORDER BY created_at DESC';

    const result = await pool.query(query, params);
    return res.json({
      count: result.rowCount,
      products: result.rows,
    });
  } catch (err) {
    logger.error('Failed to query products', err);
    return res.status(500).json({ error: 'Internal server error fetching products' });
  }
});

// Get single product by ID
router.get('/api/products/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Product not found' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to get product', err, { productId: req.params.id });
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// Create product (Admin / Seed)
router.post('/api/products', async (req: Request, res: Response) => {
  try {
    const { name, description, price_cents, stock_quantity, category, image_url } = req.body;

    if (!name || price_cents === undefined || stock_quantity === undefined || !category) {
      return res.status(400).json({ error: 'Missing required product fields' });
    }

    const id = `prod-${uuidv4().substring(0, 8)}`;
    const query = `
      INSERT INTO products (id, name, description, price_cents, stock_quantity, category, image_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const result = await pool.query(query, [
      id,
      name,
      description || '',
      price_cents,
      stock_quantity,
      category,
      image_url || null,
    ]);

    logger.info('Product created successfully', { productId: id, name });
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to create product', err);
    return res.status(500).json({ error: 'Internal server error creating product' });
  }
});

// Update stock quantity (Called directly or via Inventory Service)
router.patch('/api/products/:id/stock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { quantityChange } = req.body;

    if (typeof quantityChange !== 'number') {
      return res.status(400).json({ error: 'quantityChange (number) is required' });
    }

    // Atomic update preventing negative stock
    const query = `
      UPDATE products
      SET stock_quantity = stock_quantity + $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2 AND (stock_quantity + $1) >= 0
      RETURNING *
    `;
    const result = await pool.query(query, [quantityChange, id]);

    if (result.rowCount === 0) {
      return res.status(400).json({
        error: 'Insufficient stock or product does not exist',
      });
    }

    logger.info('Product stock updated', { productId: id, quantityChange, newStock: result.rows[0].stock_quantity });
    return res.json(result.rows[0]);
  } catch (err) {
    logger.error('Failed to update product stock', err, { productId: req.params.id });
    return res.status(500).json({ error: 'Internal server error updating stock' });
  }
});
