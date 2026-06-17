import { z } from 'zod';

/**
 * Password validation rules:
 * - Minimum 8 characters
 * - At least one uppercase letter
 * - At least one lowercase letter
 * - At least one digit
 * - At least one special character
 */
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Password must contain at least one digit')
  .regex(
    /[^A-Za-z0-9]/,
    'Password must contain at least one special character'
  );

/**
 * POST /api/v1/auth/register
 * Role is always USER — ADMIN accounts are created through seed data
 * or controlled onboarding only.
 */
export const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'Name must be at least 2 characters')
      .max(255, 'Name must be at most 255 characters')
      .trim(),
    email: z.string().email('Invalid email address').toLowerCase().trim(),
    password: passwordSchema,
  })
  .strict();

/**
 * POST /api/v1/auth/login
 */
export const loginSchema = z.object({
  email: z.string().email('Invalid email address').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

/**
 * POST /api/v1/auth/refresh
 * Refresh token is read from HTTP-only cookie, but we validate
 * the cookie value presence in the controller.
 */
export const refreshSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

/**
 * POST /api/v1/auth/logout
 * Refresh token is read from HTTP-only cookie.
 */
export const logoutSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
