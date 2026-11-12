import bcrypt from 'bcrypt';
import { randomBytes } from 'node:crypto';
import {
  createAccount,
  completeGoogleProfileForUser,
  findUserByEmail,
  findUserById,
  setOwnPassword,
  updateIncompleteOAuthAccountType,
  toPublicUser,
  type UserRow,
} from '../models/user.model';
import { AppError } from '../utils/app-error';
import { signToken } from '../utils/jwt';
import { env } from '../config/env';
import type { UserRole } from '../types/auth';
import type { GoogleProfileCompletionInput, LoginInput, RegisterInput } from '../validators/auth.validator';

const BCRYPT_ROUNDS = 12;

const isUniqueViolation = (error: unknown): boolean => {
  if (!(error instanceof Error)) {
    return false;
  }

  return (
    error.message.includes('UNIQUE constraint failed') &&
    error.message.includes('users.email')
  );
};

const buildAuthResult = (user: UserRow, isDemo = false) => {
  return {
    user: { ...toPublicUser(user), ...(isDemo ? { isDemo: true } : {}) },
    token: signToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(isDemo ? { demo: true } : {}),
    }, isDemo ? '2h' : undefined),
  };
};

const demoAccountIds: Record<UserRole, string | undefined> = {
  Freelancer: env.DEMO_FREELANCER_USER_ID,
  Buyer: env.DEMO_BUYER_USER_ID,
  Parent: env.DEMO_PARENT_USER_ID,
  Admin: env.DEMO_ADMIN_USER_ID,
};

export const getDemoLoginOptions = async () => {
  const roles = Object.keys(demoAccountIds) as UserRole[];
  if (env.DEMO_MODE_ENABLED !== 'true' || roles.some((role) => !demoAccountIds[role])) return { enabled: false };

  const accounts = await Promise.all(roles.map(async (role) => {
    const userId = demoAccountIds[role]!;
    const user = await findUserById(userId);
    return Boolean(user && user.role === role && user.is_active && user.profile_complete && user.account_status === 'ACTIVE');
  }));
  return { enabled: accounts.every(Boolean) };
};

export const loginDemo = async (role: UserRole) => {
  if (!(await getDemoLoginOptions()).enabled) {
    throw new AppError('الدخول التجريبي غير مفعّل أو لم تُجهّز حساباته بعد.', 503);
  }

  const userId = demoAccountIds[role];
  const user = userId ? await findUserById(userId) : null;
  if (!user || user.role !== role || !user.is_active || !user.profile_complete || user.account_status !== 'ACTIVE') {
    throw new AppError('حساب العرض غير جاهز لهذا الدور. راجع إعدادات حسابات Demo.', 503);
  }

  return buildAuthResult(user, true);
};

export const registerAccount = async (input: RegisterInput) => {
  const email = input.email.toLowerCase();

  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    throw new AppError('البريد الإلكتروني مسجل بالفعل', 409);
  }

  const passwordHash = await bcrypt.hash(input.password, BCRYPT_ROUNDS);

  try {
    const user = await createAccount({
      name: input.name,
      email,
      passwordHash,
      role: input.accountType,
      title: input.title ?? null,
      location: input.location ?? null,
      bio: null,
    });

    return buildAuthResult(user);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new AppError('البريد الإلكتروني مسجل بالفعل', 409);
    }

    throw error;
  }
};

export const login = async (input: LoginInput) => {
  const email = input.email.toLowerCase();
  const user = await findUserByEmail(email);

  if (!user) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  const passwordMatches = await bcrypt.compare(input.password, user.password_hash);

  if (!passwordMatches) {
    throw new AppError('البريد الإلكتروني أو كلمة المرور غير صحيحة', 401);
  }

  if (!user.is_active && user.account_status !== 'REJECTED') {
    throw new AppError('تم تجميد هذا الحساب، يرجى التواصل مع الإدارة', 403);
  }

  return buildAuthResult(user);
};

export const changeOwnPassword = async (userId: string, currentPassword: string, newPassword: string) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError('الحساب غير موجود.', 404);
  if (!await bcrypt.compare(currentPassword, user.password_hash)) {
    throw new AppError('كلمة المرور الحالية غير صحيحة.', 400);
  }
  if (await bcrypt.compare(newPassword, user.password_hash)) {
    throw new AppError('اختر كلمة مرور مختلفة عن الحالية.', 400);
  }
  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  if (!setOwnPassword(userId, passwordHash, new Date().toISOString())) {
    throw new AppError('تعذر تحديث كلمة المرور.', 500);
  }
  return { changed: true, sessionsRevoked: true };
};

export const loginWithOAuth = async (
  emailInput: string,
  nameInput: string,
  accountType?: 'Freelancer' | 'Buyer' | 'Parent',
) => {
  const email = emailInput.trim().toLowerCase();
  const existingUser = await findUserByEmail(email);

  if (existingUser) {
    if (!existingUser.is_active) {
      throw new AppError('هذا الحساب موقوف، يرجى التواصل مع الإدارة', 403);
    }

    if (accountType && !existingUser.profile_complete && existingUser.role !== accountType) {
      const updatedUser = updateIncompleteOAuthAccountType(existingUser.id, accountType);
      if (updatedUser) return buildAuthResult(updatedUser);
    }

    return buildAuthResult(existingUser);
  }

  const safeName = nameInput.trim().slice(0, 100) || email.split('@')[0] || 'Google User';
  const passwordHash = await bcrypt.hash(randomBytes(48).toString('base64url'), BCRYPT_ROUNDS);

  try {
    const user = await createAccount({
      name: safeName.length >= 2 ? safeName : `${safeName} User`,
      email,
      passwordHash,
      role: accountType ?? 'Freelancer',
      title: null,
      location: null,
      bio: null,
      profileComplete: false,
    });
    return buildAuthResult(user);
  } catch (error) {
    if (!isUniqueViolation(error)) throw error;

    // A second callback may have created the same verified Google account.
    const racedUser = await findUserByEmail(email);
    if (!racedUser) throw error;
    if (!racedUser.is_active) throw new AppError('هذا الحساب موقوف، يرجى التواصل مع الإدارة', 403);
    if (accountType && !racedUser.profile_complete && racedUser.role !== accountType) {
      const updatedUser = updateIncompleteOAuthAccountType(racedUser.id, accountType);
      if (updatedUser) return buildAuthResult(updatedUser);
    }
    return buildAuthResult(racedUser);
  }
};

export const loginWithGoogle = loginWithOAuth;

export const completeGoogleProfile = async (userId: string, input: GoogleProfileCompletionInput) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError('الحساب غير موجود', 404);
  if (user.profile_complete) throw new AppError('تم إكمال بيانات الحساب بالفعل', 409);

  const updatedUser = completeGoogleProfileForUser(userId, {
    name: input.name,
    role: input.accountType,
    title: input.accountType === 'Freelancer' ? input.title?.trim() || null : null,
    location: input.accountType === 'Freelancer' ? input.location?.trim() || null : null,
  });
  if (!updatedUser) throw new AppError('تعذر حفظ بيانات الحساب', 500);
  return toPublicUser(updatedUser);
};

export const getCurrentUser = async (userId: string) => {
  const user = await findUserById(userId);

  if (!user) {
    throw new AppError('الحساب غير موجود', 404);
  }

  return toPublicUser(user);
};
