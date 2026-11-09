import type { Request, Response } from 'express';
import {
  applyModerationCleanup,
  banIpAddress,
  forceLogoutUser,
  getAdminSessions,
  getBlockedIpList,
  getBlockedTerms,
  getModerationFlags,
  getSystemHealth,
  getSystemStatus,
  rescanAllProfiles,
  reviewModerationFlag,
  unbanIpAddress,
  updateSettings,
} from '../services/system.service';
import type {
  CreateIpBlockInput,
  ModerationActionInput,
  ModerationQueryInput,
  SessionsQueryInput,
  SystemSettingsInput,
} from '../validators/system.validator';

const ACTION_STATUS = {
  Resolve: 'Resolved',
  Dismiss: 'Dismissed',
  Reopen: 'Pending',
} as const;

export const status = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { system: getSystemStatus() },
  });
};

export const health = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { metrics: getSystemHealth() },
  });
};

export const settings = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { system: getSystemStatus(), blockedTerms: getBlockedTerms() },
  });
};

export const saveSettings = async (req: Request, res: Response): Promise<void> => {
  const system = updateSettings(req.user!.id, req.body as SystemSettingsInput);

  res.status(200).json({
    success: true,
    message: system.maintenanceEnabled
      ? 'تم تفعيل وضع الصيانة، المستخدمون غير الإداريين سيُوجّهون لصفحة الصيانة'
      : 'تم تحديث إعدادات النظام',
    data: { system },
  });
};

export const sessions = async (req: Request, res: Response): Promise<void> => {
  const result = getAdminSessions(req.query as unknown as SessionsQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const revokeSessions = async (req: Request, res: Response): Promise<void> => {
  const result = forceLogoutUser(String(req.params.id));

  res.status(200).json({
    success: true,
    message:
      result.revoked > 0
        ? 'تم إنهاء جلسات المستخدم الحالية'
        : 'لا توجد جلسات نشطة لهذا المستخدم',
    data: result,
  });
};

export const ipBlocks = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({
    success: true,
    data: { items: getBlockedIpList() },
  });
};

export const createIpBlock = async (req: Request, res: Response): Promise<void> => {
  const body = req.body as CreateIpBlockInput;
  const block = banIpAddress({
    ip: body.ip,
    reason: body.reason,
    hours: body.hours ?? null,
    adminId: req.user!.id,
  });

  res.status(201).json({
    success: true,
    message: 'تم حظر عنوان الـ IP',
    data: { block },
  });
};

export const removeIpBlock = async (req: Request, res: Response): Promise<void> => {
  unbanIpAddress(String(req.params.ip));

  res.status(200).json({
    success: true,
    message: 'تم رفع الحظر عن العنوان',
  });
};

export const flags = async (req: Request, res: Response): Promise<void> => {
  const result = getModerationFlags(req.query as unknown as ModerationQueryInput);

  res.status(200).json({
    success: true,
    data: result,
  });
};

export const flagAction = async (req: Request, res: Response): Promise<void> => {
  const { action } = req.body as ModerationActionInput;
  const flag = reviewModerationFlag(
    String(req.params.id),
    ACTION_STATUS[action],
    req.user!.id,
  );

  res.status(200).json({
    success: true,
    message: 'تم تحديث حالة البلاغ',
    data: { flag },
  });
};

export const flagCleanup = async (req: Request, res: Response): Promise<void> => {
  const result = applyModerationCleanup(String(req.params.id), req.user!.id);

  res.status(200).json({
    success: true,
    message: 'تم تطبيق التنظيف المقترح على البروفايل',
    data: { flag: result.flag },
  });
};

export const rescan = async (_req: Request, res: Response): Promise<void> => {
  const result = rescanAllProfiles();

  res.status(200).json({
    success: true,
    message: `تم فحص ${result.scanned} حساب مستقل، والمضبوطات على ${result.flagged}`,
    data: { scan: result },
  });
};
