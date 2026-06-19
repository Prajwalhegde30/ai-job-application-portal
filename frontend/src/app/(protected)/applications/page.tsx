'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useMyApplications,
  useWithdrawApplication,
  useApplicationTimeline,
} from '@/hooks/useApplications';
import { APPLICATION_STATUS_CONFIG } from '@/lib/validators/application';
import type {
  ApplicationResponse,
  TimelineEventResponse,
} from '@/lib/validators/application';
import { Button } from '@/components/ui/button';
import {
  FileText,
  Briefcase,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Clock,
  Eye,
  ChevronDown,
  ChevronUp,
  Loader2,
  Building2,
  AlertTriangle,
  CheckCircle2,
  Search,
  Inbox,
} from 'lucide-react';

/**
 * My Applications Page
 * Professional ATS-style application tracker with status badges,
 * pagination, withdraw functionality, and timeline viewer.
 */
export default function MyApplicationsPage() {
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading, isError } = useMyApplications({ page, limit });

  const applications = data?.data?.applications || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">My Applications</h1>
        <p className="mt-1 text-sm text-slate-400">
          Track your job applications and their current status
        </p>
      </div>

      {/* Stats Row */}
      {meta && meta.total > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            label="Total"
            value={meta.total}
            icon={<Briefcase className="h-4 w-4" />}
            color="text-blue-400"
          />
          <StatCard
            label="In Progress"
            value={
              applications.filter((a) =>
                ['PENDING', 'REVIEWING', 'SHORTLISTED'].includes(a.status)
              ).length
            }
            icon={<Clock className="h-4 w-4" />}
            color="text-amber-400"
          />
          <StatCard
            label="Shortlisted"
            value={
              applications.filter((a) => a.status === 'SHORTLISTED').length
            }
            icon={<CheckCircle2 className="h-4 w-4" />}
            color="text-emerald-400"
          />
          <StatCard
            label="Withdrawn"
            value={applications.filter((a) => a.status === 'WITHDRAWN').length}
            icon={<XCircle className="h-4 w-4" />}
            color="text-slate-400"
          />
        </div>
      )}

      {/* Applications List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div className="mb-3 h-5 w-2/3 rounded bg-slate-800" />
              <div className="mb-2 h-4 w-1/3 rounded bg-slate-800" />
              <div className="h-3 w-1/4 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-red-400">Failed to load applications.</p>
        </div>
      ) : applications.length === 0 ? (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Inbox className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h3 className="mb-2 text-lg font-semibold text-slate-300">
            No applications yet
          </h3>
          <p className="mb-6 text-sm text-slate-500">
            Start applying to jobs to track your applications here.
          </p>
          <Link href="/jobs">
            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white">
              <Search className="mr-2 h-4 w-4" />
              Browse Jobs
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <ApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages} ({meta?.total} applications)
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            >
              <ChevronLeft className="mr-1 h-4 w-4" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
              className="border-slate-700 bg-slate-800/50 text-slate-300 hover:bg-slate-700"
            >
              Next
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// Application Card
// =============================================================================

function ApplicationCard({
  application,
}: {
  application: ApplicationResponse;
}) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = useState(false);
  const withdrawMutation = useWithdrawApplication();

  const statusConfig =
    APPLICATION_STATUS_CONFIG[application.status] ||
    APPLICATION_STATUS_CONFIG.PENDING;

  const canWithdraw = ['PENDING', 'REVIEWING'].includes(application.status);

  const appliedDate = new Date(application.appliedAt).toLocaleDateString(
    'en-IN',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  const handleWithdraw = async () => {
    try {
      await withdrawMutation.mutateAsync(application.id);
      setShowWithdrawConfirm(false);
    } catch {
      // Error state shown in UI
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 transition-all hover:border-slate-700">
      <div className="p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          {/* Job Info */}
          <div className="flex-1">
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/60 text-sm font-bold text-blue-400">
                {application.job?.company?.[0]?.toUpperCase() || 'J'}
              </div>
              <div>
                <Link
                  href={`/applications/${application.id}`}
                  className="text-base font-semibold text-white hover:text-blue-400"
                >
                  {application.job?.title || 'Job'}
                </Link>
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Building2 className="h-3 w-3" />
                  {application.job?.company || 'Company'}
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {application.job?.location && (
                <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                  <MapPin className="h-3 w-3" />
                  {application.job.location}
                </span>
              )}
              <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                <Calendar className="h-3 w-3" />
                Applied {appliedDate}
              </span>
              {application.resumeSnapshotTitle && (
                <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                  <FileText className="h-3 w-3" />
                  {application.resumeSnapshotTitle}
                </span>
              )}
            </div>
          </div>

          {/* Status Badge & Actions */}
          <div className="flex items-center gap-3">
            <span
              className={`rounded-lg border px-3 py-1.5 text-xs font-semibold ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>

            <div className="flex gap-2">
              <Link href={`/applications/${application.id}`}>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-slate-400 hover:text-white"
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </Link>

              {canWithdraw && !showWithdrawConfirm && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowWithdrawConfirm(true)}
                  className="text-slate-400 hover:text-red-400"
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        </div>

        {/* Withdraw Confirmation */}
        {showWithdrawConfirm && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-red-900/50 bg-red-950/30 p-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-red-400" />
            <p className="flex-1 text-xs text-red-400">
              Are you sure you want to withdraw this application? This cannot be
              undone.
            </p>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowWithdrawConfirm(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={withdrawMutation.isPending}
                onClick={handleWithdraw}
                className="bg-red-600 text-xs text-white hover:bg-red-500"
              >
                {withdrawMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Withdraw'
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Withdraw Error */}
        {withdrawMutation.isError && (
          <div className="mt-3 rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
            Failed to withdraw application. Please try again.
          </div>
        )}
      </div>

      {/* Timeline Toggle */}
      <button
        onClick={() => setShowTimeline(!showTimeline)}
        className="flex w-full items-center justify-center gap-1.5 border-t border-slate-800/50 px-4 py-2.5 text-xs text-slate-500 transition-colors hover:bg-slate-800/20 hover:text-slate-300"
      >
        <Clock className="h-3 w-3" />
        Timeline
        {showTimeline ? (
          <ChevronUp className="h-3 w-3" />
        ) : (
          <ChevronDown className="h-3 w-3" />
        )}
      </button>

      {showTimeline && <TimelineViewer applicationId={application.id} />}
    </div>
  );
}

// =============================================================================
// Timeline Viewer
// =============================================================================

function TimelineViewer({ applicationId }: { applicationId: string }) {
  const { data: timeline, isLoading } = useApplicationTimeline(applicationId);

  if (isLoading) {
    return (
      <div className="border-t border-slate-800/50 p-6">
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="flex gap-3">
              <div className="h-3 w-3 animate-pulse rounded-full bg-slate-700" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-700" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!timeline || timeline.length === 0) {
    return (
      <div className="border-t border-slate-800/50 p-4 text-center text-xs text-slate-500">
        No timeline events
      </div>
    );
  }

  return (
    <div className="border-t border-slate-800/50 p-6">
      <div className="relative space-y-0">
        {timeline.map((event: TimelineEventResponse, idx: number) => (
          <TimelineEventItem
            key={event.id}
            event={event}
            isLast={idx === timeline.length - 1}
          />
        ))}
      </div>
    </div>
  );
}

function TimelineEventItem({
  event,
  isLast,
}: {
  event: TimelineEventResponse;
  isLast: boolean;
}) {
  const statusConfig = event.newStatus
    ? APPLICATION_STATUS_CONFIG[event.newStatus]
    : null;
  const dotColor = statusConfig?.color || 'text-slate-500';

  const date = new Date(event.createdAt).toLocaleDateString('en-IN', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const eventLabel = getEventLabel(event.eventType, event.newStatus);

  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div
          className={`mt-1 h-2.5 w-2.5 rounded-full ${dotColor} bg-current`}
        />
        {!isLast && <div className="h-full w-px bg-slate-800" />}
      </div>
      <div className={`pb-4 ${isLast ? '' : ''}`}>
        <p className="text-xs font-medium text-slate-200">{eventLabel}</p>
        <p className="text-[11px] text-slate-500">{date}</p>
        {event.notes && (
          <p className="mt-1 text-[11px] text-slate-400">{event.notes}</p>
        )}
        {event.performerName && (
          <p className="mt-0.5 text-[11px] text-slate-500">
            by {event.performerName} ({event.actorType})
          </p>
        )}
      </div>
    </div>
  );
}

function getEventLabel(eventType: string, newStatus: string | null): string {
  const labels: Record<string, string> = {
    APPLICATION_SUBMITTED: 'Application Submitted',
    APPLICATION_WITHDRAWN: 'Application Withdrawn',
    STATUS_CHANGED: newStatus
      ? `Status changed to ${APPLICATION_STATUS_CONFIG[newStatus]?.label || newStatus}`
      : 'Status Updated',
  };
  return labels[eventType] || eventType;
}

// =============================================================================
// Stat Card
// =============================================================================

function StatCard({
  label,
  value,
  icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
      <div className={`mb-1 flex items-center gap-2 text-xs ${color}`}>
        {icon}
        {label}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
    </div>
  );
}
