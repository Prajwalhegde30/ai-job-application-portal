'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAdminApplications,
  useUpdateApplicationStatus,
} from '@/hooks/useApplications';
import { useAdminJobs } from '@/hooks/useJobs';
import { APPLICATION_STATUS_CONFIG } from '@/lib/validators/application';
import type { ApplicationResponse } from '@/lib/validators/application';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Users,
  Briefcase,
  ChevronLeft,
  ChevronRight,
  Eye,
  FileText,
  MapPin,
  Calendar,
  Building2,
  Loader2,
  Filter,
  X,
  MessageSquare,
  CheckCircle2,
  AlertTriangle,
  Inbox,
} from 'lucide-react';

/**
 * Admin Application Dashboard
 * Professional recruiter interface with search, filters, status updates,
 * resume snapshot view, and notes.
 */
export default function AdminApplicationsPage() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string | undefined>();
  const [jobFilter, setJobFilter] = useState<string | undefined>();
  const limit = 10;

  const { data, isLoading, isError } = useAdminApplications({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter,
    jobId: jobFilter,
  });

  const { data: jobsData } = useAdminJobs({ limit: 100 });
  const adminJobs = jobsData?.data?.jobs || [];

  const applications = data?.data?.applications || [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  const handleSearch = () => {
    setDebouncedSearch(search);
    setPage(1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSearch();
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setStatusFilter(undefined);
    setJobFilter(undefined);
    setPage(1);
  };

  const hasActiveFilters = debouncedSearch || statusFilter || jobFilter;

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Application Review</h1>
        <p className="mt-1 text-sm text-slate-400">
          Review and manage applications for your job postings
        </p>
      </div>

      {/* Filters Bar */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end">
          {/* Search */}
          <div className="flex-1">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Search Candidates
            </label>
            <div className="flex gap-2">
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="border-slate-700 bg-slate-800/60 text-slate-200 placeholder:text-slate-500"
              />
              <Button
                onClick={handleSearch}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status Filter */}
          <div className="w-full lg:w-48">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Status
            </label>
            <select
              value={statusFilter || ''}
              onChange={(e) => {
                setStatusFilter(e.target.value || undefined);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              {Object.entries(APPLICATION_STATUS_CONFIG).map(
                ([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                )
              )}
            </select>
          </div>

          {/* Job Filter */}
          <div className="w-full lg:w-56">
            <label className="mb-1.5 block text-xs font-medium text-slate-400">
              Job
            </label>
            <select
              value={jobFilter || ''}
              onChange={(e) => {
                setJobFilter(e.target.value || undefined);
                setPage(1);
              }}
              className="w-full rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Jobs</option>
              {adminJobs.map((job) => (
                <option key={job.id} value={job.id}>
                  {job.title}
                </option>
              ))}
            </select>
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={clearFilters}
              className="text-sm text-slate-400 hover:text-white"
            >
              <X className="mr-1 h-4 w-4" />
              Clear
            </Button>
          )}
        </div>

        {/* Active filter tags */}
        {hasActiveFilters && (
          <div className="mt-3 flex flex-wrap gap-2 border-t border-slate-800/50 pt-3">
            <Filter className="h-3.5 w-3.5 text-slate-500" />
            {debouncedSearch && (
              <span className="rounded-full bg-blue-600/10 px-2.5 py-0.5 text-xs text-blue-400">
                Search: &quot;{debouncedSearch}&quot;
              </span>
            )}
            {statusFilter && (
              <span className="rounded-full bg-violet-600/10 px-2.5 py-0.5 text-xs text-violet-400">
                Status:{' '}
                {APPLICATION_STATUS_CONFIG[statusFilter]?.label || statusFilter}
              </span>
            )}
            {jobFilter && (
              <span className="rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs text-emerald-400">
                Job:{' '}
                {adminJobs.find((j) => j.id === jobFilter)?.title || 'Selected'}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results Count */}
      {meta && (
        <div className="flex items-center gap-2 text-sm text-slate-400">
          <Users className="h-4 w-4" />
          {meta.total} application{meta.total !== 1 ? 's' : ''} found
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
            {hasActiveFilters
              ? 'No matching applications'
              : 'No applications yet'}
          </h3>
          <p className="text-sm text-slate-500">
            {hasActiveFilters
              ? 'Try adjusting your filters.'
              : 'Applications will appear here when candidates apply to your jobs.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {applications.map((app) => (
            <AdminApplicationCard key={app.id} application={app} />
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-800 pt-6">
          <p className="text-sm text-slate-400">
            Page {page} of {totalPages}
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
// Admin Application Card
// =============================================================================

function AdminApplicationCard({
  application,
}: {
  application: ApplicationResponse;
}) {
  const [showStatusUpdate, setShowStatusUpdate] = useState(false);
  const [newStatus, setNewStatus] = useState('');
  const [notes, setNotes] = useState('');
  const updateMutation = useUpdateApplicationStatus();

  const statusConfig =
    APPLICATION_STATUS_CONFIG[application.status] ||
    APPLICATION_STATUS_CONFIG.PENDING;

  const appliedDate = new Date(application.appliedAt).toLocaleDateString(
    'en-IN',
    {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }
  );

  // Determine allowed transitions
  const allowedTransitions: Record<string, string[]> = {
    PENDING: ['REVIEWING'],
    REVIEWING: ['SHORTLISTED', 'REJECTED'],
    SHORTLISTED: ['HIRED', 'REJECTED'],
  };

  const availableStatuses = allowedTransitions[application.status] || [];
  const canUpdateStatus = availableStatuses.length > 0;

  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    try {
      await updateMutation.mutateAsync({
        applicationId: application.id,
        status: newStatus,
        notes: notes.trim() || undefined,
      });
      setShowStatusUpdate(false);
      setNewStatus('');
      setNotes('');
    } catch {
      // Error shown in UI
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 transition-all hover:border-slate-700">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        {/* Candidate Info */}
        <div className="flex-1">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-700 bg-slate-800/60 text-sm font-medium text-white">
              {application.applicant?.name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div>
              <p className="font-semibold text-white">
                {application.applicant?.name || 'Candidate'}
              </p>
              <p className="text-xs text-slate-400">
                {application.applicant?.email || ''}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 text-xs">
            <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
              <Briefcase className="h-3 w-3" />
              {application.job?.title || 'Job'}
            </span>
            <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
              <Building2 className="h-3 w-3" />
              {application.job?.company || 'Company'}
            </span>
            {application.job?.location && (
              <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
                <MapPin className="h-3 w-3" />
                {application.job.location}
              </span>
            )}
            <span className="flex items-center gap-1 rounded-md border border-slate-800 bg-slate-800/40 px-2 py-1 text-slate-400">
              <Calendar className="h-3 w-3" />
              {appliedDate}
            </span>
          </div>

          {/* Resume Snapshot */}
          {application.resumeSnapshotTitle && (
            <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
              <FileText className="h-3.5 w-3.5 text-emerald-500" />
              <span>
                Resume:{' '}
                <span className="text-slate-300">
                  {application.resumeSnapshotTitle}
                </span>
                <span className="ml-1 text-slate-500">
                  ({application.resumeSnapshotFileName})
                </span>
              </span>
            </div>
          )}

          {/* Cover Letter Preview */}
          {application.coverLetter && (
            <div className="mt-2 flex items-start gap-2 text-xs">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-500" />
              <p className="line-clamp-2 text-slate-400">
                {application.coverLetter}
              </p>
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div className="flex flex-col items-end gap-3">
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
                className="text-xs text-slate-400 hover:text-white"
              >
                <Eye className="mr-1 h-3.5 w-3.5" />
                View
              </Button>
            </Link>

            {canUpdateStatus && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowStatusUpdate(!showStatusUpdate)}
                className="text-xs text-blue-400 hover:text-blue-300"
              >
                <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                Update Status
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Status Update Form */}
      {showStatusUpdate && (
        <div className="mt-4 rounded-lg border border-slate-700/50 bg-slate-800/30 p-4">
          <h4 className="mb-3 text-xs font-semibold text-slate-300">
            Update Application Status
          </h4>
          <div className="flex flex-col gap-3 sm:flex-row">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="">Select new status...</option>
              {availableStatuses.map((s) => (
                <option key={s} value={s}>
                  {APPLICATION_STATUS_CONFIG[s]?.label || s}
                </option>
              ))}
            </select>
            <Input
              placeholder="Add notes (optional)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="border-slate-700 bg-slate-800/60 text-sm text-slate-200 placeholder:text-slate-500"
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={!newStatus || updateMutation.isPending}
                onClick={handleStatusUpdate}
                className="bg-blue-600 text-xs text-white hover:bg-blue-500"
              >
                {updateMutation.isPending ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  'Update'
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowStatusUpdate(false);
                  setNewStatus('');
                  setNotes('');
                }}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
            </div>
          </div>

          {updateMutation.isError && (
            <p className="mt-2 text-xs text-red-400">
              {(
                updateMutation.error as {
                  response?: { data?: { error?: { message?: string } } };
                }
              )?.response?.data?.error?.message || 'Failed to update status.'}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
