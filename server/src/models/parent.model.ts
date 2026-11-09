import { randomUUID } from 'node:crypto';
import { db } from '../config/db';

export interface ParentLinkRow { id: string; parent_id: string; child_id: string; status: 'PENDING' | 'APPROVED' | 'REJECTED'; created_at: string; parent_name?: string; parent_avatar?: string | null; child_name?: string; child_avatar?: string | null; child_email?: string; }

export const findChildByEmail = (email: string) => db.prepare("SELECT id, name, email, role FROM users WHERE email = ? COLLATE NOCASE AND role = 'Freelancer' AND is_active = 1").get(email) as { id: string; name: string; email: string; role: string } | undefined;
export const findParentById = (id: string) => db.prepare("SELECT id, name, email, role FROM users WHERE id = ? AND role = 'Parent' AND is_active = 1").get(id) as { id: string; name: string; email: string; role: string } | undefined;
export const findPendingParentLink = (parentId: string, childId: string) => db.prepare("SELECT id FROM parent_child_links WHERE parent_id = ? AND child_id = ? AND status = 'PENDING'").get(parentId, childId);
export const createParentLink = (parentId: string, childId: string): string => {
  const id = randomUUID();
  db.prepare("INSERT INTO parent_child_links (id, parent_id, child_id, status) VALUES (?, ?, ?, 'PENDING')").run(id, parentId, childId);
  return id;
};
export const getChildLinkRequests = (childId: string) => db.prepare(`SELECT l.id, l.parent_id AS parentId, l.child_id AS childId, l.status, l.created_at AS createdAt, p.name AS parentName, p.avatar_url AS parentAvatar
  FROM parent_child_links l JOIN users p ON p.id = l.parent_id WHERE l.child_id = ? AND l.status = 'PENDING' ORDER BY l.created_at`).all(childId) as unknown as Array<{ id: string; parentId: string; childId: string; status: 'PENDING'; createdAt: string; parentName: string; parentAvatar: string | null }>;
export const respondToParentLink = (id: string, childId: string, status: 'APPROVED' | 'REJECTED'): ParentLinkRow | undefined => {
  const result = db.prepare("UPDATE parent_child_links SET status = ?, chat_access_enabled = ?, responded_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND child_id = ? AND status = 'PENDING'").run(status, status === 'APPROVED' ? 1 : 0, id, childId);
  if (!Number(result.changes)) return undefined;
  return db.prepare('SELECT id, parent_id, child_id, status, created_at FROM parent_child_links WHERE id = ?').get(id) as ParentLinkRow | undefined;
};
export const listLinkedChildren = (parentId: string) => {
  const children = db.prepare(`SELECT u.id, u.name, u.avatar_url AS avatarUrl,
      l.parent_display_name AS parentDisplayName, l.parent_avatar_data_url AS parentAvatarDataUrl,
      u.title, u.location, u.bio,
      u.github_url AS githubUrl, u.linkedin_url AS linkedinUrl, u.website_url AS websiteUrl,
      u.hourly_rate AS hourlyRate, u.min_budget AS minBudget, u.is_available AS isAvailable, u.is_verified AS isVerified,
      l.created_at AS linkedAt,
      (SELECT COUNT(*) FROM portfolio_items p WHERE p.user_id = u.id) AS portfolioCount,
      (SELECT COUNT(*) FROM services s WHERE s.freelancer_id = u.id AND s.status = 'active') AS serviceCount,
      (SELECT COUNT(*) FROM community_posts c WHERE c.author_id = u.id AND c.status = 'PUBLISHED') AS postCount,
      (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS reviewCount
    FROM parent_child_links l JOIN users u ON u.id = l.child_id
  WHERE l.parent_id = ? AND l.status = 'APPROVED' AND u.is_active = 1 ORDER BY l.responded_at DESC`).all(parentId) as unknown as Array<{ id: string; name: string; avatarUrl: string | null; parentDisplayName: string | null; parentAvatarDataUrl: string | null; title: string | null; location: string | null; bio: string | null; githubUrl: string | null; linkedinUrl: string | null; websiteUrl: string | null; hourlyRate: number | null; minBudget: number | null; isAvailable: number; isVerified: number; linkedAt: string; portfolioCount: number; serviceCount: number; postCount: number; reviewCount: number }>;
  return children.map((child) => ({ ...child,
    skills: db.prepare(`SELECT s.id, s.name FROM user_skills us JOIN skills s ON s.id = us.skill_id WHERE us.user_id = ? ORDER BY s.name`).all(child.id),
    services: db.prepare("SELECT id, title, description, category, price, media_json AS mediaJson, sources_json AS sourcesJson, created_at AS createdAt FROM services WHERE freelancer_id = ? AND status = 'active' ORDER BY created_at DESC").all(child.id),
    posts: db.prepare("SELECT id, title, content, category, cover_image AS coverImage, created_at AS createdAt, views_count AS viewsCount, likes_count AS likesCount FROM community_posts WHERE author_id = ? AND status = 'PUBLISHED' ORDER BY created_at DESC").all(child.id),
    portfolio: db.prepare("SELECT id, title, description, image_url AS imageUrl, project_url AS projectUrl, created_at AS createdAt FROM portfolio_items WHERE user_id = ? ORDER BY created_at DESC").all(child.id),
  }));
};

