import { z } from 'zod';

export const adminWipePlatformSchema = z.object({
  confirmation: z.literal('DELETE ALL PLATFORM DATA'),
});
import { adminPaginationSchema, optionalStringQuerySchema } from './common.validator';

export const adminOrdersQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(120),
  status: z.enum(['requested', 'accepted', 'rejected', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled']).optional(),
});
export const adminServicesQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(120), status: z.enum(['active', 'inactive']).optional(),
});
export const adminOrderStatusSchema = z.object({ status: z.enum(['cancelled', 'rejected']), reason: z.string().trim().min(5).max(300) });
export const adminOrderCaseSchema = z.object({ reason: z.string().trim().min(5).max(2000) });
export const adminOrderCaseResolutionSchema = z.object({ resolution: z.string().trim().min(5).max(2000) });
export const adminServiceStatusSchema = z.object({ status: z.enum(['active', 'inactive']), reason: z.string().trim().min(5).max(300) });
export const adminPointsQuerySchema = adminPaginationSchema.extend({ q: optionalStringQuerySchema(120) });
export const adminPointsAdjustmentSchema = z.object({ amount: z.number().int().min(-1_000_000).max(1_000_000).refine((value) => value !== 0), reason: z.string().trim().min(5).max(300) });
export const adminRewardSettingsSchema = z.object({ deliveryPoints: z.number().int().min(1).max(100_000), rewards: z.array(z.object({ code: z.enum(['premium_badge', 'featured_week', 'verified_week']), cost: z.number().int().min(1).max(100_000) })).length(3) });
export const adminArticleSchema = z.object({
  title: z.string().trim().min(3).max(180), slug: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().min(10).max(500), content: z.string().trim().min(30).max(30_000),
  coverImage: z.string().trim().min(1).max(2048), category: z.string().trim().min(2).max(80),
  readTime: z.number().int().min(1).max(120),
});
export const adminExportEntitySchema = z.object({ entity: z.enum(['users', 'services', 'orders', 'points', 'articles', 'reports']) });
