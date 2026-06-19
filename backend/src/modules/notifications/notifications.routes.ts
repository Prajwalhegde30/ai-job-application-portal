import { Router } from 'express';
import { authenticate } from '../../middleware/auth.middleware';
import {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
} from './notifications.controller';

const router = Router();

// All notification endpoints require authenticated user access
router.use(authenticate);

// 1. Concrete routes (must be declared first to prevent collision with parameter matchers)
router.get('/', getMyNotifications);
router.get('/unread-count', getUnreadCount);
router.patch('/read-all', markAllAsRead);

// 2. Parameterized routes
router.patch('/:notificationId/read', markAsRead);
router.delete('/:notificationId', deleteNotification);

export { router as notificationsRoutes };
