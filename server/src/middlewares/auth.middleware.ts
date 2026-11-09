import type { NextFunction, Request, Response } from 'express';
import { findUserById } from '../models/user.model';
import type { UserRole } from '../types/auth';
import { AppError } from '../utils/app-error';
import { asyncHandler } from '../utils/async-handler';
import { verifyToken } from '../utils/jwt';

export const authenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization;

  if (!authorization?.startsWith('Bearer ')) {
    throw new AppError('يجب تسجيل الدخول أولاً', 401);
  }

  const token = authorization.slice(7).trim();

  if (!token) {
    throw new AppError('يجب تسجيل الدخول أولاً', 401);
  }

  let payload;

  try {
    payload = verifyToken(token);
  } catch {
    throw new AppError('الجلسة غير صالحة أو منتهية، يرجى تسجيل الدخول مجدداً', 401);
  }

  const user = await findUserById(payload.sub);
  const isImpersonationSession = Boolean(payload.impersonatedBy);

  if (!user) {
    throw new AppError('الحساب غير موجود', 401);
  }

  const requestPath = req.originalUrl.split('?')[0];
  const isRejectedAccountStatusCheck = user.role === 'Freelancer' && user.account_status === 'REJECTED' && requestPath.endsWith('/auth/me');
  if (!user.is_active && !isRejectedAccountStatusCheck) {
    throw new AppError('تم تجميد هذا الحساب، يرجى التواصل مع الإدارة', 403);
  }

  const isGoogleProfileCompletion = requestPath.endsWith('/auth/google/complete-profile') && !user.profile_complete;
  const allowedForPendingAccount = requestPath.endsWith('/auth/me') ||
    requestPath.endsWith('/parent/verification/start') ||
    requestPath.includes('/support/') ||
    requestPath.endsWith('/realtime/stream') ||
    isGoogleProfileCompletion;
  if (!isImpersonationSession && user.role === 'Freelancer' && user.account_status !== 'ACTIVE' && !allowedForPendingAccount) {
    const message = user.account_status === 'PENDING_ADMIN_REVIEW'
      ? 'أرسل ولي الأمر طلب التوثيق بنجاح. انتظر موافقة الإدارة لتفعيل حسابك.'
      : 'حسابك جديد ويحتاج إلى توثيق ولي الأمر وموافقة الإدارة قبل استخدام المنصة.';
    throw new AppError(message, 403, { code: 'ACCOUNT_VERIFICATION_REQUIRED', accountStatus: user.account_status });
  }

  if (user.token_invalid_before && payload.iat !== undefined) {
    const issuedAtMs = payload.iat * 1000;

    if (issuedAtMs < Date.parse(user.token_invalid_before)) {
      throw new AppError('تم إنهاء هذه الجلسة من الإدارة، يرجى تسجيل الدخول مجدداً', 401);
    }
  }

  const allowedDuringOnboarding = requestPath.endsWith('/auth/me') ||
    requestPath.endsWith('/auth/google/complete-profile') ||
    requestPath.endsWith('/parent/verification/start') ||
    requestPath.includes('/support/') ||
    requestPath.includes('/community/posts');
  if (!isImpersonationSession && !user.profile_complete && !allowedDuringOnboarding) {
    throw new AppError('يجب إكمال بيانات الحساب أولاً', 403, { code: 'PROFILE_INCOMPLETE' });
  }

  req.user = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    ...(payload.impersonatedBy ? { impersonatedBy: payload.impersonatedBy } : {}),
  };

  next();
});

export const optionalAuthenticate = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization?.startsWith('Bearer ')) { next(); return; }

  try {
    const payload = verifyToken(authorization.slice(7).trim());
    const user = await findUserById(payload.sub);
    if (user?.is_active && (!user.token_invalid_before || payload.iat === undefined || payload.iat * 1000 >= Date.parse(user.token_invalid_before))) {
      req.user = { id: user.id, name: user.name, email: user.email, role: user.role };
    }
  } catch {
    // Public pages remain available if a saved optional session has expired.
  }
  next();
});

export const authorize = (...roles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      throw new AppError('يجب تسجيل الدخول أولاً', 401);
    }

    if (!roles.includes(req.user.role)) {
      throw new AppError('ليس لديك صلاحية للوصول إلى هذا المورد', 403);
    }

    next();
  };
};
