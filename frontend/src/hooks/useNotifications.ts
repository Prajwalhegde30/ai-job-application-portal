'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// =============================================================================
// Query Keys
// =============================================================================

export const notificationKeys = {
  all: ['notifications'] as const,
  list: (params?: Record<string, unknown>) =>
    [...notificationKeys.all, 'list', params] as const,
  unreadCount: () => [...notificationKeys.all, 'unreadCount'] as const,
};

// =============================================================================
// Type Definitions
// =============================================================================

export interface NotificationResponse {
  id: string;
  user_id: string;
  type:
    | 'APPLICATION_CREATED'
    | 'APPLICATION_WITHDRAWN'
    | 'APPLICATION_REVIEWING'
    | 'APPLICATION_SHORTLISTED'
    | 'APPLICATION_REJECTED'
    | 'APPLICATION_HIRED'
    | 'JOB_PUBLISHED'
    | 'SYSTEM';
  title: string;
  message: string;
  is_read: boolean;
  link: string | null;
  created_at: string;
}

interface NotificationsListResponse {
  success: boolean;
  data: {
    notifications: NotificationResponse[];
    totalCount: number;
    totalPages: number;
    currentPage: number;
    unreadCount: number;
  };
}

interface UnreadCountResponse {
  success: boolean;
  data: {
    unreadCount: number;
  };
}

interface MarkReadResponse {
  success: boolean;
  data: {
    notification: NotificationResponse;
  };
}

// =============================================================================
// Hooks
// =============================================================================

/**
 * Fetch paginated notifications for the current authenticated user.
 */
export function useNotifications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: notificationKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<NotificationsListResponse>(
        '/notifications',
        {
          params,
        }
      );
      return data.data;
    },
  });
}

/**
 * Fetch the current authenticated user's unread notification count.
 */
export function useUnreadCount(options?: { refetchInterval?: number }) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: async () => {
      const { data } = await api.get<UnreadCountResponse>(
        '/notifications/unread-count'
      );
      return data.data.unreadCount;
    },
    ...options,
  });
}

/**
 * Mark a single notification as read.
 */
export function useMarkAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      const { data } = await api.patch<MarkReadResponse>(
        `/notifications/${notificationId}/read`
      );
      return data.data.notification;
    },
    onSuccess: () => {
      // Invalidate both count and list queries to sync read badges
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Mark all notifications for the current user as read.
 */
export function useMarkAllAsRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.patch('/notifications/read-all');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}

/**
 * Delete a specific notification.
 */
export function useDeleteNotification() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      await api.delete(`/notifications/${notificationId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
  });
}
