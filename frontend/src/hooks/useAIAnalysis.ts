'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';

// =============================================================================
// Query Keys
// =============================================================================

export const aiAnalysisKeys = {
  all: ['ai-analysis'] as const,
  detail: (resumeId: string) =>
    [...aiAnalysisKeys.all, 'detail', resumeId] as const,
};

// =============================================================================
// Types
// =============================================================================

export interface ExtractedSkill {
  name: string;
  category: 'Language' | 'Framework' | 'Database' | 'Cloud' | 'Tool' | 'Other';
}

export interface ExtractedEducation {
  degree?: string;
  university?: string;
  graduationYear?: number;
  gpa?: number;
}

export interface ExtractedExperience {
  company?: string;
  role?: string;
  duration?: string;
  achievements?: string[];
}

export interface ExtractedProject {
  projectName?: string;
  techStack?: string[];
  description?: string;
  githubLink?: string;
}

export interface ExtractedCertification {
  name: string;
  provider?: string;
  date?: string;
}

export interface ContactInformation {
  email?: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  portfolio?: string;
}

export interface CategoryScores {
  education: number;
  experience: number;
  projects: number;
  skills: number;
  certifications: number;
  contact: number;
}

export interface AIAnalysisReport {
  id: string;
  resumeId: string;
  userId: string;
  analysisType: 'RESUME_EXTRACT';
  score: number;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  extractedSkills: ExtractedSkill[];
  extractedEducation: ExtractedEducation[];
  extractedExperience: ExtractedExperience[];
  extractedProjects: ExtractedProject[];
  extractedCertifications: ExtractedCertification[];
  contactInfo: ContactInformation;
  categoryScores: CategoryScores;
  createdAt: string;
  updatedAt: string;
}

interface AIAnalysisResponse {
  success: boolean;
  data: AIAnalysisReport;
}

// =============================================================================
// Hooks — AI Resume Analysis
// =============================================================================

/**
 * Fetch the AI analysis report for a specific resume.
 */
export function useGetAnalysis(resumeId: string) {
  return useQuery({
    queryKey: aiAnalysisKeys.detail(resumeId),
    queryFn: async () => {
      const { data } = await api.get<AIAnalysisResponse>(
        `/ai-analysis/${resumeId}`
      );
      return data.data;
    },
    enabled: !!resumeId,
  });
}

/**
 * Manually trigger (re-)analysis of a resume.
 */
export function useAnalyzeResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resumeId: string) => {
      const { data } = await api.post<AIAnalysisResponse>(
        `/ai-analysis/${resumeId}/analyze`
      );
      return data.data;
    },
    onSuccess: (_, resumeId) => {
      queryClient.invalidateQueries({
        queryKey: aiAnalysisKeys.detail(resumeId),
      });
    },
  });
}
