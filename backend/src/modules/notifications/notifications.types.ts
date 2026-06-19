export type NotificationType =
  | 'APPLICATION_CREATED'
  | 'APPLICATION_WITHDRAWN'
  | 'APPLICATION_REVIEWING'
  | 'APPLICATION_SHORTLISTED'
  | 'APPLICATION_REJECTED'
  | 'APPLICATION_HIRED'
  | 'JOB_PUBLISHED'
  | 'SYSTEM';

export interface NotificationRow {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: Date;
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResult<T> {
  items: T[];
  totalCount: number;
  totalPages: number;
  currentPage: number;
}

export enum NotificationChannelType {
  IN_APP = 'IN_APP',
  EMAIL = 'EMAIL',
  SMS = 'SMS',
}

export interface NotificationChannel {
  send(
    userId: string,
    notificationData: {
      type: NotificationType;
      title: string;
      message: string;
      link?: string | null;
    }
  ): Promise<void>;
}

export interface BroadcasterPayload {
  notificationId: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  createdAt: Date;
}

export interface Broadcaster {
  broadcast(userId: string, payload: BroadcasterPayload): Promise<void>;
}
