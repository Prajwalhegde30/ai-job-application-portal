'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// =============================================================================
// Query Keys
// =============================================================================

export const matchAnalysisKeys = {
  all: ['match-analysis'] as const,
  detail: (applicationId: string) =>
    [...matchAnalysisKeys.all, 'detail', applicationId] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface MatchCategoryScores {
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  projects: number;
}

export interface MatchAnalysisReport {
  id: string;
  applicationId: string;
  userId: string;
  resumeId: string;
  jobId: string;
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
  categoryScores: MatchCategoryScores;
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
  createdAt: string;
  updatedAt: string;
}

interface MatchAnalysisResponse {
  success: boolean;
  data: MatchAnalysisReport;
}

// =============================================================================
// Hooks — Resume Job Matching
// =============================================================================

/**
 * Fetch the Match Analysis scorecard for an application.
 */
export function useGetMatchAnalysis(applicationId: string) {
  return useQuery({
    queryKey: matchAnalysisKeys.detail(applicationId),
    queryFn: async () => {
      const { data } = await api.get<MatchAnalysisResponse>(
        `/match-analysis/${applicationId}`
      );
      return data.data;
    },
    enabled: !!applicationId,
  });
}
