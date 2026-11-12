import bcrypt from 'bcrypt';
import {
  deleteManagedUser,
  deleteReview,
  getAdminStats,
  listAdminAuditLogs,
  listAdminConversations,
  readAdminConversation,
  getAdminUserById,
  invalidateUserSessions,
  listAdminReports,
  listAdminReviews,
  listAdminUsers,
  setReportStatus,
  setUserFeatured,
  setUserPassword,
  setUserStatus,
  setUserVerified,
  setUserDemoAccount,
  updateManagedUser,
} from '../models/admin.model';
import { updateFreelancerProfile } from '../models/freelancer.model';
import { findUserById } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { moderateProfileWrite } from './system.service';
import type { ManagedUserFields } from '../models/admin.model';
import type {
  AdminReportsQueryInput,
  AdminReviewsQueryInput,
  AdminConversationsQueryInput,
  AdminUsersQueryInput,
  ManageUserInput,
} from '../validators/admin.validator';
import { createUserNotification } from '../models/notification.model';

const BCRYPT_ROUNDS = 12;

export const getUsers = async (input: AdminUsersQueryInput) => {
  const result = await listAdminUsers(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const updateUserStatus = async (userId: string, isActive: boolean) => {
  const user = await setUserStatus(userId, isActive);

  if (!user) {
    throw new AppError('المستخدم غير موجود أو لا يمكن تعديله', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isActive ? 'تم تفعيل حسابك' : 'تم إيقاف حسابك مؤقتًا',
    isActive ? 'أصبح بإمكانك استخدام المنصة مرة أخرى.' : 'أوقف فريق الإدارة الحساب مؤقتًا. تواصل مع الدعم عند الحاجة.', '/');

  return user;
};

export const updateUserFeatured = async (
  userId: string,
  isFeatured: boolean,
  featuredUntil: string | null = null,
) => {
  const user = await setUserFeatured(userId, isFeatured, featuredUntil);

  if (!user) {
    throw new AppError('المستخدم غير موجود أو لا يمكن تعديله', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isFeatured ? 'أصبح ملفك مميزًا' : 'انتهى تمييز ملفك',
    isFeatured ? 'سيظهر ملفك ضمن الملفات المميزة على المنصة.' : 'لم يعد ملفك ضمن الملفات المميزة.', '/dashboard');

  return user;
};

export const updateUserVerified = async (userId: string, isVerified: boolean) => {
  const user = await setUserVerified(userId, isVerified);

  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  createUserNotification(userId, 'ACCOUNT_STATUS', isVerified ? 'تم توثيق حسابك' : 'تغيّرت حالة توثيق حسابك',
    isVerified ? 'تم اعتماد شارة التوثيق لملفك.' : 'لم تعد شارة التوثيق ظاهرة على ملفك.', '/dashboard');

  return user;
};

export const updateUserDemoAccount = async (userId: string, isDemoAccount: boolean) => {
  const user = await findUserById(userId);
  if (!user) throw new AppError('المستخدم غير موجود', 404);
  if (isDemoAccount && (!user.is_active || !user.profile_complete || user.account_status !== 'ACTIVE')) {
    throw new AppError('يجب أن يكون حساب العرض نشطًا ومكتمل البيانات.', 422);
  }
  const updated = setUserDemoAccount(userId, isDemoAccount);
  if (!updated) throw new AppError('تعذر تحديث حساب العرض. تحقق من أن الحساب نشط ومكتمل.', 422);
  return updated;
};

/** God-mode profile write: sanitised, moderation-scanned, then persisted. */
export const manageUser = async (userId: string, input: ManageUserInput) => {
  const { blockedMessage } = moderateProfileWrite(userId, {
    name: input.name,
    title: input.title,
    bio: input.bio,
    location: input.location,
  });

  if (blockedMessage) {
    throw new AppError(blockedMessage, 422);
  }

  const fields: ManagedUserFields = {
    name: input.name,
    title: input.title,
    bio: input.bio,
    location: input.location,
    minBudget: input.minBudget,
    hourlyRate: input.hourlyRate,
    avatarUrl: input.avatarUrl,
    avgResponseHours: input.avgResponseHours,
  };

  const user = await updateManagedUser(userId, fields);

  if (!user) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (input.skillIds !== undefined) {
    await updateFreelancerProfile(userId, { skillIds: input.skillIds });
  }

  if (input.isAvailable !== undefined) {
    await updateFreelancerProfile(userId, { isAvailable: input.isAvailable });
  }

  const updated = getAdminUserById(userId);

  if (!updated) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  return updated;
};

export const resetUserPassword = async (userId: string, password: string) => {
  const existing = await findUserById(userId);

  if (!existing) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin') {
    throw new AppError('لا يمكن تغيير كلمة مرور حساب إدارة من هنا', 403);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const updated = await setUserPassword(userId, passwordHash);

  if (!updated) {
    throw new AppError('تعذر تحديث كلمة المرور', 500);
  }

  invalidateUserSessions(userId, new Date().toISOString());

  return { changed: true };
};

export const removeManagedUser = async (userId: string) => {
  const existing = await findUserById(userId);

  if (!existing) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  if (existing.role === 'Admin') {
    throw new AppError('لا يمكن حذف حساب إدارة', 403);
  }

  invalidateUserSessions(userId, new Date().toISOString());

  const deleted = await deleteManagedUser(userId);

  if (!deleted) {
    throw new AppError('تعذر حذف الحساب', 500);
  }

  return { deleted: true };
};

export const getReports = async (input: AdminReportsQueryInput) => {
  const result = await listAdminReports(input.page, input.limit, input.status);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const resolveReport = async (
  reportId: string,
  status: 'Pending' | 'Resolved',
) => {
  const report = await setReportStatus(reportId, status);

  if (!report) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  return report;
};

export const getReviews = async (input: AdminReviewsQueryInput) => {
  const result = await listAdminReviews(input.page, input.limit, input.q);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const getConversations = async (input: AdminConversationsQueryInput) => {
  const result = await listAdminConversations(input.page, input.limit, input.q);
  return { items: result.items, pagination: buildPagination(input.page, input.limit, result.total) };
};

export const getConversationTranscript = (
  adminId: string,
  participantAId: string,
  participantBId: string,
  serviceId: string | null,
  reason: string,
) => {
  const messages = readAdminConversation(adminId, participantAId, participantBId, serviceId, reason);
  if (!messages) throw new AppError('المحادثة غير موجودة', 404);
  return messages;
};

export const getAuditLogs = (page: number, limit: number) => {
  const result = listAdminAuditLogs(page, limit);
  return { items: result.items, pagination: buildPagination(page, limit, result.total) };
};

export const removeReview = async (reviewId: string) => {
  const deleted = await deleteReview(reviewId);

  if (!deleted) {
    throw new AppError('التقييم غير موجود', 404);
  }
};

export const getStats = async () => {
  return getAdminStats();
};
