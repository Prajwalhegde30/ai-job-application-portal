import { z } from 'zod';

/**
 * Validator schema for paginated notifications retrieval.
 */
export const listNotificationsSchema = z.object({
  page: z.coerce
    .number()
    .int({ message: 'Page must be an integer' })
    .min(1, { message: 'Page must be at least 1' })
    .default(1),
  limit: z.coerce
    .number()
    .int({ message: 'Limit must be an integer' })
    .min(1, { message: 'Limit must be at least 1' })
    .max(100, { message: 'Limit cannot exceed 100' })
    .default(10),
});

export type ListNotificationsInput = z.infer<typeof listNotificationsSchema>;
export type NotificationIdParam = { notificationId: string };