export const updateLinkedChildDisplay = (parentId: string, childId: string, displayName: string | null | undefined, avatarDataUrl?: string): boolean => {
  const updates: string[] = [];
  const values: Array<string | null> = [];
  if (displayName !== undefined) { updates.push('parent_display_name = ?'); values.push(displayName); }
  if (avatarDataUrl !== undefined) { updates.push('parent_avatar_data_url = ?'); values.push(avatarDataUrl); }
  if (!updates.length) return false;
  const result = db.prepare(`UPDATE parent_child_links SET ${updates.join(', ')}
    WHERE parent_id = ? AND child_id = ? AND status = 'APPROVED'`).run(...values, parentId, childId);
  return Number(result.changes) > 0;
};

export const linkedParentsForChild = (childId: string) => db.prepare(`
  SELECT l.id AS linkId, p.id AS parentId, p.name AS parentName, p.avatar_url AS parentAvatar, l.chat_access_enabled AS chatAccessEnabled
  FROM parent_child_links l JOIN users p ON p.id = l.parent_id WHERE l.child_id = ? AND l.status = 'APPROVED'
  ORDER BY l.responded_at DESC
`).all(childId) as unknown as Array<{ linkId: string; parentId: string; parentName: string; parentAvatar: string | null; chatAccessEnabled: number }>;

export const parentHasChatConsent = (parentId: string, childId: string): boolean => Boolean(db.prepare(`SELECT 1 FROM parent_child_links WHERE parent_id = ? AND child_id = ? AND status = 'APPROVED' AND chat_access_enabled = 1`).get(parentId, childId));

export const approveLinkedParentChatAccess = (childId: string, linkId: string): string | undefined => {
  const result = db.prepare(`UPDATE parent_child_links SET chat_access_enabled = 1 WHERE id = ? AND child_id = ? AND status = 'APPROVED' AND chat_access_enabled = 0`).run(linkId, childId);
  if (!Number(result.changes)) return undefined;
  return (db.prepare('SELECT parent_id AS parentId FROM parent_child_links WHERE id = ?').get(linkId) as { parentId: string } | undefined)?.parentId;
};

export const recordParentAccess = (parentId: string, childId: string, action: 'VIEW_CONVERSATIONS' | 'VIEW_MESSAGES', peerId?: string) => {
  db.prepare(`INSERT INTO parent_access_logs (id, parent_id, child_id, action, peer_id) VALUES (?, ?, ?, ?, ?)`).run(randomUUID(), parentId, childId, action, peerId ?? null);
};

export const getChildParentAccessLog = (childId: string) => db.prepare(`
  SELECT l.id, l.action, l.created_at AS createdAt, p.name AS parentName, peer.name AS peerName
  FROM parent_access_logs l JOIN users p ON p.id = l.parent_id LEFT JOIN users peer ON peer.id = l.peer_id
  WHERE l.child_id = ? ORDER BY l.created_at DESC LIMIT 100
`).all(childId) as unknown as Array<{ id: string; action: string; createdAt: string; parentName: string; peerName: string | null }>;

export const getChildConversations = (childId: string) => db.prepare(`
  SELECT CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END AS peerId, peer.name AS peerName,
    peer.avatar_url AS peerAvatar, m.service_id AS serviceId, s.title AS serviceTitle, MAX(m.created_at) AS lastMessageAt,
    (SELECT content FROM messages last WHERE ((last.sender_id = ? AND last.receiver_id = peer.id) OR (last.sender_id = peer.id AND last.receiver_id = ?)) AND last.service_id IS m.service_id ORDER BY last.created_at DESC LIMIT 1) AS lastMessage
  FROM messages m JOIN users peer ON peer.id = CASE WHEN m.sender_id = ? THEN m.receiver_id ELSE m.sender_id END
  LEFT JOIN services s ON s.id = m.service_id WHERE m.sender_id = ? OR m.receiver_id = ?
  GROUP BY peerId, m.service_id ORDER BY lastMessageAt DESC
`).all(childId, childId, childId, childId, childId, childId) as unknown as Array<{ peerId: string; peerName: string; peerAvatar: string | null; serviceId: string | null; serviceTitle: string | null; lastMessageAt: string; lastMessage: string }>;

export const getChildConversationMessages = (childId: string, peerId: string, serviceId: string | null) => db.prepare(`
  SELECT m.id, m.sender_id AS senderId, sender.name AS senderName, m.receiver_id AS receiverId, receiver.name AS receiverName,
    m.content, m.created_at AS createdAt, m.attachment_name AS attachmentName, m.attachment_mime AS attachmentMime
  FROM messages m JOIN users sender ON sender.id = m.sender_id JOIN users receiver ON receiver.id = m.receiver_id
  WHERE ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) AND m.service_id IS ?
  ORDER BY m.created_at ASC, m.id ASC
`).all(childId, peerId, peerId, childId, serviceId) as unknown as Array<{ id: string; senderId: string; senderName: string; receiverId: string; receiverName: string; content: string; createdAt: string; attachmentName: string | null; attachmentMime: string | null }>;

