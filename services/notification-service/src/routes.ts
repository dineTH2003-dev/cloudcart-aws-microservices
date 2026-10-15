import { Router, Request, Response } from 'express';
import { notificationHistory } from './consumer';
import { logger } from './logger';

export const router = Router();

// Health check endpoint
router.get('/healthz', (_req: Request, res: Response) => {
  return res.status(200).json({
    status: 'healthy',
    service: 'notification-service',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    bufferedNotifications: notificationHistory.length,
  });
});

// List recent notifications (useful for UI tracking and automated test assertions)
router.get('/api/notifications', (req: Request, res: Response) => {
  const { orderId } = req.query;
  if (orderId) {
    const filtered = notificationHistory.filter((n) => n.orderId === orderId);
    return res.json({ count: filtered.length, notifications: filtered });
  }
  return res.json({ count: notificationHistory.length, notifications: notificationHistory });
});
