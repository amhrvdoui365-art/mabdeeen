import type { Request, Response } from 'express';
import {
  createNotification,
  listActiveNotifications,
  listNotificationsForAdmin,
  setNotificationActive,
  listUserNotifications,
  countUnreadNotifications,
  markUserNotificationRead,
  markAllUserNotificationsRead,
} from '../models/notification.model';
import type { CreateNotificationInput } from '../validators/notification.validator';
import { AppError } from '../utils/app-error';

export const activeNotifications = (_req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: { items: listActiveNotifications() } });
};

export const inbox = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: listUserNotifications(req.user!.id), unreadCount: countUnreadNotifications(req.user!.id) } });
};

export const unreadCount = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { count: countUnreadNotifications(req.user!.id) } });
};

export const markRead = async (req: Request, res: Response): Promise<void> => {
  const updated = markUserNotificationRead(req.user!.id, String(req.params.id));
  if (!updated) throw new AppError('الإشعار غير موجود.', 404);
  res.status(200).json({ success: true, data: { updated: true } });
};

export const markAllRead = async (req: Request, res: Response): Promise<void> => {
  markAllUserNotificationsRead(req.user!.id);
  res.status(200).json({ success: true, data: { updated: true } });
};

export const adminNotifications = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: listNotificationsForAdmin() } });
};

export const createSiteNotification = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as CreateNotificationInput;
  const notification = createNotification(input.title, input.message, req.user!.id);
  res.status(201).json({ success: true, data: { notification } });
};

export const updateSiteNotification = async (req: Request, res: Response): Promise<void> => {
  const result = setNotificationActive(String(req.params.id), req.body.isActive as boolean);
  if (!result) throw new AppError('الإشعار غير موجود', 404);
  res.status(200).json({ success: true, data: { notification: result } });
};
