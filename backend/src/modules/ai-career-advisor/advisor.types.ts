/**
 * Career Advisor Module Types
 * Module-specific types for the career advice API responses.
 */

/** Career advice API response (camelCase mapped from DB row) */
export interface CareerAdviceResponse {
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

export interface CareerPathItem {
  title: string;
  description: string;
  timeframe: string;
  relevance: string;
}

export interface SkillRecommendationItem {
  skill: string;
  priority: string;
  reason: string;
  resources: string[];
  estimatedTime: string;
}

export interface ProjectSuggestionItem {
  title: string;
  description: string;
  techStack: string[];
  difficulty: string;
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
