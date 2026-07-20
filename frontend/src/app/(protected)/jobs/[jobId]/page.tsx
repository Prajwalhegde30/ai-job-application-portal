'use client';

import { use, useState } from 'react';
import Link from 'next/link';
import { useJob } from '@/hooks/useJobs';
import { useResumes } from '@/hooks/useResumes';
import { useApplyToJob, useCheckApplication } from '@/hooks/useApplications';
import { useAuth } from '@/hooks/useAuth';
import { JOB_TYPE_LABELS } from '@/lib/validators/job';
import type { JobType } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  MapPin,
  Briefcase,
  DollarSign,
  Calendar,
  Clock,
  Star,
  Building2,
  FileText,
  CheckCircle2,
  ListChecks,
  Send,
  Check,
  Loader2,
  X,
  ChevronDown,
} from 'lucide-react';

/**
 * Job Detail Page
 * Displays full job information including description, requirements,
 * responsibilities, and metadata. Includes functional Apply Now flow
 * with resume selection and cover letter.
 */
export default function JobDetailPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const { data: job, isLoading, isError } = useJob(jobId);
  const { isUser } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
        <div className="animate-pulse rounded-xl border border-slate-800 bg-slate-900/30 p-8">
          <div className="mb-4 h-8 w-3/4 rounded bg-slate-800" />
          <div className="mb-3 h-5 w-1/2 rounded bg-slate-800" />
          <div className="mb-6 h-4 w-1/3 rounded bg-slate-800" />
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="h-3 w-full rounded bg-slate-800" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="space-y-6">
        <Link
          href="/jobs"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Jobs
        </Link>
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-red-400">Job not found or an error occurred.</p>
        </div>
      </div>
    );
  }

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    const fmt = (n: number) =>
      n >= 100000 ? `₹${(n / 100000).toFixed(1)}L` : `₹${n.toLocaleString()}`;
    if (min && max) return `${fmt(min)} – ${fmt(max)}`;
    if (min) return `From ${fmt(min)}`;
    return `Up to ${fmt(max!)}`;
  };

  const salary = formatSalary(job.salaryMin, job.salaryMax);
  const publishedDate = job.publishedAt
    ? new Date(job.publishedAt).toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
    : null;

  return (
    <div className="space-y-8">
      {/* Back Link */}
      <Link
        href="/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Jobs
      </Link>

      {/* Job Header */}
      <div className="relative rounded-xl border border-slate-800 bg-gradient-to-br from-slate-900/80 to-slate-900/40 p-8">
        {job.isFeatured && (
          <div className="absolute top-4 right-4 flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-orange-500/20 px-3 py-1 text-xs font-semibold text-amber-400">
            <Star className="h-3.5 w-3.5" />
            Featured
          </div>
        )}

        <div className="flex items-start gap-5">
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-800/60 text-xl font-bold text-blue-400">
            {job.company[0]?.toUpperCase()}
          </div>
          <div className="flex-1">
            <h1 className="mb-1 text-2xl font-bold text-white lg:text-3xl">
              {job.title}
            </h1>
            <p className="mb-4 text-base text-slate-300">{job.company}</p>

            {/* Meta Tags */}
            <div className="flex flex-wrap gap-3 text-sm">
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-1.5 text-slate-300">
                <MapPin className="h-3.5 w-3.5 text-blue-400" />
                {job.location}
              </span>
              <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-1.5 text-slate-300">
                <Briefcase className="h-3.5 w-3.5 text-violet-400" />
                {JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType}
              </span>
              {salary && (
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-1.5 text-slate-300">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-400" />
                  {salary}
                </span>
              )}
              {publishedDate && (
                <span className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-800/40 px-3 py-1.5 text-slate-300">
                  <Calendar className="h-3.5 w-3.5 text-orange-400" />
                  {publishedDate}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Apply CTA — Only for USER role */}
        {isUser && (
          <div className="mt-6 border-t border-slate-800/50 pt-6">
            <ApplySection jobId={job.id} />
          </div>
        )}
      </div>

      {/* Content Sections */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-8 lg:col-span-2">
          {/* Description */}
          <ContentSection
            title="Job Description"
            icon={<Building2 className="h-5 w-5 text-blue-400" />}
            content={job.description}
          />

          {/* Requirements */}
          <ContentSection
            title="Requirements"
            icon={<CheckCircle2 className="h-5 w-5 text-emerald-400" />}
            content={job.requirements}
          />

          {/* Responsibilities */}
          {job.responsibilities && (
            <ContentSection
              title="Responsibilities"
              icon={<ListChecks className="h-5 w-5 text-violet-400" />}
              content={job.responsibilities}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
            <h3 className="mb-4 text-sm font-semibold text-white">
              Job Overview
            </h3>
            <div className="space-y-4 text-sm">
              <OverviewItem
                icon={<Building2 className="h-4 w-4 text-blue-400" />}
                label="Company"
                value={job.company}
              />
              <OverviewItem
                icon={<MapPin className="h-4 w-4 text-blue-400" />}
                label="Location"
                value={job.location}
              />
              <OverviewItem
                icon={<Briefcase className="h-4 w-4 text-violet-400" />}
                label="Job Type"
                value={JOB_TYPE_LABELS[job.jobType as JobType] || job.jobType}
              />
              {salary && (
                <OverviewItem
                  icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
                  label="Salary"
                  value={salary}
                />
              )}
              {publishedDate && (
                <OverviewItem
                  icon={<Clock className="h-4 w-4 text-orange-400" />}
                  label="Posted"
                  value={publishedDate}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// Apply Section Component
// =============================================================================

function ApplySection({ jobId }: { jobId: string }) {
  const { data: resumes, isLoading: resumesLoading } = useResumes();
  const { data: checkData, isLoading: checkLoading } =
    useCheckApplication(jobId);
  const applyMutation = useApplyToJob();

  const [showForm, setShowForm] = useState(false);
  const [selectedResumeId, setSelectedResumeId] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [showResumeDropdown, setShowResumeDropdown] = useState(false);
  const [applied, setApplied] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);

  const hasApplied = checkData?.hasApplied || applied;

  if (checkLoading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-800" />
      </div>
    );
  }

  if (hasApplied) {
    return (
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-800/50 bg-emerald-950/40 px-4 py-2.5 text-sm font-medium text-emerald-400">
          <Check className="h-4 w-4" />
          Application Submitted
        </div>
        <Link
          href="/applications"
          className="text-sm text-blue-400 hover:text-blue-300 hover:underline"
        >
          View my applications →
        </Link>
      </div>
    );
  }

  if (!showForm) {
    return (
      <Button
        id="apply-now-button"
        onClick={() => setShowForm(true)}
        className="bg-gradient-to-r from-blue-600 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500"
      >
        <FileText className="mr-2 h-4 w-4" />
        Apply Now
      </Button>
    );
  }

  const selectedResume = resumes?.find((r) => r.id === selectedResumeId);

  const handleSubmit = async () => {
    if (!selectedResumeId || !consentChecked) return;
    try {
      await applyMutation.mutateAsync({
        jobId,
        resumeId: selectedResumeId,
        coverLetter: coverLetter.trim() || null,
      });
      setApplied(true);
      setShowForm(false);
    } catch {
      // Error handled by mutation state
    }
  };

  return (
    <div className="space-y-4 rounded-xl border border-slate-700/50 bg-slate-800/30 p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Apply to this position
        </h3>
        <button
          onClick={() => setShowForm(false)}
          className="rounded p-1 text-slate-400 hover:bg-slate-700 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Resume Selector */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400">
          Select Resume <span className="text-red-400">*</span>
        </label>
        {resumesLoading ? (
          <div className="h-10 animate-pulse rounded-lg bg-slate-700" />
        ) : !resumes || resumes.length === 0 ? (
          <div className="rounded-lg border border-amber-800/50 bg-amber-950/30 px-3 py-2 text-xs text-amber-400">
            No resumes uploaded.{' '}
            <Link href="/resumes" className="underline hover:text-amber-300">
              Upload a resume
            </Link>{' '}
            first.
          </div>
        ) : (
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowResumeDropdown(!showResumeDropdown)}
              className="flex w-full items-center justify-between rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 transition-colors hover:border-slate-600"
            >
              <span
                className={selectedResume ? 'text-white' : 'text-slate-500'}
              >
                {selectedResume
                  ? `${selectedResume.resumeTitle} (${selectedResume.fileName})`
                  : 'Choose a resume...'}
              </span>
              <ChevronDown className="h-4 w-4 text-slate-400" />
            </button>

            {showResumeDropdown && (
              <div className="absolute top-full z-10 mt-1 w-full rounded-lg border border-slate-700 bg-slate-800 shadow-xl">
                {resumes.map((resume) => (
                  <button
                    key={resume.id}
                    type="button"
                    onClick={() => {
                      setSelectedResumeId(resume.id);
                      setShowResumeDropdown(false);
                    }}
                    className={`flex w-full items-center gap-3 px-3 py-2.5 text-left text-sm transition-colors hover:bg-slate-700/50 ${
                      resume.id === selectedResumeId
                        ? 'bg-blue-600/10 text-blue-400'
                        : 'text-slate-300'
                    }`}
                  >
                    <FileText className="h-4 w-4 shrink-0 text-slate-500" />
                    <div className="flex-1 overflow-hidden">
                      <p className="truncate font-medium">
                        {resume.resumeTitle}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {resume.fileName}
                        {resume.isActive && (
                          <span className="ml-2 text-emerald-400">
                            ● Active
                          </span>
                        )}
                      </p>
                    </div>
                    {resume.id === selectedResumeId && (
                      <Check className="h-4 w-4 text-blue-400" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cover Letter */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-slate-400">
          Cover Letter{' '}
          <span className="font-normal text-slate-500">(optional)</span>
        </label>
        <textarea
          value={coverLetter}
          onChange={(e) => setCoverLetter(e.target.value)}
          rows={4}
          maxLength={5000}
          placeholder="Tell the recruiter why you're a great fit..."
          className="w-full resize-none rounded-lg border border-slate-700 bg-slate-800/60 px-3 py-2.5 text-sm text-slate-200 placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 focus:outline-none"
        />
        <p className="text-right text-[11px] text-slate-500">
          {coverLetter.length}/5000
        </p>
      </div>

      {/* Consent Checkbox */}
      <div className="flex items-start gap-2 pt-1 pb-2">
        <input
          id="consent-checkbox"
          type="checkbox"
          checked={consentChecked}
          onChange={(e) => setConsentChecked(e.target.checked)}
          className="mt-1 h-4 w-4 cursor-pointer rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500"
        />
        <label
          htmlFor="consent-checkbox"
          className="cursor-pointer text-xs leading-normal text-slate-400 select-none"
        >
          I consent to sharing my resume details and profile analytics with the
          recruiter of this job posting. <span className="text-red-400">*</span>
        </label>
      </div>

      {/* Error message */}
      {applyMutation.isError && (
        <div className="rounded-lg border border-red-800/50 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {(
            applyMutation.error as {
              response?: { data?: { error?: { message?: string } } };
            }
          )?.response?.data?.error?.message ||
            'Failed to submit application. Please try again.'}
        </div>
      )}

      {/* Submit */}
      <Button
        id="submit-application-button"
        onClick={handleSubmit}
        disabled={
          !selectedResumeId || !consentChecked || applyMutation.isPending
        }
        className="w-full bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 transition-all hover:from-blue-500 hover:to-violet-500 disabled:opacity-50"
      >
        {applyMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Application
          </>
        )}
      </Button>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function ContentSection({
  title,
  icon,
  content,
}: {
  title: string;
  icon: React.ReactNode;
  content: string;
}) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-6">
      <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
        {icon}
        {title}
      </h2>
      <div className="prose prose-sm prose-invert max-w-none text-sm leading-relaxed whitespace-pre-wrap text-slate-300">
        {content}
      </div>
    </div>
  );
}

function OverviewItem({
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
