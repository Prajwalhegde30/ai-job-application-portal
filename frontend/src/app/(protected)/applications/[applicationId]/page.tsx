'use client';

import { use } from 'react';
import Link from 'next/link';
import {
  useApplicationDetail,
  useApplicationTimeline,
} from '@/hooks/useApplications';
import { useGetMatchAnalysis } from '@/hooks/useMatchAnalysis';
import { useGetCareerAdvice } from '@/hooks/useCareerAdvice';
import { MatchScorecard } from '@/components/analysis';
import { CareerAdvisorCard } from '@/components/ai';
import { useAuth } from '@/hooks/useAuth';
import { APPLICATION_STATUS_CONFIG } from '@/lib/validators/application';
import type { TimelineEventResponse } from '@/lib/validators/application';
import {
  ArrowLeft,
  Briefcase,
  MapPin,
  Building2,
  Calendar,
  FileText,
  Clock,
  User,
  Mail,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

/**
 * Application Detail Page
 * Full view of a single application including job info, resume snapshot,
 * review details, and timeline.
 */
export default function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const { applicationId } = use(params);
  const { isAdmin } = useAuth();
  const {
    data: application,
    isLoading,
    isError,
  } = useApplicationDetail(applicationId);
  const { data: timeline } = useApplicationTimeline(applicationId);
  const { data: matchReport, isLoading: isMatchLoading } =
    useGetMatchAnalysis(applicationId);
  const { data: careerAdvice, isLoading: isAdviceLoading } =
    useGetCareerAdvice(applicationId);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-32 animate-pulse rounded bg-slate-800" />
        <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-8">
          <div className="mb-4 h-6 w-2/3 rounded bg-slate-800" />
          <div className="mb-3 h-4 w-1/2 rounded bg-slate-800" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-3 w-full rounded bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !application) {
    return (
      <div className="space-y-6">
        <Link
          href="/applications"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Applications
        </Link>
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <AlertTriangle className="mx-auto mb-3 h-8 w-8 text-red-400" />
          <p className="text-red-400">
            Application not found or access denied.
          </p>
        </div>
      </div>
    );
  }

  const statusConfig =
    APPLICATION_STATUS_CONFIG[application.status] ||
    APPLICATION_STATUS_CONFIG.PENDING;

  const appliedDate = new Date(application.appliedAt).toLocaleDateString(
    'en-IN',
    {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }
  );

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/applications"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Applications
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-lg font-bold text-blue-400">
              {application.job?.company?.[0]?.toUpperCase() || 'J'}
            </div>
            <div>
              <h1 className="text-xl font-bold text-white lg:text-2xl">
                {application.job?.title || 'Job Application'}
              </h1>
              <p className="text-sm text-slate-300">
                {application.job?.company}
              </p>
              <div className="mt-2 flex flex-wrap gap-2 text-xs">
                {application.job?.location && (
                  <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                    <MapPin className="h-3 w-3" />
                    {application.job.location}
                  </span>
                )}
                {application.job?.jobType && (
                  <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                    <Briefcase className="h-3 w-3" />
                    {application.job.jobType.replace('_', ' ')}
                  </span>
                )}
              </div>
            </div>
          </div>

          <span
            className={`self-start rounded-lg border px-4 py-2 text-sm font-semibold ${statusConfig.bgColor} ${statusConfig.borderColor} ${statusConfig.color}`}
          >
            {statusConfig.label}
          </span>
        </div>
      </div>

      {/* Match Scorecard */}
      {isMatchLoading ? (
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-8" />
      ) : matchReport ? (
        <MatchScorecard report={matchReport} isAdminView={isAdmin} />
      ) : null}

      {/* Career Advisor */}
      {isAdviceLoading ? (
        <div className="h-48 animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-8" />
      ) : careerAdvice ? (
        <CareerAdvisorCard report={careerAdvice} />
      ) : null}

      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Application Info */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
            <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
              <CheckCircle2 className="h-5 w-5 text-blue-400" />
              Application Details
            </h2>
            <div className="space-y-3 text-sm">
              <InfoRow
                icon={<Calendar className="h-4 w-4 text-slate-500" />}
                label="Applied"
                value={appliedDate}
              />
              {application.resumeSnapshotTitle && (
                <InfoRow
                  icon={<FileText className="h-4 w-4 text-slate-500" />}
                  label="Resume"
                  value={`${application.resumeSnapshotTitle} (${application.resumeSnapshotFileName})`}
                />
              )}
              {application.coverLetter && (
                <div className="pt-2">
                  <p className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
                    <MessageSquare className="h-3.5 w-3.5" />
                    Cover Letter
                  </p>
                  <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-sm whitespace-pre-wrap text-slate-300">
                    {application.coverLetter}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Review Information */}
          {application.reviewedAt && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-white">
                <User className="h-5 w-5 text-violet-400" />
                Review Information
              </h2>
              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={<Clock className="h-4 w-4 text-slate-500" />}
                  label="Reviewed At"
                  value={new Date(application.reviewedAt).toLocaleDateString(
                    'en-IN',
                    {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  )}
                />
                {application.notes && (
                  <div className="pt-2">
                    <p className="mb-2 text-xs font-medium text-slate-400">
                      Reviewer Notes
                    </p>
                    <div className="rounded-lg border border-slate-800 bg-slate-800/30 p-4 text-sm whitespace-pre-wrap text-slate-300">
                      {application.notes}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Timeline */}
          {timeline && timeline.length > 0 && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h2 className="mb-6 flex items-center gap-2 text-base font-semibold text-white">
                <Clock className="h-5 w-5 text-emerald-400" />
                Application Timeline
              </h2>
              <div className="relative space-y-0">
                {timeline.map((event: TimelineEventResponse, idx: number) => {
                  const config = event.newStatus
                    ? APPLICATION_STATUS_CONFIG[event.newStatus]
                    : null;
                  const dotColor = config?.color || 'text-slate-500';
                  const isLast = idx === timeline.length - 1;

                  const eventLabel = getEventLabel(
                    event.eventType,
                    event.newStatus
                  );
                  const date = new Date(event.createdAt).toLocaleDateString(
                    'en-IN',
                    {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    }
                  );

                  return (
                    <div key={event.id} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className={`mt-1.5 h-3 w-3 rounded-full ${dotColor} bg-current`}
                        />
                        {!isLast && (
                          <div className="h-full w-px bg-slate-800" />
                        )}
                      </div>
                      <div className="pb-6">
                        <p className="text-sm font-medium text-slate-200">
                          {eventLabel}
                        </p>
                        <p className="text-xs text-slate-500">{date}</p>
                        {event.notes && (
                          <p className="mt-1 text-xs text-slate-400">
                            {event.notes}
                          </p>
                        )}
                        {event.performerName && (
                          <p className="mt-0.5 text-xs text-slate-500">
                            by {event.performerName}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Job Overview */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Job Overview
            </h3>
            <div className="space-y-3 text-sm">
              <InfoRow
                icon={<Building2 className="h-4 w-4 text-blue-400" />}
                label="Company"
                value={application.job?.company || '-'}
              />
              <InfoRow
                icon={<MapPin className="h-4 w-4 text-blue-400" />}
                label="Location"
                value={application.job?.location || '-'}
              />
              <InfoRow
                icon={<Briefcase className="h-4 w-4 text-violet-400" />}
                label="Type"
                value={application.job?.jobType?.replace('_', ' ') || '-'}
              />
            </div>
          </div>

          {/* Snapshot Info */}
          {application.resumeSnapshotTitle && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                <FileText className="h-4 w-4 text-emerald-400" />
                Resume Snapshot
              </h3>
              <p className="text-xs text-slate-400">
                This is the resume that was submitted with your application.
                Changes to your resumes do not affect submitted applications.
              </p>
              <div className="mt-3 space-y-2 text-sm">
                <InfoRow
                  icon={<FileText className="h-3.5 w-3.5 text-slate-500" />}
                  label="Title"
                  value={application.resumeSnapshotTitle}
                />
                {application.resumeSnapshotFileName && (
                  <InfoRow
                    icon={<FileText className="h-3.5 w-3.5 text-slate-500" />}
                    label="File"
                    value={application.resumeSnapshotFileName}
                  />
                )}
              </div>
            </div>
          )}

          {/* Applicant Info (for admin view) */}
          {application.applicant && (
            <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
              <h3 className="mb-4 text-sm font-semibold text-white">
                Applicant
              </h3>
              <div className="space-y-3 text-sm">
                <InfoRow
                  icon={<User className="h-4 w-4 text-blue-400" />}
                  label="Name"
                  value={application.applicant.name}
                />
                <InfoRow
                  icon={<Mail className="h-4 w-4 text-blue-400" />}
                  label="Email"
                  value={application.applicant.email}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5">{icon}</div>
      <div>
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-slate-300">{value}</p>
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
