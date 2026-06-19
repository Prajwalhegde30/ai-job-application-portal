import { z } from 'zod';

/**
 * Schema for applying to a job.
 */
export const applyToJobSchema = z.object({
  jobId: z.string().min(1, 'Job ID is required'),
  resumeId: z.string().min(1, 'Resume is required'),
  coverLetter: z
    .string()
    .max(5000, 'Cover letter must be at most 5000 characters')
    .trim()
    .optional()
    .nullable(),
});

export type ApplyToJobInput = z.infer<typeof applyToJobSchema>;

/**
 * Application response with joined job details.
 */
export interface ApplicationResponse {
  id: string;
  jobId: string;
  userId: string;
  resumeId: string;
  coverLetter: string | null;
  status: string;
  aiMatchScore: number | null;
  resumeSnapshotTitle: string | null;
  resumeSnapshotFileName: string | null;
  resumeSnapshotStoragePath: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  notes: string | null;
  appliedAt: string;
  createdAt: string;
  updatedAt: string;
  job?: {
    title: string;
    company: string;
    location: string;
    jobType: string;
    status: string;
    description?: string;
    requirements?: string;
    salaryMin?: number | null;
    salaryMax?: number | null;
    postedBy?: string;
  };
  applicant?: {
    name: string;
    email: string;
  };
}

/**
 * Timeline event response.
 */
export interface TimelineEventResponse {
  id: string;
  applicationId: string;
  eventType: string;
  oldStatus: string | null;
  newStatus: string | null;
  notes: string | null;
  performedBy: string | null;
  actorType: string;
  performerName: string | null;
  createdAt: string;
}

/**
 * Status display configuration.
 */
export const APPLICATION_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; borderColor: string }
> = {
  PENDING: {
    label: 'Applied',
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
  },
  REVIEWING: {
    label: 'Under Review',
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
  },
  SHORTLISTED: {
    label: 'Shortlisted',
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
  },
  REJECTED: {
    label: 'Rejected',
    color: 'text-red-400',
    bgColor: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
  },
  HIRED: {
    label: 'Hired',
    color: 'text-green-400',
    bgColor: 'bg-green-500/10',
    borderColor: 'border-green-500/30',
  },
  WITHDRAWN: {
    label: 'Withdrawn',
    color: 'text-slate-400',
    bgColor: 'bg-slate-500/10',
    borderColor: 'border-slate-500/30',
  },
};
