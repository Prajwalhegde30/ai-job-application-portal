'use client';

import { ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { InboxIcon } from 'lucide-react';

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description: string;
  actionLabel?: string;
  actionHref?: string;
  onAction?: () => void;
}

/**
 * Reusable empty state component for dashboard sections.
 * Shows an icon, message, and optional action button.
 */
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <Card className="border-slate-800 bg-slate-900/30 backdrop-blur-sm">
      <CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-700/50 bg-slate-800/60">
          {icon || <InboxIcon className="h-7 w-7 text-slate-500" />}
        </div>
        <h3 className="mb-1.5 text-base font-semibold text-slate-200">
          {title}
        </h3>
        <p className="mb-5 max-w-xs text-sm leading-relaxed text-slate-400">
          {description}
        </p>
        {actionLabel && (
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 bg-slate-800/50 text-sm text-slate-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400"
            onClick={
              onAction ||
              (actionHref
                ? () => (window.location.href = actionHref)
                : undefined)
            }
          >
            {actionLabel}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
