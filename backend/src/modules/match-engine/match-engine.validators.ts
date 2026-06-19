import { z } from 'zod';

export const applicationIdParamSchema = z.object({
  applicationId: z.string().uuid('Invalid application ID format'),
});
