import { randomUUID } from 'node:crypto';
import { db } from '../config/db';

export type SupportSender = 'USER' | 'ADMIN';
export interface SupportAttachment { storageKey: string; name: string; mimeType: string; size: number; type: 'IMAGE' | 'VIDEO' | 'FILE'; }

export const insertSupportTicket = (userId: string, subject: string): string => {
  const id = randomUUID();
  db.prepare('INSERT INTO support_tickets (id, user_id, subject) VALUES (?, ?, ?)').run(id, userId, subject);
  return id;
};

export const insertSupportMessage = (ticketId: string, senderId: string, senderType: SupportSender, message: string, attachment?: SupportAttachment) => {
  const id = randomUUID();
  db.prepare(`INSERT INTO support_messages
    (id, ticket_id, sender_type, sender_id, message, attachment_url, attachment_type, attachment_name, attachment_mime, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, ticketId, senderType, senderId, message, attachment?.storageKey ?? null, attachment?.type ?? null,
      attachment?.name ?? null, attachment?.mimeType ?? null, attachment?.size ?? null);
  db.prepare("UPDATE support_tickets SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(ticketId);
  return id;
};

export const findSupportTicket = (ticketId: string) => db.prepare(`SELECT t.id, t.user_id AS userId, t.guest_email AS guestEmail,
  t.subject, t.status, t.created_at AS createdAt, t.updated_at AS updatedAt, u.name AS userName, u.email AS userEmail
  FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id WHERE t.id = ?`).get(ticketId) as
  | { id: string; userId: string | null; guestEmail: string | null; subject: string; status: 'OPEN' | 'CLOSED'; createdAt: string; updatedAt: string; userName: string | null; userEmail: string | null }
  | undefined;

export const listSupportTicketsForUser = (userId: string) => db.prepare(`SELECT t.id, t.subject, t.status,
  t.created_at AS createdAt, t.updated_at AS updatedAt,
  (SELECT message FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS lastMessage,
  (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS messageCount
  FROM support_tickets t WHERE t.user_id = ? ORDER BY t.updated_at DESC`).all(userId);

export const listAllSupportTickets = () => db.prepare(`SELECT t.id, t.subject, t.status,
  t.created_at AS createdAt, t.updated_at AS updatedAt, t.user_id AS userId,
  COALESCE(u.name, t.guest_email) AS userName, COALESCE(u.email, t.guest_email) AS userEmail, u.role AS userRole,
  (SELECT message FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS lastMessage,
  (SELECT COUNT(*) FROM support_messages m WHERE m.ticket_id = t.id) AS messageCount,
  (SELECT sender_type FROM support_messages m WHERE m.ticket_id = t.id ORDER BY m.created_at DESC LIMIT 1) AS lastSenderType
  FROM support_tickets t LEFT JOIN users u ON u.id = t.user_id
  ORDER BY CASE t.status WHEN 'OPEN' THEN 0 ELSE 1 END, t.updated_at DESC`).all();

export const listSupportMessages = (ticketId: string) => db.prepare(`SELECT m.id, m.ticket_id AS ticketId,
  m.sender_type AS senderType, m.sender_id AS senderId, COALESCE(u.name, 'مستخدم') AS senderName,
  u.avatar_url AS senderAvatar, m.message, m.attachment_url AS attachmentUrl,
  m.attachment_type AS attachmentType, m.attachment_name AS attachmentName,
  m.attachment_mime AS attachmentMime, m.attachment_size AS attachmentSize, m.created_at AS createdAt
  FROM support_messages m LEFT JOIN users u ON u.id = m.sender_id
  WHERE m.ticket_id = ? ORDER BY m.created_at ASC`).all(ticketId);

export const findSupportAttachment = (ticketId: string, messageId: string) => db.prepare(`SELECT m.attachment_url AS storageKey,
  m.attachment_name AS name, m.attachment_mime AS mimeType, t.user_id AS userId
  FROM support_messages m JOIN support_tickets t ON t.id = m.ticket_id
  WHERE m.ticket_id = ? AND m.id = ? AND m.attachment_url IS NOT NULL`).get(ticketId, messageId) as
  | { storageKey: string; name: string; mimeType: string; userId: string | null }
  | undefined;

export const setSupportTicketStatus = (ticketId: string, status: 'OPEN' | 'CLOSED'): boolean => {
  const result = db.prepare("UPDATE support_tickets SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(status, ticketId);
  return Number(result.changes) > 0;
};
