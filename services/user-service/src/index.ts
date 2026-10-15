import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { router } from './routes';
import { logger } from './logger';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

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
  logger.info(`User Service is running on port ${PORT}`);
});

// Graceful shutdown
const shutdown = (signal: string) => {
  logger.info(`Received ${signal}. Starting graceful shutdown...`);
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
