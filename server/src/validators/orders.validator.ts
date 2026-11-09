import { z } from 'zod';

export const orderIdParams = z.object({ id: z.string().uuid() });
export const createOrderBody = z.object({ serviceId: z.string().uuid(), brief: z.string().trim().min(5).max(4000) });
export const orderMessageBody = z.object({ content: z.string().trim().min(1).max(4000) });
export const orderReviewBody = z.object({ rating: z.number().int().min(1).max(5), comment: z.string().trim().max(2000).optional() });
export const orderActionBody = z.object({ action: z.enum(['accept', 'reject', 'start', 'cancel']) });
