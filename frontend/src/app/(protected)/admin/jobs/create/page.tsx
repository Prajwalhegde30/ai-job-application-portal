'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCreateJob } from '@/hooks/useJobs';
import {
  createJobSchema,
  JOB_TYPES,
  JOB_TYPE_LABELS,
} from '@/lib/validators/job';
import type { CreateJobInput } from '@/lib/validators/job';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Save, Send, Loader2 } from 'lucide-react';

/**
 * Admin Create Job Page
 * Form for creating a new job posting. Supports saving as draft or publishing immediately.
 */
export default function CreateJobPage() {
  const router = useRouter();
  const createJob = useCreateJob();
  const [submitStatus, setSubmitStatus] = useState<'DRAFT' | 'PUBLISHED'>(
    'DRAFT'
  );

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<CreateJobInput>({
    resolver: zodResolver(createJobSchema),
    defaultValues: {
      title: '',
      company: '',
      description: '',
      requirements: '',
      responsibilities: '',
      location: '',
      salaryMin: null,
      salaryMax: null,
      jobType: 'FULL_TIME',
      status: 'DRAFT',
      isFeatured: false,
    },
  });

  const onSubmit = async (data: CreateJobInput) => {
    try {
      data.status = submitStatus;
      // Clean up empty responsibilities
      if (data.responsibilities === '') {
        data.responsibilities = undefined;
      }
      await createJob.mutateAsync(data);
      router.push('/admin/jobs');
    } catch {
      // Error handled by React Query
    }
  };

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
          Create Job Posting
        </h1>
        <p className="mt-1.5 text-sm text-slate-400">
          Fill in the details below to create a new job listing
        </p>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Error Banner */}
        {createJob.isError && (
          <div className="rounded-lg border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-400">
            Failed to create job. Please try again.
          </div>
        )}

        {/* Title & Company */}
        <div className="grid gap-6 sm:grid-cols-2">
          <FieldGroup label="Job Title" error={errors.title?.message} required>
            <Input
              id="create-job-title"
              placeholder="e.g. Senior Software Engineer"
              {...register('title')}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
          <FieldGroup label="Company" error={errors.company?.message} required>
            <Input
              id="create-job-company"
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
              id="create-job-location"
              placeholder="e.g. Bangalore, India"
              {...register('location')}
              className="border-slate-800 bg-slate-900/50 text-white placeholder:text-slate-500"
            />
          </FieldGroup>
          <FieldGroup label="Job Type" error={errors.jobType?.message} required>
            <select
              id="create-job-type"
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
              id="create-job-salary-min"
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
              id="create-job-salary-max"
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
            id="create-job-description"
            rows={6}
            placeholder="Provide a detailed description of the role, team, and company..."
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
            id="create-job-requirements"
            rows={5}
            placeholder="List the skills, experience, and qualifications required..."
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
            id="create-job-responsibilities"
            rows={5}
            placeholder="Describe key responsibilities and duties..."
            {...register('responsibilities')}
            className="w-full rounded-lg border border-slate-800 bg-slate-900/50 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 focus:outline-none"
          />
        </FieldGroup>

        {/* Featured Toggle */}
        <div className="flex items-center gap-3">
          <input
            id="create-job-featured"
            type="checkbox"
            {...register('isFeatured')}
            className="h-4 w-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500/20"
          />
          <Label
            htmlFor="create-job-featured"
            className="text-sm text-slate-300"
          >
            Mark as Featured Job
          </Label>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 border-t border-slate-800 pt-6 sm:flex-row">
          <Button
            type="submit"
            id="save-draft-button"
            onClick={() => {
              setSubmitStatus('DRAFT');
              setValue('status', 'DRAFT');
            }}
            disabled={isSubmitting || createJob.isPending}
            className="border border-slate-700 bg-slate-800 text-sm font-semibold text-white hover:bg-slate-700"
          >
            {isSubmitting && submitStatus === 'DRAFT' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save as Draft
          </Button>
          <Button
            type="submit"
            id="publish-button"
            onClick={() => {
              setSubmitStatus('PUBLISHED');
              setValue('status', 'PUBLISHED');
            }}
            disabled={isSubmitting || createJob.isPending}
            className="bg-gradient-to-r from-blue-600 to-violet-600 text-sm font-semibold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-violet-500"
          >
            {isSubmitting && submitStatus === 'PUBLISHED' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish Job
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
