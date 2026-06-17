'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useJobs } from '@/hooks/useJobs';
import { JOB_TYPE_LABELS, JOB_TYPES } from '@/lib/validators/job';
import type { JobResponse, JobType } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Search,
  MapPin,
  Briefcase,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  Clock,
  Star,
} from 'lucide-react';

/**
 * Public Jobs Listing Page
 * Displays all published jobs with search, type filter, and pagination.
 * Accessible to all authenticated users (USER and ADMIN).
 */
export default function JobsPage() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [jobType, setJobType] = useState<string>('');
  const [page, setPage] = useState(1);
  const limit = 9;

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

  const { data, isLoading, isError } = useJobs({
    page,
    limit,
    search: debouncedSearch || undefined,
    jobType: jobType || undefined,
  });

  const jobs = data?.data?.jobs ?? [];
  const meta = data?.meta;
  const totalPages = meta ? Math.ceil(meta.total / meta.limit) : 0;

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div>
        <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Browse Jobs
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Discover opportunities that match your skills and career goals
        </p>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input
            id="job-search-input"
            placeholder="Search by title, company, or location..."
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="border-slate-800 bg-slate-900/50 pl-10 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/20"
          />
        </div>
        <select
          id="job-type-filter"
          value={jobType}
          onChange={(e) => {
            setJobType(e.target.value);
            setPage(1);
          }}
          className="rounded-lg border border-slate-800 bg-slate-900/50 px-4 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
        >
          <option value="">All Types</option>
          {JOB_TYPES.map((type) => (
            <option key={type} value={type}>
              {JOB_TYPE_LABELS[type]}
            </option>
          ))}
        </select>
      </div>

      {/* Results Count */}
      {meta && (
        <p className="text-xs text-slate-500">
          Showing {jobs.length} of {meta.total} result
          {meta.total !== 1 ? 's' : ''}
        </p>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-6"
            >
              <div className="mb-3 h-5 w-3/4 rounded bg-slate-800" />
              <div className="mb-2 h-4 w-1/2 rounded bg-slate-800" />
              <div className="mb-4 h-3 w-full rounded bg-slate-800" />
              <div className="h-3 w-2/3 rounded bg-slate-800" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {isError && (
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-red-400">Failed to load jobs. Please try again.</p>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !isError && jobs.length === 0 && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-12 text-center">
          <Briefcase className="mx-auto mb-4 h-12 w-12 text-slate-600" />
          <h3 className="text-lg font-semibold text-slate-300">
            No jobs found
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Try adjusting your search or filters
          </p>
        </div>
      )}

      {/* Job Cards Grid */}
      {!isLoading && !isError && jobs.length > 0 && (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <JobCard key={job.id} job={job} />
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

// =============================================================================
// Job Card Component
// =============================================================================

function JobCard({ job }: { job: JobResponse }) {
  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) =>
      n >= 100000 ? `${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const timeAgo = getTimeAgo(job.publishedAt || job.createdAt);

  return (
    <Link
      href={`/jobs/${job.slug || job.id}`}
      id={`job-card-${job.id}`}
      className="group relative flex flex-col rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-6 transition-all duration-300 hover:border-blue-800/50 hover:shadow-lg hover:shadow-blue-500/5"
    >
      {/* Featured Badge */}
      {job.isFeatured && (
        <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
          <Star className="h-3 w-3" />
          Featured
        </div>
      )}

      {/* Company & Type */}
      <div className="mb-3 flex items-center gap-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-800 bg-slate-800/50 text-sm font-bold text-blue-400">
          {job.company[0]?.toUpperCase()}
        </div>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-xs font-medium text-slate-400">
            {job.company}
          </p>
          <span className="inline-block rounded-full bg-blue-500/10 px-2 py-0.5 text-[10px] font-medium text-blue-400">
            {JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType}
          </span>
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-2 text-base font-semibold text-white transition-colors group-hover:text-blue-400">
        {job.title}
      </h3>

      {/* Description preview */}
      <p className="mb-4 line-clamp-2 flex-1 text-xs leading-relaxed text-slate-400">
        {job.description}
      </p>

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 border-t border-slate-800/50 pt-3 text-[11px] text-slate-500">
        <span className="flex items-center gap-1">
          <MapPin className="h-3 w-3" />
          {job.location}
        </span>
        {salary && (
          <span className="flex items-center gap-1">
            <DollarSign className="h-3 w-3" />
            {salary}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {timeAgo}
        </span>
      </div>
    </Link>
  );
}

// =============================================================================
// Utilities
// =============================================================================

function getTimeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}
