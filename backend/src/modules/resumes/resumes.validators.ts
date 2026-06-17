import { z } from 'zod';

export const uploadResumeSchema = z.object({
  resumeTitle: z
    .string()
    .min(1, 'Resume title is required')
    .max(255, 'Resume title must be at most 255 characters')
    .trim(),
});

export const updateResumeSchema = z.object({
  resumeTitle: z
    .string()
    .min(1, 'Resume title is required')
    .max(255, 'Resume title must be at most 255 characters')
    .trim()
    .optional(),
});

export type UploadResumeInput = z.infer<typeof uploadResumeSchema>;
export type UpdateResumeInput = z.infer<typeof updateResumeSchema>;
