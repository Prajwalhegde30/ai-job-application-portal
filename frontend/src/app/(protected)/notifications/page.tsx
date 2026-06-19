'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  useNotifications,
  useMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  NotificationResponse,
} from '@/hooks/useNotifications';
import { Button } from '@/components/ui/button';
import {
  Bell,
  Trash2,
  CheckCircle,
  Clock,
  Briefcase,
  XCircle,
  Check,
  AlertCircle,
  Inbox,
  ChevronLeft,
  ChevronRight,
  Info,
} from 'lucide-react';

export default function NotificationCenterPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading, isError, refetch } = useNotifications({
    page,
    limit,
  });
  const markAsReadMutation = useMarkAsRead();
  const markAllAsReadMutation = useMarkAllAsRead();
  const deleteMutation = useDeleteNotification();

  const notifications = data?.notifications || [];
  const totalPages = data?.totalPages || 1;
  const totalCount = data?.totalCount || 0;
  const unreadCount = data?.unreadCount || 0;

  const handleMarkAsRead = async (
    e: React.MouseEvent,
    notif: NotificationResponse
  ) => {
    e.stopPropagation(); // Avoid navigating to the link immediately
    if (!notif.is_read) {
      await markAsReadMutation.mutateAsync(notif.id);
    }
  };

  const handleNotificationClick = async (notif: NotificationResponse) => {
    if (!notif.is_read) {
      await markAsReadMutation.mutateAsync(notif.id);
    }
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation(); // Avoid triggering list item clicks
    await deleteMutation.mutateAsync(id);
  };

  const handleMarkAllAsRead = async () => {
    await markAllAsReadMutation.mutateAsync();
  };

  // Helper to format timestamps nicely
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMins / 60);
      const diffDays = Math.floor(diffHours / 24);

      if (diffMins < 1) return 'Just now';
      if (diffMins < 60) return `${diffMins}m ago`;
      if (diffHours < 24) return `${diffHours}h ago`;
      if (diffDays < 7) return `${diffDays}d ago`;

      return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return '';
    }
  };

  // Helper to render type-specific icons and colors
  const getNotificationConfig = (type: string) => {
    switch (type) {
      case 'APPLICATION_CREATED':
        return {
          icon: Briefcase,
          color: 'text-blue-400',
          bgColor: 'bg-blue-500/10 border-blue-500/20',
        };
      case 'APPLICATION_WITHDRAWN':
        return {
          icon: Clock,
          color: 'text-amber-400',
          bgColor: 'bg-amber-500/10 border-amber-500/20',
        };
      case 'APPLICATION_REVIEWING':
        return {
          icon: Info,
          color: 'text-cyan-400',
          bgColor: 'bg-cyan-500/10 border-cyan-500/20',
        };
      case 'APPLICATION_SHORTLISTED':
        return {
          icon: CheckCircle,
          color: 'text-emerald-400',
          bgColor: 'bg-emerald-500/10 border-emerald-500/20',
        };
      case 'APPLICATION_REJECTED':
        return {
          icon: XCircle,
          color: 'text-red-400',
          bgColor: 'bg-red-500/10 border-red-500/20',
        };
      case 'APPLICATION_HIRED':
        return {
          icon: CheckCircle,
          color: 'text-green-400',
          bgColor: 'bg-green-500/10 border-green-500/20',
        };
      case 'JOB_PUBLISHED':
        return {
          icon: Bell,
          color: 'text-indigo-400',
          bgColor: 'bg-indigo-500/10 border-indigo-500/20',
        };
      case 'SYSTEM':
      default:
        return {
          icon: AlertCircle,
          color: 'text-slate-400',
          bgColor: 'bg-slate-500/10 border-slate-500/20',
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            Notification Center
          </h1>
          <p className="text-sm text-slate-400">
            Stay up to date with updates on your applications, published jobs,
            and system alerts.
          </p>
        </div>

        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
            className="w-full border-slate-800 bg-slate-900 text-xs text-slate-300 hover:bg-slate-800 hover:text-white sm:w-auto"
          >
            <Check className="mr-1.5 h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Main card panel */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/30 backdrop-blur-md">
        {/* Sub-header info banner */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-slate-300">
              All Notifications ({totalCount})
            </span>
            {unreadCount > 0 && (
              <span className="rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-400">
                {unreadCount} unread
              </span>
            )}
          </div>
        </div>

        {/* Loading state */}
        {isLoading && (
          <div className="flex min-h-[350px] flex-col items-center justify-center space-y-4">
            <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-800 border-t-blue-500" />
            <p className="text-sm text-slate-400">
              Loading your notifications...
            </p>
          </div>
        )}

        {/* Error state */}
        {isError && (
          <div className="flex min-h-[350px] flex-col items-center justify-center space-y-4 text-center">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <div>
              <p className="font-semibold text-white">
                Failed to load notifications
              </p>
              <p className="text-sm text-slate-400">Please try again later.</p>
            </div>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="border-slate-800 bg-slate-900 text-slate-200 hover:bg-slate-800"
            >
              Retry
            </Button>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !isError && notifications.length === 0 && (
          <div className="flex min-h-[350px] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/50 text-slate-400">
              <Inbox className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-semibold text-white">All caught up!</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-400">
              You have no notifications at the moment. We&apos;ll alert you when
              something updates.
            </p>
          </div>
        )}

        {/* Notifications list */}
        {!isLoading && !isError && notifications.length > 0 && (
          <div className="divide-y divide-slate-800/60">
            {notifications.map((notif) => {
              const config = getNotificationConfig(notif.type);
              const Icon = config.icon;

              return (
                <div
                  key={notif.id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`group relative flex cursor-pointer gap-4 px-6 py-5 transition-all duration-200 ${
                    notif.is_read
                      ? 'bg-transparent hover:bg-slate-900/20'
                      : 'bg-blue-500/[0.02] hover:bg-blue-500/[0.04]'
                  }`}
                >
                  {/* Unread glow indicator */}
                  {!notif.is_read && (
                    <span className="absolute top-1/2 left-0 h-8 w-1 -translate-y-1/2 rounded-r-md bg-blue-500 shadow-[0_0_12px_rgba(59,130,246,0.8)]" />
                  )}

                  {/* Icon badge */}
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${config.bgColor}`}
                  >
                    <Icon className={`h-5 w-5 ${config.color}`} />
                  </div>

                  {/* Message body */}
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-start justify-between gap-4">
                      <h4
                        className={`truncate text-sm font-semibold ${notif.is_read ? 'text-slate-200' : 'text-white'}`}
                      >
                        {notif.title}
                      </h4>
                      <span className="text-xs whitespace-nowrap text-slate-500">
                        {formatTime(notif.created_at)}
                      </span>
                    </div>
                    <p
                      className={`text-sm leading-relaxed ${notif.is_read ? 'text-slate-400' : 'text-slate-300'}`}
                    >
                      {notif.message}
                    </p>
                  </div>

                  {/* Action buttons on hover */}
                  <div className="flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                    {!notif.is_read && (
                      <Button
                        onClick={(e) => handleMarkAsRead(e, notif)}
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-white"
                        title="Mark as read"
                      >
                        <Check className="h-4 w-4" />
                      </Button>
                    )}
                    <Button
                      onClick={(e) => handleDelete(e, notif.id)}
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-slate-400 hover:bg-slate-800 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer / Pagination */}
        {!isLoading && !isError && totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-800 px-6 py-4">
            <span className="text-xs text-slate-400">
              Showing page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(prev - 1, 1))}
                variant="outline"
                size="sm"
                className="h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <ChevronLeft className="mr-1 h-4 w-4" />
                Previous
              </Button>
              <Button
                disabled={page >= totalPages}
                onClick={() =>
                  setPage((prev) => Math.min(prev + 1, totalPages))
                }
                variant="outline"
                size="sm"
                className="h-8 border-slate-800 bg-slate-900 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
