import { z } from 'zod';
import { sanitizePlainText } from '../utils/sanitize';

const optionalText = (min: number, max: number, message: string) =>
  z.preprocess(
    (value) => (typeof value === 'string' && value.trim() === '' ? undefined : value),
    z.string().trim().min(min, message).max(max).optional(),
  );

export const registerSchema = z
  .object({
    name: z
      .string({ error: 'الاسم مطلوب' })
      .trim()
      .min(2, 'الاسم يجب أن يكون حرفين على الأقل')
      .max(100, 'الاسم طويل جداً'),
    email: z
      .string({ error: 'البريد الإلكتروني مطلوب' })
      .trim()
      .email('البريد الإلكتروني غير صالح')
      .max(255, 'البريد الإلكتروني طويل جداً'),
    password: z
      .string({ error: 'كلمة المرور مطلوبة' })
      .min(8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل')
      .refine(
        (value) => Buffer.byteLength(value, 'utf8') <= 72,
        'كلمة المرور طويلة جداً',
      ),
    accountType: z
      .enum(['Freelancer', 'Buyer', 'Parent'], {
        error: (issue) => issue.input === undefined ? 'نوع الحساب مطلوب' : 'نوع الحساب غير صالح',
      })
      .default('Freelancer'),
    title: optionalText(2, 120, 'المسمى الوظيفي قصير جداً'),
    location: optionalText(1, 120, 'المحافظة مطلوبة'),
  })
  .superRefine((value, context) => {
    if (value.accountType !== 'Freelancer') {
      return;
    }

    if (!value.title) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['title'],
        message: 'المسمى الوظيفي مطلوب',
      });
    }

    if (!value.location) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['location'],
        message: 'المحافظة مطلوبة',
      });
    }
  });

export const loginSchema = z.object({
  email: z
    .string({ error: 'البريد الإلكتروني مطلوب' })
    .trim()
    .email('البريد الإلكتروني غير صالح'),
  password: z
    .string({ error: 'كلمة المرور مطلوبة' })
    .min(1, 'كلمة المرور مطلوبة'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(120),
  newPassword: z.string().min(8, 'كلمة المرور الجديدة يجب ألا تقل عن 8 أحرف').max(120)
    .refine((value) => Buffer.byteLength(value, 'utf8') <= 72, 'كلمة المرور طويلة جداً'),
  confirmPassword: z.string().min(1),
}).refine((value) => value.newPassword === value.confirmPassword, {
  path: ['confirmPassword'], message: 'تأكيد كلمة المرور غير مطابق.',
});

const googleProfileNameSchema = z.string().trim().min(2).max(100)
  .transform(sanitizePlainText).pipe(z.string().min(2).max(100));

export const googleProfileCompletionSchema = z.object({
  name: googleProfileNameSchema,
  accountType: z.enum(['Freelancer', 'Buyer', 'Parent']),
  title: z.string().trim().max(120).transform(sanitizePlainText).optional(),
  location: z.string().trim().max(120).transform(sanitizePlainText).optional(),
}).superRefine((value, context) => {
  if (value.accountType === 'Freelancer') {
    if (!value.title || value.title.length < 2) context.addIssue({ code: 'custom', path: ['title'], message: 'المسمى الوظيفي مطلوب للمستقل' });
    if (!value.location || value.location.length < 2) context.addIssue({ code: 'custom', path: ['location'], message: 'الموقع مطلوب للمستقل' });
  }
});

export const googleCredentialSchema = z.object({
  credential: z.string().min(100).max(12_000),
  accountType: z.enum(['Freelancer', 'Buyer', 'Parent']).optional(),
});

export const demoLoginParamsSchema = z.object({
  role: z.enum(['Freelancer', 'Buyer', 'Parent', 'Admin']),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type GoogleProfileCompletionInput = z.infer<typeof googleProfileCompletionSchema>;
