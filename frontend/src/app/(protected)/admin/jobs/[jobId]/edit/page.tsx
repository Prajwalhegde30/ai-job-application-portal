'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useJob, useUpdateJob } from '@/hooks/useJobs';
import {
  createJobSchema,
  JOB_TYPES,
  JOB_TYPE_LABELS,
} from '@/lib/validators/job';
import type { CreateJobInput } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';

/**
 * Admin Edit Job Page
 * Loads existing job data and allows editing fields.
 */
export default function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const { jobId } = use(params);
  const router = useRouter();
  const { data: job, isLoading: isLoadingJob, isError } = useJob(jobId);
  const updateJob = useUpdateJob();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
  });

  // Populate form when job data loads
  useEffect(() => {
    if (job) {
      reset({
        title: job.title,
        company: job.company,
        description: job.description,
        requirements: job.requirements,
        responsibilities: job.responsibilities || '',
        location: job.location,
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        jobType: job.jobType,
        status: job.status,
        isFeatured: job.isFeatured,
      });
    }
  }, [job, reset]);

  const onSubmit = async (data: CreateJobInput) => {
    try {
      // Clean up empty responsibilities
      if (data.responsibilities === '') {
        data.responsibilities = undefined;
      }
      await updateJob.mutateAsync({ jobId, input: data });
      router.push('/admin/jobs');
    } catch {
      // Error handled by React Query
    }
  };

  if (isLoadingJob) {
    return (
      <div className="mx-auto max-w-3xl space-y-8">
        <div className="h-8 w-32 animate-pulse rounded bg-slate-800" />
        <div className="h-8 w-64 animate-pulse rounded bg-slate-800" />
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-lg bg-slate-800"
            />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !job) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <Link
          href="/admin/jobs"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Jobs
        </Link>
        <div className="rounded-xl border border-red-900/50 bg-red-950/30 p-8 text-center">
          <p className="text-red-400">Job not found or an error occurred.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      {/* Back Link */}
      <Link
        href="/admin/jobs"
        className="inline-flex items-center gap-1.5 text-sm text-slate-400 transition-colors hover:text-white"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Jobs
      </Link>

      {/* Header */}
      <div>
        <h1 className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-3xl font-bold tracking-tight text-transparent">
          Edit Job Posting
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Update the job details below
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {updateJob.isError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            Failed to update job. Please try again.
          </div>
        )}

        {/* Title & Company */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup label="Job Title" error={errors.title?.message} required>
            <Input
              id="edit-job-title"
              placeholder="e.g. Senior Software Engineer"
              {...register('title')}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
          <FieldGroup label="Company" error={errors.company?.message} required>
            <Input
              id="edit-job-company"
              placeholder="e.g. TechCorp India"
              {...register('company')}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
        </div>

        {/* Location & Job Type */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup
            label="Location"
            error={errors.location?.message}
            required
          >
            <Input
              id="edit-job-location"
              placeholder="e.g. Bangalore, India"
              {...register('location')}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
          <FieldGroup label="Job Type" error={errors.jobType?.message} required>
            <select
              id="edit-job-type"
              {...register('jobType')}
              className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
            >
              {JOB_TYPES.map((type) => (
                <option key={type} value={type}>
                  {JOB_TYPE_LABELS[type]}
                </option>
              ))}
            </select>
          </FieldGroup>
        </div>

        {/* Salary Range */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup
            label="Minimum Salary (₹)"
            error={errors.salaryMin?.message}
          >
            <Input
              id="edit-job-salary-min"
              type="number"
              placeholder="e.g. 800000"
              {...register('salaryMin', { valueAsNumber: true })}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
          <FieldGroup
            label="Maximum Salary (₹)"
            error={errors.salaryMax?.message}
          >
            <Input
              id="edit-job-salary-max"
              type="number"
              placeholder="e.g. 1500000"
              {...register('salaryMax', { valueAsNumber: true })}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
        </div>

        {/* Description */}
        <FieldGroup
          label="Job Description"
          error={errors.description?.message}
          required
        >
          <textarea
            id="edit-job-description"
            rows={6}
            placeholder="Provide a detailed description..."
            {...register('description')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
        </FieldGroup>

        {/* Requirements */}
        <FieldGroup
          label="Requirements"
          error={errors.requirements?.message}
          required
        >
          <textarea
            id="edit-job-requirements"
            rows={5}
            placeholder="List the skills and experience required..."
            {...register('requirements')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
        </FieldGroup>

        {/* Responsibilities */}
        <FieldGroup
          label="Responsibilities"
          error={errors.responsibilities?.message}
        >
          <textarea
            id="edit-job-responsibilities"
            rows={5}
            placeholder="Describe key responsibilities..."
            {...register('responsibilities')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
        </FieldGroup>

        {/* Featured Toggle */}
        <div className="flex items-center gap-3">
          <input
            id="edit-job-featured"
            type="checkbox"
            {...register('isFeatured')}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
          />
          <Label htmlFor="edit-job-featured" className="text-sm text-slate-300">
            Mark as Featured Job
          </Label>
        </div>

        {/* Save Button */}
        <div className="border-t border-slate-800 pt-6">
          <Button
            type="submit"
            id="save-edit-button"
            disabled={isSubmitting || updateJob.isPending}
            className="bg-gradient-to-r from-blue-600 to-violet-600 px-8 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-violet-500"
          >
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}

// =============================================================================
// Sub-components
// =============================================================================

function FieldGroup({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-300">
        {label}
        {required && <span className="ml-1 text-red-400">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
