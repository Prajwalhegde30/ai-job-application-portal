import {
  ExtractedSkill,
  ExtractedEducation,
  ExtractedExperience,
  ExtractedProject,
  ExtractedCertification,
} from '../../types/models';

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

export interface ResumeAnalysisResult {
  score: number;
  categoryScores: CategoryScores;
  strengths: string[];
  weaknesses: string[];
  suggestions: string[];
  extractedSkills: ExtractedSkill[];
  extractedEducation: ExtractedEducation[];
  extractedExperience: ExtractedExperience[];
  extractedProjects: ExtractedProject[];
  extractedCertifications: ExtractedCertification[];
  contactInfo: ContactInformation;
}
