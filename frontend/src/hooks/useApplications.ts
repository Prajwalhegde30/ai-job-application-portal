'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type {
  ApplicationResponse,
  TimelineEventResponse,
} from '@/lib/validators/application';

// =============================================================================
// Query Keys
// =============================================================================

export const applicationKeys = {
  all: ['applications'] as const,
  myList: (params?: Record<string, unknown>) =>
    [...applicationKeys.all, 'my', params] as const,
  adminList: (params?: Record<string, unknown>) =>
    [...applicationKeys.all, 'admin', params] as const,
  detail: (id: string) => [...applicationKeys.all, 'detail', id] as const,
  timeline: (id: string) => [...applicationKeys.all, 'timeline', id] as const,
  check: (jobId: string) => [...applicationKeys.all, 'check', jobId] as const,
};

// =============================================================================
// Types
// =============================================================================

interface ApplicationListResponse {
  success: boolean;
  data: { applications: ApplicationResponse[] };
  meta?: { page: number; limit: number; total: number };
}

interface ApplicationDetailResponse {
  success: boolean;
  data: { application: ApplicationResponse };
}

interface TimelineResponse {
  success: boolean;
  data: { timeline: TimelineEventResponse[] };
}

interface CheckApplicationResponse {
  success: boolean;
  data: { hasApplied: boolean; applicationId: string | null };
}

// =============================================================================
// USER HOOKS
// =============================================================================

/**
 * Fetch the current user's applications with pagination.
 */
export function useMyApplications(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: applicationKeys.myList(params),
    queryFn: async () => {
      const { data } = await api.get<ApplicationListResponse>(
        '/applications/my',
        { params }
      );
      return data;
    },
  });
}

/**
 * Fetch a single application by ID.
 */
export function useApplicationDetail(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.detail(applicationId),
    queryFn: async () => {
      const { data } = await api.get<ApplicationDetailResponse>(
        `/applications/${applicationId}`
      );
      return data.data.application;
    },
    enabled: !!applicationId,
  });
}

/**
 * Fetch timeline events for an application.
 */
export function useApplicationTimeline(applicationId: string) {
  return useQuery({
    queryKey: applicationKeys.timeline(applicationId),
    queryFn: async () => {
      const { data } = await api.get<TimelineResponse>(
        `/applications/${applicationId}/timeline`
      );
      return data.data.timeline;
    },
    enabled: !!applicationId,
  });
}

/**
 * Check if the current user has already applied to a job.
 */
export function useCheckApplication(jobId: string) {
  return useQuery({
    queryKey: applicationKeys.check(jobId),
    queryFn: async () => {
      const { data } = await api.get<CheckApplicationResponse>(
        `/applications/check/${jobId}`
      );
      return data.data;
    },
    enabled: !!jobId,
  });
}

/**
 * Apply to a job.
 */
export function useApplyToJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      jobId: string;
      resumeId: string;
      coverLetter?: string | null;
    }) => {
      const { data } = await api.post<ApplicationDetailResponse>(
        '/applications',
        input
      );
      return data.data.application;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
      queryClient.invalidateQueries({
        queryKey: applicationKeys.check(variables.jobId),
      });
    },
  });
}

/**
 * Withdraw an application.
 */
export function useWithdrawApplication() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (applicationId: string) => {
      const { data } = await api.patch<ApplicationDetailResponse>(
        `/applications/${applicationId}/withdraw`
      );
      return data.data.application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}

// =============================================================================
// ADMIN HOOKS
// =============================================================================

/**
 * Fetch applications for admin review with pagination and filters.
 */
export function useAdminApplications(params?: {
  page?: number;
  limit?: number;
  status?: string;
  jobId?: string;
  candidateId?: string;
  search?: string;
}) {
  return useQuery({
    queryKey: applicationKeys.adminList(params),
    queryFn: async () => {
      const { data } = await api.get<ApplicationListResponse>(
        '/admin/applications',
        { params }
      );
      return data;
    },
  });
}

/**
 * Update application status (admin only).
 */
export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      applicationId,
      status,
      notes,
    }: {
      applicationId: string;
      status: string;
      notes?: string | null;
    }) => {
      const { data } = await api.patch<ApplicationDetailResponse>(
        `/admin/applications/${applicationId}/status`,
        { status, notes }
      );
      return data.data.application;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: applicationKeys.all });
    },
  });
}
