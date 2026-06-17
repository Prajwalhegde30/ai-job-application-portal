import { z } from 'zod';

/**
 * Experience entry schema — matches PROJECT.md JSONB definition.
 */
const experienceEntrySchema = z
  .object({
    company: z
      .string()
      .min(1, 'Company name is required')
      .max(255, 'Company name must be at most 255 characters')
      .trim(),
    title: z
      .string()
      .min(1, 'Job title is required')
      .max(255, 'Job title must be at most 255 characters')
      .trim(),
    startDate: z
      .string()
      .min(1, 'Start date is required')
      .max(20, 'Start date must be at most 20 characters')
      .trim(),
    endDate: z
      .string()
      .max(20, 'End date must be at most 20 characters')
      .trim()
      .default(''),
    current: z.boolean().default(false),
    description: z
      .string()
      .max(2000, 'Description must be at most 2000 characters')
      .trim()
      .default(''),
  })
  .strict();

/**
 * Education entry schema — matches PROJECT.md JSONB definition.
 */
const educationEntrySchema = z
  .object({
    institution: z
      .string()
      .min(1, 'Institution is required')
      .max(255, 'Institution must be at most 255 characters')
      .trim(),
    degree: z
      .string()
      .min(1, 'Degree is required')
      .max(255, 'Degree must be at most 255 characters')
      .trim(),
    field: z
      .string()
      .min(1, 'Field of study is required')
      .max(255, 'Field must be at most 255 characters')
      .trim(),
    startYear: z
      .number()
      .int('Start year must be an integer')
      .min(1950, 'Start year must be 1950 or later')
      .max(2100, 'Start year must be 2100 or earlier'),
    endYear: z
      .number()
      .int('End year must be an integer')
      .min(1950, 'End year must be 1950 or later')
      .max(2100, 'End year must be 2100 or earlier')
      .nullable()
      .default(null),
  })
  .strict();

/**
 * URL validation helper — accepts empty string or valid http(s) URL.
 */
const optionalUrl = z
  .string()
  .max(500, 'URL must be at most 500 characters')
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return url.protocol === 'http:' || url.protocol === 'https:';
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid URL (http or https)' }
  )
  .transform((val) => val || null)
  .optional();

/**
 * LinkedIn URL — must contain linkedin.com if provided.
 */
const linkedinUrl = z
  .string()
  .max(500, 'LinkedIn URL must be at most 500 characters')
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return (
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          url.hostname.includes('linkedin.com')
        );
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid LinkedIn URL' }
  )
  .transform((val) => val || null)
  .optional();

/**
 * GitHub URL — must contain github.com if provided.
 */
const githubUrl = z
  .string()
  .max(500, 'GitHub URL must be at most 500 characters')
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      try {
        const url = new URL(val);
        return (
          (url.protocol === 'http:' || url.protocol === 'https:') &&
          url.hostname.includes('github.com')
        );
      } catch {
        return false;
      }
    },
    { message: 'Must be a valid GitHub URL' }
  )
  .transform((val) => val || null)
  .optional();

/**
 * Phone number validation — flexible international format.
 */
const phoneSchema = z
  .string()
  .max(30, 'Phone number must be at most 30 characters')
  .trim()
  .refine(
    (val) => {
      if (!val || val === '') return true;
      return /^\+?[\d\s\-().]{7,20}$/.test(val);
    },
    { message: 'Must be a valid phone number' }
  )
  .transform((val) => val || null)
  .optional();

/**
 * PUT /api/v1/profile
 * All fields are optional — only provided fields are updated.
 */
export const updateProfileSchema = z.object({
  headline: z
    .string()
    .max(255, 'Headline must be at most 255 characters')
    .trim()
    .transform((val) => val || null)
    .optional(),
  bio: z
    .string()
    .max(2000, 'Bio must be at most 2000 characters')
    .trim()
    .transform((val) => val || null)
    .optional(),
  location: z
    .string()
    .max(255, 'Location must be at most 255 characters')
    .trim()
    .transform((val) => val || null)
    .optional(),
  phone: phoneSchema,
  website: optionalUrl,
  linkedin_url: linkedinUrl,
  github_url: githubUrl,
  skills: z
    .array(
      z
        .string()
        .min(1, 'Skill cannot be empty')
        .max(50, 'Each skill must be at most 50 characters')
        .trim()
    )
    .max(50, 'Maximum 50 skills allowed')
    .transform((arr) => [...new Set(arr)]) // Deduplicate
    .optional(),
  experience: z
    .array(experienceEntrySchema)
    .max(20, 'Maximum 20 experience entries')
    .optional(),
  education: z
    .array(educationEntrySchema)
    .max(20, 'Maximum 20 education entries')
    .optional(),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
