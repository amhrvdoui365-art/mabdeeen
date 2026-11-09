import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

export const parentLinkRequestSchema = z.object({ childEmail: z.string().trim().email().max(255) });
export const parentLinkResponseSchema = z.object({ linkId: z.string().uuid(), status: z.enum(['APPROVED', 'REJECTED']) });
export const legacyChatAccessApprovalSchema = z.object({ linkId: z.string().uuid() });
export const parentChildParamsSchema = z.object({ childId: z.string().uuid() });
export const parentChildDisplaySchema = z.object({
  displayName: z.string().trim().max(80).transform((value) => value ? sanitizePlainText(value) : null).optional(),
});
export const parentChildMessagesParamsSchema = z.object({ childId: z.string().uuid(), peerId: z.string().uuid() });
export const parentChildAttachmentParamsSchema = z.object({ childId: z.string().uuid(), messageId: z.string().uuid() });
export const parentVerificationStartSchema = z.object({ email: z.string().trim().email().max(255).transform((value) => sanitizePlainText(value).toLowerCase()) });
export const parentVerificationTokenSchema = z.object({ token: z.string().regex(/^[a-f0-9-]{60,80}$/i) });
export const parentVerificationAnswerSchema = z.object({ answer: z.coerce.number().int().min(0).max(144) });
export const parentVerificationReviewSchema = z.object({ approve: z.boolean() });
export type ParentLinkRequestInput = z.infer<typeof parentLinkRequestSchema>;
