import { query, getClient } from '../../config/database';
import { AppError } from '../../utils/appError';
import { logger } from '../../utils/logger';
import {
  NotificationRow,
  NotificationType,
  PaginationParams,
  PaginatedResult,
  NotificationChannel,
  NotificationChannelType,
} from './notifications.types';
import { notificationBroadcaster } from './realtime';

// =============================================================================
// CHANNEL IMPLEMENTATIONS & IN-APP CHANNEL
// =============================================================================

/**
 * InAppNotificationChannel saves notification to the database table.
 * It is the primary default channel enabled on the platform.
 */
class InAppNotificationChannel implements NotificationChannel {
  public async send(
    userId: string,
    data: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string | null;
    }
  ): Promise<void> {
    const res = await query<NotificationRow>(
      `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
       RETURNING *`,
      [userId, data.type, data.title, data.message, data.link || null]
    );

    const notification = res.rows[0];

    // Trigger real-time broadcast simulation
    await notificationBroadcaster.broadcast(userId, {
      notificationId: notification.id,
      userId: notification.user_id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      link: notification.link,
      createdAt: notification.created_at,
    });
  }
}

// Global channels registry
const notificationChannels: Record<
  NotificationChannelType,
  NotificationChannel
> = {
  [NotificationChannelType.IN_APP]: new InAppNotificationChannel(),
  // Email and SMS channels will be registered here in future phases
  [NotificationChannelType.EMAIL]: {
    send: async (userId, data) => {
      logger.info(
        `[NotificationChannel:EMAIL] (Future placeholder) To user ${userId}:`,
        data
      );
    },
  },
  [NotificationChannelType.SMS]: {
    send: async (userId, data) => {
      logger.info(
        `[NotificationChannel:SMS] (Future placeholder) To user ${userId}:`,
        data
      );
    },
  },
};

// =============================================================================
// SERVICES
// =============================================================================

/**
 * Dispatches a notification across all enabled channels (currently IN_APP only).
 */
export async function sendNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
  },
  enabledChannels: NotificationChannelType[] = [NotificationChannelType.IN_APP]
): Promise<void> {
  for (const channelType of enabledChannels) {
    try {
      const channel = notificationChannels[channelType];
      if (channel) {
        await channel.send(userId, data);
      }
    } catch (err) {
      logger.error(
        `[NotificationsService] Failed to dispatch via channel "${channelType}":`,
        err
      );
    }
  }
}

/**
 * Create a single in-app notification.
 */
export async function createNotification(
  userId: string,
  data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
  }
): Promise<void> {
  await sendNotification(userId, data, [NotificationChannelType.IN_APP]);
}

/**
 * Create multiple in-app notifications in bulk.
 * Uses a transaction to ensure all notifications are created atomically.
 */
export async function createBulkNotifications(
  userIds: string[],
  data: {
    type: NotificationType;
    title: string;
    message: string;
    link?: string | null;
  }
): Promise<void> {
  if (userIds.length === 0) return;

  const client = await getClient();
  try {
    await client.query('BEGIN');

    for (const userId of userIds) {
      const res = await client.query<NotificationRow>(
        `INSERT INTO notifications (user_id, type, title, message, link, is_read, created_at)
         VALUES ($1, $2, $3, $4, $5, FALSE, NOW())
         RETURNING *`,
        [userId, data.type, data.title, data.message, data.link || null]
      );
      const notification = res.rows[0];

      // Simulated real-time broadcast
      await notificationBroadcaster.broadcast(userId, {
        notificationId: notification.id,
        userId: notification.user_id,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        link: notification.link,
        createdAt: notification.created_at,
      });
    }

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Mark a specific notification as read.
 * Enforces user ownership.
 */
export async function markAsRead(
  notificationId: string,
  userId: string
): Promise<NotificationRow> {
  const check = await query<NotificationRow>(
    'SELECT * FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  const notification = check.rows[0];

  if (notification.user_id !== userId) {
    throw new AppError(
      'You are not authorized to access this notification',
      403,
      'FORBIDDEN'
    );
  }

  const updated = await query<NotificationRow>(
    'UPDATE notifications SET is_read = TRUE WHERE id = $1 RETURNING *',
    [notificationId]
  );

  return updated.rows[0];
}

/**
 * Mark all notifications as read for a specific user.
 */
export async function markAllAsRead(userId: string): Promise<void> {
  await query('UPDATE notifications SET is_read = TRUE WHERE user_id = $1', [
    userId,
  ]);
}

/**
 * Delete a specific notification.
 * Enforces user ownership.
 */
export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const check = await query<NotificationRow>(
    'SELECT * FROM notifications WHERE id = $1',
    [notificationId]
  );

  if (check.rows.length === 0) {
    throw new AppError('Notification not found', 404, 'NOTIFICATION_NOT_FOUND');
  }

  const notification = check.rows[0];

  if (notification.user_id !== userId) {
    throw new AppError(
      'You are not authorized to delete this notification',
      403,
      'FORBIDDEN'
    );
  }

  await query('DELETE FROM notifications WHERE id = $1', [notificationId]);
}

/**
 * Get paginated notifications for a specific user.
 */
export async function getNotifications(
  userId: string,
  pagination: PaginationParams
): Promise<PaginatedResult<NotificationRow>> {
  const offset = (pagination.page - 1) * pagination.limit;

  // Total count query
  const countRes = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1',
    [userId]
  );
  const totalCount = parseInt(countRes.rows[0].count, 10);
  const totalPages = Math.ceil(totalCount / pagination.limit);

  // Data query
  const dataRes = await query<NotificationRow>(
    `SELECT * FROM notifications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2 OFFSET $3`,
    [userId, pagination.limit, offset]
  );

  return {
    items: dataRes.rows,
    totalCount,
    totalPages,
    currentPage: pagination.page,
  };
}

/**
 * Get count of unread notifications for a specific user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
  const res = await query<{ count: string }>(
    'SELECT COUNT(*) as count FROM notifications WHERE user_id = $1 AND is_read = FALSE',
    [userId]
  );
  return parseInt(res.rows[0].count, 10);
}
