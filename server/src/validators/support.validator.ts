import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

export const supportTicketParamsSchema = z.object({ id: z.string().uuid() });
export const supportMessageParamsSchema = z.object({ id: z.string().uuid(), messageId: z.string().uuid() });
export const supportTicketCreateSchema = z.object({
  subject: z.string().trim().min(3).max(120).transform(sanitizePlainText),
  message: z.string().trim().max(4000).transform(sanitizePlainText).optional().default(''),
});
export const supportMessageSchema = z.object({
  message: z.string().trim().max(4000).transform(sanitizePlainText).optional().default(''),
});
export const supportTicketStatusSchema = z.object({ status: z.enum(['OPEN', 'CLOSED']) });
