import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';
import { logger } from './logger';
import { pool } from './db';
import { startInventoryConsumer, stopConsumer } from './consumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;

app.use(cors());
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      path: req.originalUrl,
      status: res.statusCode,
      durationMs: duration,
      userAgent: req.get('user-agent'),
    });
  });
  next();
});

app.use(router);

const server = app.listen(PORT, () => {
  logger.info(`Inventory Service is running on port ${PORT}`);
  // Start the background SQS consumer loop
  startInventoryConsumer().catch((err) => {
    logger.error('Fatal error in inventory SQS consumer loop', err);
  });
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  stopConsumer();
  server.close(async () => {
    logger.info('HTTP server closed.');
    await pool.end();
    logger.info('Database pool closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process due to shutdown timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
