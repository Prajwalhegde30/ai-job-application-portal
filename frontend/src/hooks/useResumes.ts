'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import type { ResumeResponse } from '@/lib/validators/resume';

// =============================================================================
// Query Keys
// =============================================================================

export const resumeKeys = {
  all: ['resumes'] as const,
  list: () => [...resumeKeys.all, 'list'] as const,
  detail: (id: string) => [...resumeKeys.all, 'detail', id] as const,
};

// =============================================================================
// Types
// =============================================================================

interface ResumeListResponse {
  success: boolean;
  data: { resumes: ResumeResponse[] };
}

interface ResumeDetailResponse {
  success: boolean;
  data: { resume: ResumeResponse };
}

interface SignedUrlResponse {
  success: boolean;
  data: { signedUrl: string };
}

// =============================================================================
// Hooks — Resumes Management
// =============================================================================

/**
 * Fetch all resumes for the current user.
 */
export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.list(),
    queryFn: async () => {
      const { data } = await api.get<ResumeListResponse>('/resumes');
      return data.data.resumes;
    },
  });
}

/**
 * Fetch a signed download URL for a specific resume.
 */
export function useResumeUrl(resumeId: string) {
  return useQuery({
    queryKey: resumeKeys.detail(resumeId),
    queryFn: async () => {
      const { data } = await api.get<SignedUrlResponse>(`/resumes/${resumeId}`);
      return data.data.signedUrl;
    },
    enabled: !!resumeId,
  });
}

/**
 * Upload a new resume.
 * Accepts a FormData instance and optional onProgress callback.
 */
export function useUploadResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      formData,
      onProgress,
    }: {
      formData: FormData;
      onProgress?: (progress: number) => void;
    }) => {
      const { data } = await api.post<ResumeDetailResponse>(
        '/resumes',
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(progress);
            }
          },
        }
      );
      return data.data.resume;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      await queryClient.refetchQueries({ queryKey: resumeKeys.list() });
    },
  });
}

/**
 * Activate a resume (deactivates others).
 */
export function useActivateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const { data } = await api.patch<ResumeDetailResponse>(
        `/resumes/${resumeId}/activate`
      );
      return data.data.resume;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      await queryClient.refetchQueries({ queryKey: resumeKeys.list() });
    },
  });
}

/**
 * Replace an existing resume file.
 * Accepts a resumeId, FormData instance, and optional onProgress callback.
 */
export function useReplaceResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resumeId,
      formData,
      onProgress,
    }: {
      resumeId: string;
      formData: FormData;
      onProgress?: (progress: number) => void;
    }) => {
      const { data } = await api.put<ResumeDetailResponse>(
        `/resumes/${resumeId}`,
        formData,
        {
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total && onProgress) {
              const progress = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              onProgress(progress);
            }
          },
        }
      );
      return data.data.resume;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      await queryClient.refetchQueries({ queryKey: resumeKeys.list() });
    },
  });
}

/**
 * Delete a resume.
 */
export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      await api.delete(`/resumes/${resumeId}`);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: resumeKeys.all });
      await queryClient.refetchQueries({ queryKey: resumeKeys.list() });
    },
  });
}
