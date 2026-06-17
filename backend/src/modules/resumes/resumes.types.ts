import { Resume } from '../../types/models';

export type ResumeRow = Resume;

export interface ResumeFilters {
  userId: string;
}

export interface UploadResumeParams {
  userId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  buffer: Buffer;
  resumeTitle: string;
}
