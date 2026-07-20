'use client';

import { useState } from 'react';
import Link from 'next/link';
import {
  useAdminJobs,
  usePublishJob,
  useCloseJob,
  useDeleteJob,
} from '@/hooks/useJobs';
import {
  JOB_TYPE_LABELS,
  JOB_STATUS_LABELS,
  JOB_STATUSES,
} from '@/lib/validators/job';
import type { JobType, JobStatus } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  Plus,
  Edit3,
  Trash2,
  Eye,
  Send,
  XCircle,
  ChevronLeft,
  ChevronRight,
  Briefcase,
  Users,
  MapPin,
  Star,
} from 'lucide-react';

/**
 * Admin Jobs Dashboard
 * Lists all jobs created by the current admin with management actions.
 */
export default function AdminJobsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;

  // Debounce search
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(
    null
  );
  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchTimeout) clearTimeout(searchTimeout);
    const timeout = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    setSearchTimeout(timeout);
  };

  const { data, isLoading, isError } = useAdminJobs({
    page,
    limit,
    search: debouncedSearch || undefined,
    status: statusFilter || undefined,
  });

  const publishJob = usePublishJob();
  const closeJob = useCloseJob();
  const deleteJob = useDeleteJob();

  const jobs = data?.data?.jobs ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  const handlePublish = async (jobId: string) => {
    if (confirm('Are you sure you want to publish this job?')) {
      publishJob.mutate(jobId);
    }
  };

  const handleClose = async (jobId: string) => {
    if (confirm('Are you sure you want to close this job?')) {
      closeJob.mutate(jobId);
    }
  };

  const handleDelete = async (jobId: string) => {
    if (
      confirm(
        'Are you sure you want to delete this job? This will mark it as closed.'
      )
    ) {
      deleteJob.mutate(jobId);
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'border-yellow-800/40 bg-yellow-950/40 text-yellow-400';
      case 'PUBLISHED':
        return 'border-emerald-800/40 bg-emerald-950/40 text-emerald-400';
      case 'CLOSED':
        return 'border-slate-700/40 bg-slate-800/40 text-slate-400';
      default:
        return 'border-slate-800 bg-slate-900 text-slate-400';
    }
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
            My Job Postings
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Manage your job listings and track applications
          </p>
        </div>
        <Link href="/admin/jobs/create">
          <Button
            id="create-job-button"
            className="bg-gradient-to-r from-blue-600 to-violet-600 px-6 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500"
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Job
          </Button>
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="admin-job-search"
            placeholder="Search your jobs..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border-slate-800 bg-slate-900/50 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>
        <select
          id="admin-status-filter"
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
        >
          <option value="">All Statuses</option>
          {JOB_STATUSES.map((s) => (
            <option key={s} value={s}>
              {JOB_STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {/* Stats Summary */}
      {meta && (
        <p className="text-xs text-slate-500">
          {meta.total} total job{meta.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading */}
      {isLoading && (
        <div className="space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-lg bg-slate-800" />
                <div className="flex-1">
                  <div className="mb-2 h-5 w-1/3 rounded bg-slate-800" />
                  <div className="h-3 w-1/4 rounded bg-slate-800" />
                </div>
                <div className="h-8 w-24 rounded bg-slate-800" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {isError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-red-400">
            Failed to load your jobs. Please try again.
          </p>
        </div>
      )}

      {/* Empty */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300">No jobs yet</h3>
          <p className="mt-1 mb-4 text-sm text-slate-500">
            Create your first job posting to start recruiting
          </p>
          <Link href="/admin/jobs/create">
            <Button className="bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white">
              <Plus className="mr-2 h-4 w-4" />
              Create Job
            </Button>
          </Link>
        </div>
      )}

      {/* Job List */}
      {!isLoading && !isError && jobs.length > 0 && (
        <div className="space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              id={`admin-job-${job.id}`}
              className="group rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-5 transition-all hover:border-slate-700"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {/* Job Info */}
                <div className="flex flex-1 items-center gap-4 overflow-hidden">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 text-sm font-bold text-blue-400">
                    {job.company[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-white">
                        {job.title}
                      </h3>
                      {job.isFeatured && (
                        <Star className="h-3 w-3 shrink-0 text-amber-400" />
                      )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500">
                      <span>{job.company}</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </span>
                      <span>
                        {JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Status & Stats */}
                <div className="flex items-center gap-3">
                  <span
                    className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusColor(job.status)}`}
                  >
                    {JOB_STATUS_LABELS[job.status as JobStatus] || job.status}
                  </span>
                  {job.applicationCount !== undefined && (
                    <span className="flex items-center gap-1 text-xs text-slate-500">
                      <Users className="h-3 w-3" />
                      {job.applicationCount}
                    </span>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  <Link href={`/jobs/${job.slug || job.id}`}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-white"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                  {job.status !== 'CLOSED' && (
                    <Link href={`/admin/jobs/${job.id}/edit`}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-slate-400 hover:bg-slate-800 hover:text-blue-400"
                        title="Edit"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  )}
                  {job.status === 'DRAFT' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePublish(job.id)}
                      disabled={publishJob.isPending}
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-emerald-950/50 hover:text-emerald-400"
                      title="Publish"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {job.status === 'CLOSED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handlePublish(job.id)}
                      disabled={publishJob.isPending}
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-emerald-950/50 hover:text-emerald-400"
                      title="Reopen"
                    >
                      <Send className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {job.status === 'PUBLISHED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleClose(job.id)}
                      disabled={closeJob.isPending}
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-orange-950/50 hover:text-orange-400"
                      title="Close"
                    >
                      <XCircle className="h-3.5 w-3.5" />
                    </Button>
                  )}
                  {job.status !== 'CLOSED' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(job.id)}
                      disabled={deleteJob.isPending}
                      className="h-8 w-8 p-0 text-slate-400 hover:bg-red-950/50 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          <span className="text-xs text-slate-400">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="border-slate-800 bg-slate-900/50 text-slate-300 hover:bg-slate-800 hover:text-white disabled:opacity-40"
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
