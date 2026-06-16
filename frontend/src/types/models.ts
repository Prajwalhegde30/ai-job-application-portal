/**
 * Frontend model type definitions.
 * Mirrors the database models for type safety.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'USER';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  userId: string;
  headline: string | null;
  bio: string | null;
  location: string | null;
  phone: string | null;
  website: string | null;
  linkedinUrl: string | null;
  githubUrl: string | null;
  skills: string[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  profileCompletion: number;
  createdAt: string;
  updatedAt: string;
}

export interface ExperienceEntry {
  company: string;
  title: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description: string;
}

export interface EducationEntry {
  institution: string;
  degree: string;
  field: string;
  startYear: number;
  endYear: number | null;
}

export interface Job {
  id: string;
  postedBy: string;
  title: string;
  company: string;
  description: string;
  requirements: string;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  jobType: string;
  status: string;
  closedAt: string | null;
  applicationCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Application {
  id: string;
  jobId: string;
  userId: string;
  resumeId: string;
  coverLetter: string | null;
  status: string;
  aiMatchScore: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface Resume {
  id: string;
  userId: string;
  name: string;
  fileUrl: string;
  fileKey: string;
  isDefault: boolean;
  createdAt: string;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  isRead: boolean;
  link: string | null;
  createdAt: string;
}
