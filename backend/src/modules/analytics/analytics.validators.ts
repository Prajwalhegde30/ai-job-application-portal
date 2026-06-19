import { z } from 'zod';

export const applicationTrendQuerySchema = z.object({
  range: z.enum(['7d', '30d', '90d']).default('30d'),
});

export type ApplicationTrendQuery = z.infer<typeof applicationTrendQuerySchema>;
