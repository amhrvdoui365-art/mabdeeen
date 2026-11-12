import type { Request, Response } from 'express';
import {
  getReports,
  getReviews,
  getStats,
  getAuditLogs,
  getConversationTranscript,
  getConversations,
  getUsers,
  manageUser,
  removeManagedUser,
  removeReview,
  resetUserPassword,
  resolveReport,
  updateUserFeatured,
  updateUserStatus,
  updateUserVerified,
  updateUserDemoAccount,
} from '../services/admin.service';
import type {
  AdminReportsQueryInput,
  AdminReviewsQueryInput,
  AdminUsersQueryInput,
  ManageUserInput,
} from '../validators/admin.validator';

export const listUsers = async (req: Request, res: Response): Promise<void> => {
  const result = await getUsers(req.query as unknown as AdminUsersQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const changeUserStatus = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserStatus(
    String(req.params.id),
    req.body.isActive as boolean,
  );

  res.status(200).json({
    success: true,
    message: user.isActive ? 'تم تفعيل الحساب بنجاح' : 'تم تجميد الحساب بنجاح',
    data: { user },
  });
};

export const changeUserFeatured = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserFeatured(
    String(req.params.id),
    req.body.isFeatured as boolean,
    (req.body.featuredUntil as string | null) ?? null,
  );

  res.status(200).json({
    success: true,
    message: user.isFeatured ? 'تم تمييز البروفايل بنجاح' : 'تم إزالة التمييز عن البروفايل',
    data: { user },
  });
};

export const changeUserVerified = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserVerified(String(req.params.id), req.body.isVerified as boolean);

  res.status(200).json({
    success: true,
    message: user.isVerified ? 'تم توثيق الحساب بالعلامة الزرقاء' : 'تم إزالة التوثيق عن الحساب',
    data: { user },
  });
};

export const changeUserDemoAccount = async (req: Request, res: Response): Promise<void> => {
  const user = await updateUserDemoAccount(String(req.params.id), req.body.isDemoAccount as boolean);
  res.status(200).json({
    success: true,
    message: user.isDemoAccount ? 'تم اختيار الحساب لحسابات العرض التجريبي' : 'تم إزالة الحساب من حسابات العرض',
    data: { user },
  });
};

export const editUser = async (req: Request, res: Response): Promise<void> => {
  const user = await manageUser(String(req.params.id), req.body as ManageUserInput);

  res.status(200).json({
    success: true,
    message: 'تم تحديث بيانات المستخدم',
    data: { user },
  });
};

export const setPassword = async (req: Request, res: Response): Promise<void> => {
  await resetUserPassword(String(req.params.id), req.body.password as string);

  res.status(200).json({
    success: true,
    message: 'تم تعيين كلمة مرور جديدة وإنهاء جلسات المستخدم',
  });
};

export const removeUser = async (req: Request, res: Response): Promise<void> => {
  await removeManagedUser(String(req.params.id));

  res.status(200).json({
    success: true,
    message: 'تم حذف الحساب وجميع بياناته',
  });
};

export const listReports = async (req: Request, res: Response): Promise<void> => {
  const result = await getReports(req.query as unknown as AdminReportsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const changeReportStatus = async (req: Request, res: Response): Promise<void> => {
  const report = await resolveReport(
    String(req.params.id),
    req.body.status as 'Pending' | 'Resolved',
  );

  res.status(200).json({
    success: true,
    message: report.status === 'Resolved' ? 'تم حل البلاغ بنجاح' : 'تم إعادة البلاغ لقيد الانتظار',
    data: { report },
  });
};

export const listReviews = async (req: Request, res: Response): Promise<void> => {
  const result = await getReviews(req.query as unknown as AdminReviewsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const deleteReviewHandler = async (req: Request, res: Response): Promise<void> => {
  await removeReview(String(req.params.id));

  res.status(200).json({
    success: true,
    message: 'تم حذف التقييم بنجاح',
  });
};

export const stats = async (_req: Request, res: Response): Promise<void> => {
  const result = await getStats();

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const listConversations = async (req: Request, res: Response): Promise<void> => {
  const result = await getConversations(req.query as unknown as import('../validators/admin.validator').AdminConversationsQueryInput);
  res.status(200).json({ success: true, data: result });
};

export const listConversationMessages = async (req: Request, res: Response): Promise<void> => {
  const messages = getConversationTranscript(
    req.user!.id,
    String(req.params.participantAId),
    String(req.params.participantBId),
    typeof req.query.serviceId === 'string' ? req.query.serviceId : null,
    String(req.query.reason),
  );
  res.status(200).json({ success: true, data: { items: messages } });
};

export const listAuditLogs = async (req: Request, res: Response): Promise<void> => {
  const page = Number(req.query.page ?? 1);
  const limit = Number(req.query.limit ?? 20);
  res.status(200).json({ success: true, data: getAuditLogs(page, limit) });
};
