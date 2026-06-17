'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { JobResponse, CreateJobInput } from '@/lib/validators/job';

// =============================================================================
// Query Keys
// =============================================================================

export const jobKeys = {
  all: ['jobs'] as const,
  list: (params?: Record<string, unknown>) =>
    [...jobKeys.all, 'list', params] as const,
  adminList: (params?: Record<string, unknown>) =>
    [...jobKeys.all, 'admin', params] as const,
  detail: (id: string) => [...jobKeys.all, 'detail', id] as const,
};

// =============================================================================
// Types
// =============================================================================

interface JobListResponse {
  success: boolean;
  data: { jobs: JobResponse[] };
  meta?: { page: number; limit: number; total: number };
}

interface JobDetailResponse {
  success: boolean;
  data: { job: JobResponse };
}

// =============================================================================
// Hooks — Public Job Listing
// =============================================================================

/**
 * Fetch published jobs with search, filters, and pagination.
 */
export function useJobs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  jobType?: string;
  location?: string;
}) {
  return useQuery({
    queryKey: jobKeys.list(params),
    queryFn: async () => {
      const { data } = await api.get<JobListResponse>('/jobs', { params });
      return data;
    },
  });
}

/**
 * Fetch a single job by ID or slug.
 */
export function useJob(jobId: string) {
  return useQuery({
    queryKey: jobKeys.detail(jobId),
    queryFn: async () => {
      const { data } = await api.get<JobDetailResponse>(`/jobs/${jobId}`);
      return data.data.job;
    },
    enabled: !!jobId,
  });
}

// =============================================================================
// Hooks — Admin Job Listing
// =============================================================================

/**
 * Fetch jobs posted by the current admin.
 */
export function useAdminJobs(params?: {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  jobType?: string;
}) {
  return useQuery({
    queryKey: jobKeys.adminList(params),
    queryFn: async () => {
      const { data } = await api.get<JobListResponse>('/jobs/admin/list', {
        params,
      });
      return data;
    },
  });
}

// =============================================================================
// Mutations
// =============================================================================

/**
 * Create a new job posting.
 */
export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateJobInput) => {
      const { data } = await api.post<JobDetailResponse>('/jobs', input);
      return data.data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

/**
 * Update an existing job.
 */
export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      jobId,
      input,
    }: {
      jobId: string;
      input: Partial<CreateJobInput>;
    }) => {
      const { data } = await api.put<JobDetailResponse>(
        `/jobs/${jobId}`,
        input
      );
      return data.data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

/**
 * Publish a draft job.
 */
export function usePublishJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.patch<JobDetailResponse>(
        `/jobs/${jobId}/publish`
      );
      return data.data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

/**
 * Close a published job.
 */
export function useCloseJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      const { data } = await api.patch<JobDetailResponse>(
        `/jobs/${jobId}/close`
      );
      return data.data.job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}

/**
 * Delete (soft-delete) a job.
 */
export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (jobId: string) => {
      await api.delete(`/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: jobKeys.all });
    },
  });
}
