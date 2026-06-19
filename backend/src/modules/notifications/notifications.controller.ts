import { Request, Response } from 'express';
import { sendSuccess } from '../../utils/response';
import * as notificationsService from './notifications.service';
import { listNotificationsSchema } from './notifications.validators';

/**
 * GET /api/v1/notifications
 * Retrieves a paginated list of user notifications, totalCount, and unreadCount.
 */
export async function getMyNotifications(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;

  // Validate query parameters
  const parsedQuery = listNotificationsSchema.parse(req.query);

  const paginatedResult = await notificationsService.getNotifications(
    userId,
    parsedQuery
  );

  const unreadCount = await notificationsService.getUnreadCount(userId);

  sendSuccess(res, {
    notifications: paginatedResult.items,
    totalCount: paginatedResult.totalCount,
    totalPages: paginatedResult.totalPages,
    currentPage: paginatedResult.currentPage,
    unreadCount,
  });
}

/**
 * GET /api/v1/notifications/unread-count
 * Retrieves the count of unread notifications.
 */
export async function getUnreadCount(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const unreadCount = await notificationsService.getUnreadCount(userId);

  sendSuccess(res, { unreadCount });
}

/**
 * PATCH /api/v1/notifications/:notificationId/read
 * Mark a specific notification as read.
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  const userId = req.user!.userId;
  const notificationId = req.params.notificationId as string;

  const notification = await notificationsService.markAsRead(
    notificationId,
    userId
  );

  sendSuccess(
    res,
    { notification },
    'Notification marked as read successfully'
  );
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all user notifications as read.
 */
export async function markAllAsRead(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;

  await notificationsService.markAllAsRead(userId);

  sendSuccess(res, null, 'All notifications marked as read successfully');
}

/**
 * DELETE /api/v1/notifications/:notificationId
 * Delete a specific notification.
 */
export async function deleteNotification(
  req: Request,
  res: Response
): Promise<void> {
  const userId = req.user!.userId;
  const notificationId = req.params.notificationId as string;

  await notificationsService.deleteNotification(notificationId, userId);

  sendSuccess(res, null, 'Notification deleted successfully');
}
