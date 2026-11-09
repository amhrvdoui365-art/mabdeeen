import { z } from 'zod';

export const deliveryProjectQuerySchema = z.object({
  projectId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.projectId || value.orderId));

export const createDeliverySchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
}).refine((value) => Boolean(value.orderId || (value.projectId && value.clientId)));

export const createDeliveryLinkSchema = z.object({
  projectId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  orderId: z.string().uuid().optional(),
  url: z.string().url().max(2048),
  title: z.string().trim().min(1).max(140),
}).refine((value) => Boolean(value.orderId || (value.projectId && value.clientId)));

export const redeemRewardSchema = z.object({
  rewardCode: z.enum(['premium_badge', 'verified_week', 'featured_week']),
  serviceId: z.string().uuid().optional(),
});

export const claimMilestoneSchema = z.object({ milestone: z.union([z.literal(100), z.literal(200), z.literal(250), z.literal(500), z.literal(1000), z.literal(2500)]) });
