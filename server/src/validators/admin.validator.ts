import { z } from 'zod';
import {
  adminPaginationSchema,
  emptyStringToUndefined,
  flexibleDateTimeSchema,
  optionalStringQuerySchema,
} from './common.validator';
import { booleanQuerySchema, updateProfileShape } from './freelancer.validator';

export const adminUsersQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
  role: z.preprocess(
    emptyStringToUndefined,
    z.enum(['Freelancer', 'Buyer', 'Parent', 'Admin']).optional(),
  ),
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['active', 'inactive']).optional(),
  ),
  featured: booleanQuerySchema,
  verified: booleanQuerySchema,
});

export const adminReportsQuerySchema = adminPaginationSchema.extend({
  status: z.preprocess(
    emptyStringToUndefined,
    z.enum(['Pending', 'Resolved']).optional(),
  ),
});

export const adminReviewsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminConversationsQuerySchema = adminPaginationSchema.extend({
  q: optionalStringQuerySchema(100),
});

export const adminConversationMessagesParamsSchema = z.object({
  participantAId: z.string().uuid(),
  participantBId: z.string().uuid(),
}).refine((params) => params.participantAId !== params.participantBId, {
  message: 'Conversation participants must be different',
});

export const adminConversationMessagesQuerySchema = z.object({
  serviceId: z.string().uuid().optional(),
  reason: z.string().trim().min(5).max(300),
});

export const adminAuditQuerySchema = adminPaginationSchema;

export const updateUserStatusSchema = z.object({
  isActive: z.boolean({ error: 'حالة الحساب مطلوبة' }),
});

export const updateUserFeaturedSchema = z.object({
  isFeatured: z.boolean({ error: 'حالة التمييز مطلوبة' }),
  featuredUntil: flexibleDateTimeSchema,
});

export const updateUserVerifiedSchema = z.object({
  isVerified: z.boolean({ error: 'حالة التوثيق مطلوبة' }),
});

export const updateUserDemoAccountSchema = z.object({
  isDemoAccount: z.boolean({ error: 'حالة حساب العرض مطلوبة' }),
});

export const manageUserSchema = z
  .object({
    ...updateProfileShape,
    avgResponseHours: z.preprocess(
      (value) => (value === '' ? null : value),
      z.number({ error: 'المتوسط بالساعات يجب أن يكون رقماً' }).min(0).max(168).nullable().optional(),
    ),
  })
  .refine((data) => Object.keys(data).length > 0, { message: 'لا توجد بيانات للتحديث' });

export const adminSetPasswordSchema = z.object({
  password: z
    .string({ error: 'كلمة المرور مطلوبة' })
    .min(12, 'كلمة المرور يجب أن تكون 12 حرفاً على الأقل')
    .max(120, 'كلمة المرور طويلة جداً'),
});

export const updateReportSchema = z.object({
  status: z.enum(['Pending', 'Resolved'], {
    error: 'حالة البلاغ مطلوبة',
  }),
});

export type AdminUsersQueryInput = z.infer<typeof adminUsersQuerySchema>;
export type AdminReportsQueryInput = z.infer<typeof adminReportsQuerySchema>;
export type AdminReviewsQueryInput = z.infer<typeof adminReviewsQuerySchema>;
export type AdminConversationsQueryInput = z.infer<typeof adminConversationsQuerySchema>;
export type AdminConversationMessagesParamsInput = z.infer<typeof adminConversationMessagesParamsSchema>;
export type AdminConversationMessagesQueryInput = z.infer<typeof adminConversationMessagesQuerySchema>;
export type UpdateUserFeaturedInput = z.infer<typeof updateUserFeaturedSchema>;
export type ManageUserInput = z.infer<typeof manageUserSchema>;
