'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, ArrowRight, Loader2 } from 'lucide-react';
import type { RecentNotification } from '@/hooks/useDashboard';
import { EmptyState } from './EmptyState';

interface NotificationPreviewProps {
  notifications: RecentNotification[] | undefined;
  isLoading: boolean;
}

function timeAgo(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHr / 24);

  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Notification preview showing the 5 most recent notifications.
 */
export function NotificationPreview({
  notifications,
  isLoading,
}: NotificationPreviewProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <Bell className="h-4.5 w-4.5 text-rose-400" />
            Notifications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (!notifications || notifications.length === 0) {
    return (
      <EmptyState
        icon={<Bell className="h-7 w-7 text-slate-500" />}
        title="No Notifications"
        description="You're all caught up! Notifications will appear here as you interact with the platform."
      />
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <Bell className="h-4.5 w-4.5 text-rose-400" />
          Notifications
        </CardTitle>
        <Link
          href="/notifications"
          className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {notifications.map((notif) => (
          <div
            key={notif.id}
            className={`flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover:bg-slate-800/40 ${
              !notif.isRead ? 'bg-slate-800/20' : ''
            }`}
          >
            {/* Unread indicator */}
            <div className="mt-1.5 shrink-0">
              {!notif.isRead ? (
                <div className="h-2 w-2 rounded-full bg-blue-500 ring-2 ring-blue-500/20" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-slate-700" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p
                  className={`truncate text-sm font-medium ${
                    !notif.isRead ? 'text-slate-100' : 'text-slate-400'
                  }`}
                >
                  {notif.title}
                </p>
                <span className="shrink-0 text-[10px] text-slate-600">
                  {timeAgo(notif.createdAt)}
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {notif.message}
              </p>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
