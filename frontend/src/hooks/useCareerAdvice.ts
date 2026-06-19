'use client';

import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';

// =============================================================================
// Query Keys
// =============================================================================

export const careerAdviceKeys = {
  all: ['career-advice'] as const,
  detail: (applicationId: string) =>
    [...careerAdviceKeys.all, 'detail', applicationId] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface CareerPathItem {
  title: string;
  description: string;
  timeframe: string;
  relevance: 'high' | 'medium' | 'low';
}

export interface SkillRecommendationItem {
  skill: string;
  priority: 'critical' | 'important' | 'nice-to-have';
  reason: string;
  resources: string[];
  estimatedTime: string;
}

export interface ProjectSuggestionItem {
  title: string;
  description: string;
  techStack: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

export interface InterviewTipItem {
  category: string;
  tip: string;
  example: string;
}

export interface SalaryInsightsItem {
  estimatedRange: string;
  marketTrend: string;
  negotiationTips: string[];
}

export interface CareerAdviceReport {
  id: string;
  applicationId: string;
  userId: string;
  resumeId: string;
  jobId: string;
  provider: string;
  careerPaths: CareerPathItem[];
  skillRecommendations: SkillRecommendationItem[];
  projectSuggestions: ProjectSuggestionItem[];
  interviewTips: InterviewTipItem[];
  salaryInsights: SalaryInsightsItem;
  overallSummary: string;
  confidenceScore: number;
  createdAt: string;
  updatedAt: string;
}

interface CareerAdviceResponse {
  success: boolean;
  data: CareerAdviceReport;
}

// =============================================================================
// Hooks — Career Advice
// =============================================================================

/**
 * Fetch career advice for an application.
 */
export function useGetCareerAdvice(applicationId: string) {
  return useQuery({
    queryKey: careerAdviceKeys.detail(applicationId),
    queryFn: async () => {
      const { data } = await api.get<CareerAdviceResponse>(
        `/career-advice/${applicationId}`
      );
      return data.data;
    },
    enabled: !!applicationId,
  });
}