export const findLinkedChildMessageAttachment = (messageId: string, childId: string) => db.prepare(`
  SELECT id, sender_id AS senderId, receiver_id AS receiverId, attachment_storage_key AS storageKey,
    attachment_name AS name, attachment_mime AS mimeType
  FROM messages WHERE id = ? AND (sender_id = ? OR receiver_id = ?) AND attachment_storage_key IS NOT NULL
`).get(messageId, childId, childId) as { id: string; senderId: string; receiverId: string; storageKey: string; name: string; mimeType: string } | undefined;

export interface ParentVerificationRow { id: string; child_id: string; child_name?: string; parent_phone: string | null; parent_email: string | null; token_hash: string; challenge_a: number; challenge_b: number; parent_photo_path: string | null; status: string; created_at: string; submitted_at: string | null; }
export const createParentVerification = (childId: string, email: string, tokenHash: string, a: number, b: number) => {
  db.prepare(`INSERT INTO parent_verifications (id, child_id, parent_phone, parent_email, token_hash, challenge_a, challenge_b, status)
    VALUES (?, ?, '', ?, ?, ?, ?, 'PENDING_PARENT_APPROVAL')
    ON CONFLICT(child_id) DO UPDATE SET parent_phone = '', parent_email = excluded.parent_email, token_hash = excluded.token_hash,
      challenge_a = excluded.challenge_a, challenge_b = excluded.challenge_b, parent_photo_path = NULL,
      status = 'PENDING_PARENT_APPROVAL', created_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), submitted_at = NULL, reviewed_at = NULL, reviewed_by = NULL`)
    .run(randomUUID(), childId, email, tokenHash, a, b);
};
export const findParentVerificationByToken = (tokenHash: string) => db.prepare(`SELECT v.*, u.name AS child_name FROM parent_verifications v JOIN users u ON u.id = v.child_id WHERE v.token_hash = ?`).get(tokenHash) as ParentVerificationRow | undefined;
export const findParentVerificationByChild = (childId: string) => db.prepare('SELECT * FROM parent_verifications WHERE child_id = ?').get(childId) as ParentVerificationRow | undefined;
export const submitParentVerification = (id: string, photoPath: string, childId: string) => {
  const result = db.prepare(`UPDATE parent_verifications SET parent_photo_path = ?, status = 'PENDING_ADMIN_REVIEW', submitted_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND child_id = ? AND status = 'PENDING_PARENT_APPROVAL'`).run(photoPath, id, childId);
  if (Number(result.changes)) db.prepare("UPDATE users SET account_status = 'PENDING_ADMIN_REVIEW' WHERE id = ? AND role = 'Freelancer'").run(childId);
  return result;
};
export const listParentVerifications = () => db.prepare(`SELECT v.id, v.child_id AS childId, u.name AS childName, u.email AS childEmail, v.parent_email AS parentEmail, v.status, v.created_at AS createdAt, v.submitted_at AS submittedAt FROM parent_verifications v JOIN users u ON u.id = v.child_id WHERE v.status = 'PENDING_ADMIN_REVIEW' ORDER BY v.created_at`).all() as unknown as Array<{ id: string; childId: string; childName: string; childEmail: string; parentEmail: string | null; status: 'PENDING_ADMIN_REVIEW'; createdAt: string; submittedAt: string | null }>;
export const reviewParentVerification = (id: string, adminId: string, approve: boolean) => {
  const status = approve ? 'APPROVED' : 'REJECTED';
  const result = db.prepare(`UPDATE parent_verifications SET status = ?, reviewed_by = ?, reviewed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'PENDING_ADMIN_REVIEW'`).run(status, adminId, id);
  if (!Number(result.changes)) return undefined;
  const row = db.prepare('SELECT child_id, parent_email FROM parent_verifications WHERE id = ?').get(id) as { child_id: string; parent_email: string | null };
  db.prepare('UPDATE users SET account_status = ?, is_active = ?, is_verified = ?, parent_approval_token = NULL WHERE id = ?')
    .run(approve ? 'ACTIVE' : 'REJECTED', approve ? 1 : 0, approve ? 1 : 0, row.child_id);
  return row;
};
export const findVerificationById = (id: string) => db.prepare('SELECT parent_photo_path, child_id, parent_phone FROM parent_verifications WHERE id = ?').get(id) as { parent_photo_path: string | null; child_id: string; parent_phone: string } | undefined;
export const markAccountVerificationPending = (childId: string, tokenHash: string) => db.prepare("UPDATE users SET parent_approval_token = ?, account_status = 'PENDING_PARENT_APPROVAL', is_active = 1 WHERE id = ? AND role = 'Freelancer'").run(tokenHash, childId);
