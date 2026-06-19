import { logger } from '../../utils/logger';
import { Broadcaster, BroadcasterPayload } from './notifications.types';

/**
 * NotificationBroadcaster implements simulated real-time push mechanism.
 * In a future phase, this can be integrated with WebSockets (ws/socket.io),
 * Server-Sent Events (SSE), or WebPush services.
 */
export class NotificationBroadcaster implements Broadcaster {
  /**
   * Broadcast a notification to a specific connected user client.
   * @param userId - Recipient user ID
   * @param payload - Complete notification details
   */
  public async broadcast(
    userId: string,
    payload: BroadcasterPayload
  ): Promise<void> {
    logger.info(
      `[NotificationBroadcaster] Broadcasting to user ${userId} in real-time:`,
      {
        notificationId: payload.notificationId,
        type: payload.type,
        title: payload.title,
      }
    );
    // Simulated delay or future WS socket emit goes here:
    // io.to(userId).emit('notification', payload);
  }
}

export const notificationBroadcaster = new NotificationBroadcaster();
