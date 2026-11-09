import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type { ChatConversation, ChatMessage } from '../types/chat';

interface MessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  service_id: string | null;
  content: string;
  attachment_storage_key: string | null;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
  is_read: number;
  created_at: string;
}

const mapMessage = (row: MessageRow): ChatMessage => ({
  id: row.id,
  senderId: row.sender_id,
  receiverId: row.receiver_id,
  serviceId: row.service_id,
  content: row.content,
  attachment: row.attachment_storage_key && row.attachment_name && row.attachment_mime
    ? { name: decodeStoredFilename(row.attachment_name), mimeType: row.attachment_mime, size: Number(row.attachment_size ?? 0), downloadUrl: `/chat/messages/${row.id}/attachment` }
    : null,
  isRead: Boolean(row.is_read),
  createdAt: row.created_at,
});

const decodeStoredFilename = (value: string): string => {
  if (!/[ÃÂØÙ]/.test(value)) return value;
  const decoded = Buffer.from(value, 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? value : decoded;
};

export const listConversations = (userId: string): ChatConversation[] => {
  const rows = db.prepare(`
    WITH grouped AS (
      SELECT CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END AS peer_id,
             service_id, MAX(created_at) AS last_message_at
      FROM messages
      WHERE sender_id = ? OR receiver_id = ?
      GROUP BY peer_id, service_id
    )
    SELECT g.peer_id, u.name, u.avatar_url, g.service_id, s.title AS service_title,
      (SELECT content FROM messages m
       WHERE ((m.sender_id = ? AND m.receiver_id = g.peer_id)
           OR (m.sender_id = g.peer_id AND m.receiver_id = ?))
         AND m.service_id IS g.service_id
       ORDER BY m.created_at DESC, m.id DESC LIMIT 1) AS last_message,
      g.last_message_at,
      (SELECT COUNT(*) FROM messages m
       WHERE m.sender_id = g.peer_id AND m.receiver_id = ?
         AND m.service_id IS g.service_id AND m.is_read = 0) AS unread_count
    FROM grouped g
    JOIN users u ON u.id = g.peer_id
    LEFT JOIN services s ON s.id = g.service_id
    WHERE u.is_active = 1
    ORDER BY g.last_message_at DESC
    LIMIT 100
  `).all(userId, userId, userId, userId, userId, userId) as unknown as Array<{
    peer_id: string;
    name: string;
    avatar_url: string | null;
    service_id: string | null;
    service_title: string | null;
    last_message: string;
    last_message_at: string;
    unread_count: number;
  }>;

  return rows.map((row) => ({
    userId: row.peer_id,
    name: row.name,
    avatarUrl: row.avatar_url,
    serviceId: row.service_id,
    serviceTitle: row.service_title,
    lastMessage: row.last_message,
    lastMessageAt: row.last_message_at,
    unreadCount: Number(row.unread_count),
  }));
};

export const listMessages = (
  userId: string,
  peerId: string,
  serviceId: string | null,
): ChatMessage[] => {
  db.prepare(`UPDATE messages SET is_read = 1
    WHERE sender_id = ? AND receiver_id = ? AND service_id IS ? AND is_read = 0`)
    .run(peerId, userId, serviceId);

  const rows = db.prepare(`SELECT id, sender_id, receiver_id, service_id, content, is_read, created_at,
      attachment_storage_key, attachment_name, attachment_mime, attachment_size
    FROM messages
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
      AND service_id IS ?
    ORDER BY created_at ASC, id ASC LIMIT 500`)
    .all(userId, peerId, peerId, userId, serviceId) as unknown as MessageRow[];

  return rows.map(mapMessage);
};

export const insertMessage = (input: {
  senderId: string;
  receiverId: string;
  serviceId: string | null;
  content: string;
  attachment?: { storageKey: string; name: string; mimeType: string; size: number };
}): ChatMessage => {
  const id = randomUUID();
  db.prepare(`INSERT INTO messages
    (id, sender_id, receiver_id, service_id, content, attachment_storage_key, attachment_name, attachment_mime, attachment_size)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.senderId, input.receiverId, input.serviceId, input.content,
      input.attachment?.storageKey ?? null, input.attachment?.name ?? null,
      input.attachment?.mimeType ?? null, input.attachment?.size ?? null);

  const row = db.prepare(`SELECT id, sender_id, receiver_id, service_id, content, is_read, created_at,
      attachment_storage_key, attachment_name, attachment_mime, attachment_size
    FROM messages WHERE id = ?`).get(id) as MessageRow | undefined;

  if (!row) throw new Error('Failed to create message');
  return mapMessage(row);
};

export const findAttachmentForParticipant = (messageId: string, userId: string) => {
  const row = db.prepare(`SELECT attachment_storage_key, attachment_name, attachment_mime
    FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?)
      AND attachment_storage_key IS NOT NULL LIMIT 1`).get(messageId, userId, userId) as
    | { attachment_storage_key: string; attachment_name: string; attachment_mime: string }
    | undefined;
  return row ? { ...row, attachment_name: decodeStoredFilename(row.attachment_name) } : undefined;
};
