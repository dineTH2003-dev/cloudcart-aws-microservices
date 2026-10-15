import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';
import { logger } from './logger';
import { startNotificationConsumer, stopConsumer } from './consumer';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;

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
  logger.info(`Notification Service is running on port ${PORT}`);
  startNotificationConsumer().catch((err) => {
    logger.error('Fatal error in notification SQS consumer loop', err);
  });
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
  stopConsumer();
  server.close(() => {
    logger.info('HTTP server closed. Exiting process.');
    process.exit(0);
  });

  setTimeout(() => {
    logger.error('Forcefully terminating process due to shutdown timeout.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
