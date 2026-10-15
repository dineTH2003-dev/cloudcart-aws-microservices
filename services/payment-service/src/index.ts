import express from 'express';
import { router } from './routes';
import { logger } from './logger';

const app = express();
const PORT = parseInt(process.env.PORT || '8006', 10);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, _res, next) => {
  logger.info(`${req.method} ${req.path}`, { ip: req.ip, userAgent: req.get('User-Agent') });
  next();
});

app.use('/', router);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Not Found' });
});

app.listen(PORT, '0.0.0.0', () => {
  logger.info(`Payment Service running on port ${PORT}`, {
    port: PORT,
    env: process.env.NODE_ENV,
    table: process.env.PAYMENTS_TABLE,
  });
});

export default app;
