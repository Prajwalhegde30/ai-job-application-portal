'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, ArrowRight, Loader2 } from 'lucide-react';
import type { RecentApplication } from '@/hooks/useDashboard';
import { EmptyState } from './EmptyState';

interface RecentApplicationsListProps {
  applications: RecentApplication[] | undefined;
  isLoading: boolean;
}

/** Status badge color mapping */
const STATUS_STYLES: Record<string, string> = {
  PENDING: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
  REVIEWING: 'border-blue-500/30 bg-blue-500/10 text-blue-400',
  SHORTLISTED: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
  REJECTED: 'border-red-500/30 bg-red-500/10 text-red-400',
  HIRED: 'border-cyan-500/30 bg-cyan-500/10 text-cyan-400',
  WITHDRAWN: 'border-slate-500/30 bg-slate-500/10 text-slate-400',
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function formatStatus(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

/**
 * Recent applications list showing the 5 most recent applications with status badges.
 */
export function RecentApplicationsList({
  applications,
  isLoading,
}: RecentApplicationsListProps) {
  if (isLoading) {
    return (
      <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
            <FileText className="h-4.5 w-4.5 text-violet-400" />
            Recent Applications
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-slate-500" />
        </CardContent>
      </Card>
    );
  }

  if (!applications || applications.length === 0) {
    return (
      <EmptyState
        icon={<FileText className="h-7 w-7 text-slate-500" />}
        title="No Applications Yet"
        description="Start applying to jobs to track your application progress here."
        actionLabel="Browse Jobs"
        actionHref="/jobs"
      />
    );
  }

  return (
    <Card className="border-slate-800 bg-slate-900/40 backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
          <FileText className="h-4.5 w-4.5 text-violet-400" />
          Recent Applications
        </CardTitle>
        <Link
          href="/applications"
          className="flex items-center gap-1 text-xs font-medium text-blue-400 transition-colors hover:text-blue-300"
        >
          View All
          <ArrowRight className="h-3 w-3" />
        </Link>
      </CardHeader>
      <CardContent className="space-y-0.5">
        {applications.map((app) => (
          <Link
            key={app.applicationId}
            href={`/applications/${app.applicationId}`}
            className="group flex items-center justify-between rounded-lg px-3 py-3 transition-colors hover:bg-slate-800/40"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-slate-200 group-hover:text-white">
                {app.jobTitle}
              </p>
              <p className="truncate text-xs text-slate-500">
                {app.company} · {formatDate(app.appliedAt)}
              </p>
            </div>
            <span
              className={`ml-3 shrink-0 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                STATUS_STYLES[app.status] || STATUS_STYLES.PENDING
              }`}
            >
              {formatStatus(app.status)}
            </span>
          </Link>
        ))}
      </CardContent>
    </Card>
  );
}
