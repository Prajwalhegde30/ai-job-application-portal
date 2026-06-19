import { z } from 'zod';

/**
 * Validates applicationId route parameter as UUID.
 */
export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid('applicationId must be a valid UUID'),
});
