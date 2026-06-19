export interface JobRequirements {
  skills: string[];
  certifications: string[];
  experienceYears: number;
  educationDegrees: string[];
}

export interface MatchCategoryScores {
  skills: number; // Max 40
  experience: number; // Max 25
  education: number; // Max 15
  certifications: number; // Max 10
  projects: number; // Max 10
}

export interface MatchAnalysisResult {
  matchScore: number;
  categoryScores: MatchCategoryScores;
  matchedSkills: string[];
  missingSkills: string[];
  additionalSkills: string[];
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}
