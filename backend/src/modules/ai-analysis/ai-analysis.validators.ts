import { z } from 'zod';

export const resumeIdParamSchema = z.object({
  resumeId: z.string().uuid('Invalid resume ID format'),
});
