import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

export const createNotificationSchema = z.object({
  title: z.string().trim().transform(sanitizePlainText).pipe(z.string().min(3).max(120)),
  message: z.string().trim().transform(sanitizePlainText).pipe(z.string().min(3).max(1000)),
});

export const updateNotificationSchema = z.object({
  isActive: z.boolean(),
});

export type CreateNotificationInput = z.infer<typeof createNotificationSchema>;
