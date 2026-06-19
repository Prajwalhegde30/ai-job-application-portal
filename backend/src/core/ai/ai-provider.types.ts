/**
 * AI Provider Types
 * Shared input/output types for all AI providers.
 * These types define the structured data contract — NO raw resume text.
 */

// =============================================================================
// Context — Structured input fed to AI providers
// =============================================================================

/** A single skill with its match status relative to a job */
export interface ContextSkill {
  name: string;
  category: string;
  matched: boolean;
}

/** Candidate education summary */
export interface ContextEducation {
  degree: string;
  university: string;
  graduationYear?: number;
  gpa?: number;
}

/** Candidate experience summary */
export interface ContextExperience {
  company: string;
  role: string;
  duration: string;
  achievements: string[];
}

/** Candidate project summary */
export interface ContextProject {
  name: string;
  techStack: string[];
  description: string;
  hasGithub: boolean;
}

/** Candidate certification summary */
export interface ContextCertification {
  name: string;
  provider: string;
}

/** Match analysis scores from Phase 13 */
export interface ContextMatchScores {
  overall: number;
  skills: number;
  experience: number;
  education: number;
  certifications: number;
  projects: number;
}

/** Job details (sanitized, no full description body) */
export interface ContextJobInfo {
  title: string;
  company: string;
  requiredSkills: string[];
  requiredExperienceYears: number;
  requiredDegree: string;
  requiredCertifications: string[];
}

/**
 * The complete structured context passed to AI providers.
 * Contains ONLY processed intelligence — never raw resume text.
 */
export interface CareerAdviceContext {
  candidateName: string;
  candidateHeadline: string;
  skills: ContextSkill[];
  education: ContextEducation[];
  experience: ContextExperience[];
  projects: ContextProject[];
  certifications: ContextCertification[];
  matchScores: ContextMatchScores;
  matchedSkills: string[];
  missingSkills: string[];
  strengths: string[];
  weaknesses: string[];
  jobInfo: ContextJobInfo;
}

// =============================================================================
// Result — Structured output from AI providers
// =============================================================================

/** A single career path recommendation */
export interface CareerPathEntry {
  title: string;
  description: string;
  timeframe: string;
  relevance: 'high' | 'medium' | 'low';
}

/** A single skill learning recommendation */
export interface SkillRecommendation {
  skill: string;
  priority: 'critical' | 'important' | 'nice-to-have';
  reason: string;
  resources: string[];
  estimatedTime: string;
}

/** A suggested project to build */
export interface ProjectSuggestion {
  title: string;
  description: string;
  techStack: string[];
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedHours: number;
}

/** An interview preparation tip */
export interface InterviewTip {
  category: string;
  tip: string;
  example: string;
}

/** Salary market insights */
export interface SalaryInsights {
  estimatedRange: string;
  marketTrend: string;
  negotiationTips: string[];
}

/** The complete structured advice output from an AI provider */
export interface CareerAdviceResult {
  overallSummary: string;
  confidenceScore: number;
  careerPaths: CareerPathEntry[];
  skillRecommendations: SkillRecommendation[];
  projectSuggestions: ProjectSuggestion[];
  interviewTips: InterviewTip[];
  salaryInsights: SalaryInsights;
}
