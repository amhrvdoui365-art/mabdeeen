import { randomUUID } from 'node:crypto';
import { db, transaction } from '../config/db';
import type { InboxNotificationType, SiteNotification } from '../types/notification';
import { emitRealtimeEvent, emitRealtimeEventToAll } from '../services/realtime.service';

export interface InboxNotification {
  id: string;
  type: InboxNotificationType;
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

interface InboxNotificationRow extends Omit<InboxNotification, 'isRead' | 'createdAt'> {
  is_read: number;
  created_at: string;
}

const mapInboxNotification = (row: InboxNotificationRow): InboxNotification => ({
  id: row.id, type: row.type, title: row.title, message: row.message, link: row.link,
  isRead: Boolean(row.is_read), createdAt: row.created_at,
});

export const createUserNotification = (
  userId: string, type: InboxNotificationType, title: string, message: string, link = '/',
): void => {
  db.prepare(`INSERT INTO user_notifications (id, user_id, type, title, message, link)
    VALUES (?, ?, ?, ?, ?, ?)`).run(randomUUID(), userId, type, title, message, link);
  emitRealtimeEvent(userId, 'notification');
};

export const notifyAdministrators = (title: string, message: string, link: string): void => {
  const admins = db.prepare("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1").all() as Array<{ id: string }>;
  for (const admin of admins) createUserNotification(admin.id, 'NEW_REPORT', title, message, link);
};

export const createBroadcastInboxNotifications = (title: string, message: string): void => {
  const users = db.prepare('SELECT id FROM users WHERE is_active = 1').all() as Array<{ id: string }>;
  const insert = db.prepare(`INSERT INTO user_notifications (id, user_id, type, title, message, link)
    VALUES (?, ?, 'ADMIN_ANNOUNCEMENT', ?, ?, '/')`);
  transaction(() => {
    for (const user of users) insert.run(randomUUID(), user.id, title, message);
  });
  emitRealtimeEventToAll('notification');
};

export const listUserNotifications = (userId: string): InboxNotification[] =>
  (db.prepare(`SELECT id, type, title, message, link, is_read, created_at FROM user_notifications
    WHERE user_id = ? ORDER BY created_at DESC LIMIT 50`).all(userId) as unknown as InboxNotificationRow[])
    .map(mapInboxNotification);

export const countUnreadNotifications = (userId: string): number => {
  const row = db.prepare('SELECT COUNT(*) AS count FROM user_notifications WHERE user_id = ? AND is_read = 0')
    .get(userId) as { count: number };
  return Number(row.count);
};

export const markUserNotificationRead = (userId: string, notificationId: string): boolean =>
  db.prepare('UPDATE user_notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(notificationId, userId).changes > 0;

export const markAllUserNotificationsRead = (userId: string): void => {
  db.prepare('UPDATE user_notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
};

interface NotificationRow {
  id: string;
  title: string;
  message: string;
  is_active: number;
  created_at: string;
}

const mapNotification = (row: NotificationRow): SiteNotification => ({
  id: row.id,
  title: row.title,
  message: row.message,
  isActive: Boolean(row.is_active),
  createdAt: row.created_at,
});

export const listActiveNotifications = (): SiteNotification[] =>
  (db.prepare(`SELECT id, title, message, is_active, created_at FROM notifications
    WHERE is_active = 1 ORDER BY created_at DESC LIMIT 1`).all() as unknown as NotificationRow[])
    .map(mapNotification);

export const listNotificationsForAdmin = (): SiteNotification[] =>
  (db.prepare(`SELECT id, title, message, is_active, created_at FROM notifications
    ORDER BY created_at DESC LIMIT 50`).all() as unknown as NotificationRow[])
    .map(mapNotification);

export const createNotification = (title: string, message: string, adminId: string): SiteNotification => {
  const id = randomUUID();
  db.prepare('INSERT INTO notifications (id, title, message, created_by) VALUES (?, ?, ?, ?)')
    .run(id, title, message, adminId);
  createBroadcastInboxNotifications(title, message);
  return mapNotification(db.prepare('SELECT id, title, message, is_active, created_at FROM notifications WHERE id = ?')
    .get(id) as unknown as NotificationRow);
};

export const setNotificationActive = (id: string, isActive: boolean): SiteNotification | null => {
  const result = db.prepare('UPDATE notifications SET is_active = ? WHERE id = ?').run(isActive ? 1 : 0, id);
  if (!result.changes) return null;
  return mapNotification(db.prepare('SELECT id, title, message, is_active, created_at FROM notifications WHERE id = ?')
    .get(id) as unknown as NotificationRow);
};
