import type { SQLInputValue } from 'node:sqlite';
import { randomUUID } from 'node:crypto';
import { db } from '../config/db';
import type {
  AdminAuditLog,
  AdminConversation,
  AdminConversationMessage,
  AdminReport,
  AdminReview,
  AdminStats,
  AdminUser,
} from '../types/admin';
import type { AdminUsersQueryInput } from '../validators/admin.validator';

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  title: string | null;
  bio: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  is_active: number;
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  created_at: string;
  avg_rating: number;
  review_count: number;
  pending_flags: number;
}

interface AdminReportRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  freelancer_email: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  created_at: string;
}

interface AdminReviewRow {
  id: string;
  freelancer_id: string;
  freelancer_name: string;
  client_name: string;
  rating: number;
  comment: string | null;
  created_at: string;
}

interface AdminConversationRow {
  participant_a_id: string;
  participant_a_name: string;
  participant_a_email: string;
  participant_a_avatar_url: string | null;
  participant_b_id: string;
  participant_b_name: string;
  participant_b_email: string;
  participant_b_avatar_url: string | null;
  service_id: string | null;
  service_title: string | null;
  service_freelancer_id: string | null;
  last_message_at: string;
  message_count: number;
}

interface AdminMessageRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  created_at: string;
  attachment_name: string | null;
  attachment_mime: string | null;
  attachment_size: number | null;
}

const ADMIN_USER_SELECT = `
  SELECT
    u.id, u.name, u.email, u.role,
    u.title, u.bio, u.location, u.min_budget, u.hourly_rate, u.avatar_url,
    u.is_active, u.is_available, u.is_featured, u.is_verified,
    u.featured_until, u.avg_response_hours, u.created_at,
    COALESCE(s.avg_rating, 0) AS avg_rating,
    COALESCE(s.review_count, 0) AS review_count,
    (
      SELECT COUNT(*) FROM moderation_flags mf
      WHERE mf.user_id = u.id AND mf.status = 'Pending'
    ) AS pending_flags
  FROM users u
  LEFT JOIN freelancer_stats s ON s.freelancer_id = u.id
`;

const mapAdminUser = (row: AdminUserRow): AdminUser => {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    title: row.title,
    bio: row.bio,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isActive: Boolean(row.is_active),
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    featuredUntil: row.featured_until,
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    createdAt: row.created_at,
    avgRating: Number(row.avg_rating ?? 0),
    reviewCount: Number(row.review_count ?? 0),
    pendingFlags: Number(row.pending_flags ?? 0),
  };
};

const mapReport = (row: AdminReportRow): AdminReport => {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    freelancerEmail: row.freelancer_email,
    reason: row.reason,
    status: row.status,
    createdAt: row.created_at,
  };
};

const mapReview = (row: AdminReviewRow): AdminReview => {
  return {
    id: row.id,
    freelancerId: row.freelancer_id,
    freelancerName: row.freelancer_name,
    clientName: row.client_name,
    rating: row.rating,
    comment: row.comment,
    createdAt: row.created_at,
  };
};

export const getAdminUserById = (userId: string): AdminUser | null => {
  const row = db
    .prepare(`${ADMIN_USER_SELECT} WHERE u.id = ? LIMIT 1`)
    .get(userId) as AdminUserRow | undefined;

  return row ? mapAdminUser(row) : null;
};

export const listAdminUsers = async (
  filters: AdminUsersQueryInput,
): Promise<{ items: AdminUser[]; total: number }> => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (filters.role) {
    clauses.push('u.role = ?');
    params.push(filters.role);
  }

  if (filters.status) {
    clauses.push('u.is_active = ?');
    params.push(filters.status === 'active' ? 1 : 0);
  }

  if (filters.featured !== undefined) {
    clauses.push('u.is_featured = ?');
    params.push(filters.featured ? 1 : 0);
  }

  if (filters.verified !== undefined) {
    clauses.push('u.is_verified = ?');
    params.push(filters.verified ? 1 : 0);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push('(u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM users u ${whereSql}`)
    .get(...params) as { total: number } | undefined;

  const offset = (filters.page - 1) * filters.limit;

  const rows = db
    .prepare(
      `${ADMIN_USER_SELECT}
       ${whereSql}
       ORDER BY u.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, filters.limit, offset) as unknown as AdminUserRow[];

  return {
    items: rows.map(mapAdminUser),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const setUserStatus = async (
  userId: string,
  isActive: boolean,
): Promise<AdminUser | null> => {
  const result = db
    .prepare(
      `UPDATE users SET is_active = ? WHERE id = ? AND role IN ('Freelancer', 'Buyer', 'Parent')`,
    )
    .run(isActive ? 1 : 0, userId);

  return result.changes > 0 ? getAdminUserById(userId) : null;
};

export const setUserFeatured = async (
  userId: string,
  isFeatured: boolean,
  featuredUntil: string | null = null,
): Promise<AdminUser | null> => {
  const result = db
    .prepare(
      `UPDATE users SET is_featured = ?, featured_until = ?
       WHERE id = ? AND role = 'Freelancer'`,
    )
    .run(isFeatured ? 1 : 0, isFeatured ? featuredUntil : null, userId);

  return result.changes > 0 ? getAdminUserById(userId) : null;
};

export const setUserVerified = async (
  userId: string,
  isVerified: boolean,
): Promise<AdminUser | null> => {
  const result = db
    .prepare('UPDATE users SET is_verified = ? WHERE id = ?')
    .run(isVerified ? 1 : 0, userId);

  return result.changes > 0 ? getAdminUserById(userId) : null;
};

const MANAGED_USER_COLUMNS: Record<string, string> = {
  name: 'name',
  title: 'title',
  bio: 'bio',
  location: 'location',
  minBudget: 'min_budget',
  hourlyRate: 'hourly_rate',
  avatarUrl: 'avatar_url',
  avgResponseHours: 'avg_response_hours',
};

export interface ManagedUserFields {
  name?: string;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  minBudget?: number | null;
  hourlyRate?: number | null;
  avatarUrl?: string | null;
  avgResponseHours?: number | null;
}

export const updateManagedUser = async (
  userId: string,
  fields: ManagedUserFields,
): Promise<AdminUser | null> => {
  const assignments: string[] = [];
  const values: SQLInputValue[] = [];

  for (const [field, column] of Object.entries(MANAGED_USER_COLUMNS)) {
    const value = fields[field as keyof ManagedUserFields];

    if (value !== undefined) {
      values.push(value as SQLInputValue);
      assignments.push(`${column} = ?`);
    }
  }

  if (assignments.length === 0) {
    return getAdminUserById(userId);
  }

  const result = db
    .prepare(`UPDATE users SET ${assignments.join(', ')} WHERE id = ?`)
    .run(...values, userId);

  return result.changes > 0 ? getAdminUserById(userId) : null;
};

export const setUserPassword = async (userId: string, passwordHash: string): Promise<boolean> => {
  const result = db
    .prepare('UPDATE users SET password_hash = ? WHERE id = ? AND role != ?')
    .run(passwordHash, userId, 'Admin');

  return result.changes > 0;
};

export const invalidateUserSessions = (userId: string, cutoff: string): number => {
  db.prepare('UPDATE users SET token_invalid_before = ? WHERE id = ?').run(cutoff, userId);

  const result = db
    .prepare(
      `UPDATE user_sessions SET revoked_at = ?
       WHERE user_id = ? AND revoked_at IS NULL`,
    )
    .run(cutoff, userId);

  return Number(result.changes);
};

export const deleteManagedUser = async (userId: string): Promise<boolean> => {
  const result = db
    .prepare("DELETE FROM users WHERE id = ? AND role != 'Admin'")
    .run(userId);

  return result.changes > 0;
};

export const listAdminReports = async (
  page: number,
  limit: number,
  status?: 'Pending' | 'Resolved',
): Promise<{ items: AdminReport[]; total: number }> => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (status) {
    clauses.push('r.status = ?');
    params.push(status);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM reports r ${whereSql}`)
    .get(...params) as { total: number } | undefined;

  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT
         r.id, r.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
         r.reason, r.status, r.created_at
       FROM reports r
       JOIN users u ON u.id = r.freelancer_id
       ${whereSql}
       ORDER BY r.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as AdminReportRow[];

  return {
    items: rows.map(mapReport),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const setReportStatus = async (
  reportId: string,
  status: 'Pending' | 'Resolved',
): Promise<AdminReport | null> => {
  const result = db
    .prepare('UPDATE reports SET status = ? WHERE id = ?')
    .run(status, reportId);

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT
         r.id, r.freelancer_id, u.name AS freelancer_name, u.email AS freelancer_email,
         r.reason, r.status, r.created_at
       FROM reports r
       JOIN users u ON u.id = r.freelancer_id
       WHERE r.id = ?`,
    )
    .get(reportId) as AdminReportRow | undefined;

  return row ? mapReport(row) : null;
};

export const listAdminReviews = async (
  page: number,
  limit: number,
  q?: string,
): Promise<{ items: AdminReview[]; total: number }> => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (q) {
    const like = `%${q}%`;
    clauses.push('(rv.client_name LIKE ? OR u.name LIKE ?)');
    params.push(like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total
       FROM reviews rv
       JOIN users u ON u.id = rv.freelancer_id
       ${whereSql}`,
    )
    .get(...params) as { total: number } | undefined;

  const offset = (page - 1) * limit;

  const rows = db
    .prepare(
      `SELECT
         rv.id, rv.freelancer_id, u.name AS freelancer_name,
         rv.client_name, rv.rating, rv.comment, rv.created_at
       FROM reviews rv
       JOIN users u ON u.id = rv.freelancer_id
       ${whereSql}
       ORDER BY rv.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, limit, offset) as unknown as AdminReviewRow[];

  return {
    items: rows.map(mapReview),
    total: countRow ? Number(countRow.total) : 0,
  };
};

export const deleteReview = async (reviewId: string): Promise<boolean> => {
  const result = db.prepare('DELETE FROM reviews WHERE id = ?').run(reviewId);
  return result.changes > 0;
};

export const getAdminStats = async (): Promise<AdminStats> => {
  const totals = db
    .prepare(
      `SELECT
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer') AS freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_active = 1) AS active_freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_featured = 1) AS featured_freelancers,
         (SELECT COUNT(*) FROM users WHERE role = 'Freelancer' AND is_verified = 1) AS verified_freelancers,
         (SELECT COUNT(*) FROM reviews) AS reviews,
         (SELECT COUNT(*) FROM reports WHERE status = 'Pending') AS pending_reports,
         (SELECT COUNT(*) FROM moderation_flags WHERE status = 'Pending') AS pending_flags,
         (SELECT COUNT(*) FROM ip_blocks WHERE expires_at IS NULL OR expires_at > strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) AS blocked_ips,
         (SELECT COUNT(*) FROM user_sessions WHERE revoked_at IS NULL AND user_id IS NOT NULL AND last_seen > strftime('%Y-%m-%dT%H:%M:%fZ', 'now', '-30 minutes')) AS live_sessions,
         (SELECT COUNT(*) FROM profile_events WHERE event_type = 'View') AS profile_views`,
    )
    .get() as
    | {
        freelancers: number;
        active_freelancers: number;
        featured_freelancers: number;
        verified_freelancers: number;
        reviews: number;
        pending_reports: number;
        pending_flags: number;
        blocked_ips: number;
        live_sessions: number;
        profile_views: number;
      }
    | undefined;

  const topSkills = db
    .prepare(
      `SELECT sk.id, sk.name, COUNT(DISTINCT us.user_id) AS freelancers
       FROM skills sk
       JOIN user_skills us ON us.skill_id = sk.id
       JOIN users u ON u.id = us.user_id
       WHERE u.role = 'Freelancer' AND u.is_active = 1
       GROUP BY sk.id, sk.name
       ORDER BY freelancers DESC, sk.name ASC
       LIMIT 8`,
    )
    .all() as unknown as Array<{
    id: string;
    name: string;
    freelancers: number;
  }>;

  return {
    freelancers: Number(totals?.freelancers ?? 0),
    activeFreelancers: Number(totals?.active_freelancers ?? 0),
    featuredFreelancers: Number(totals?.featured_freelancers ?? 0),
    verifiedFreelancers: Number(totals?.verified_freelancers ?? 0),
    reviews: Number(totals?.reviews ?? 0),
    pendingReports: Number(totals?.pending_reports ?? 0),
    pendingFlags: Number(totals?.pending_flags ?? 0),
    blockedIps: Number(totals?.blocked_ips ?? 0),
    liveSessions: Number(totals?.live_sessions ?? 0),
    profileViews: Number(totals?.profile_views ?? 0),
    topSkills: topSkills.map((skill) => ({
      ...skill,
      freelancers: Number(skill.freelancers),
    })),
  };
};

export const listAdminConversations = async (
  page: number,
  limit: number,
  q?: string,
): Promise<{ items: AdminConversation[]; total: number }> => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];
  if (q) {
    const like = `%${q}%`;
    clauses.push('(a.name LIKE ? OR a.email LIKE ? OR b.name LIKE ? OR b.email LIKE ? OR s.title LIKE ?)');
    params.push(like, like, like, like, like);
  }
  const whereSql = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const normalized = `
    WITH normalized AS (
      SELECT
        CASE WHEN sender_id < receiver_id THEN sender_id ELSE receiver_id END AS participant_a_id,
        CASE WHEN sender_id < receiver_id THEN receiver_id ELSE sender_id END AS participant_b_id,
        service_id, created_at
      FROM messages
    ), grouped AS (
      SELECT participant_a_id, participant_b_id, service_id,
        COUNT(*) AS message_count, MAX(created_at) AS last_message_at
      FROM normalized
      GROUP BY participant_a_id, participant_b_id, service_id
    )
  `;
  const count = db.prepare(`${normalized}
    SELECT COUNT(*) AS total FROM grouped g
    JOIN users a ON a.id = g.participant_a_id
    JOIN users b ON b.id = g.participant_b_id
    LEFT JOIN services s ON s.id = g.service_id
    ${whereSql}`).get(...params) as { total: number } | undefined;
  const offset = (page - 1) * limit;
  const rows = db.prepare(`${normalized}
    SELECT g.participant_a_id, a.name AS participant_a_name, a.email AS participant_a_email,
      a.avatar_url AS participant_a_avatar_url,
      g.participant_b_id, b.name AS participant_b_name, b.email AS participant_b_email,
      b.avatar_url AS participant_b_avatar_url,
      g.service_id, s.title AS service_title, s.freelancer_id AS service_freelancer_id, g.message_count, g.last_message_at
    FROM grouped g
    JOIN users a ON a.id = g.participant_a_id
    JOIN users b ON b.id = g.participant_b_id
    LEFT JOIN services s ON s.id = g.service_id
    ${whereSql}
    ORDER BY g.last_message_at DESC
    LIMIT ? OFFSET ?`).all(...params, limit, offset) as unknown as AdminConversationRow[];

  return {
    items: rows.map((row) => ({
      participantAId: row.participant_a_id,
      participantAName: row.participant_a_name,
      participantAEmail: row.participant_a_email,
      participantAAvatarUrl: row.participant_a_avatar_url,
      participantBId: row.participant_b_id,
      participantBName: row.participant_b_name,
      participantBEmail: row.participant_b_email,
      participantBAvatarUrl: row.participant_b_avatar_url,
      serviceId: row.service_id,
      serviceTitle: row.service_title,
      serviceFreelancerId: row.service_freelancer_id,
      lastMessageAt: row.last_message_at,
      messageCount: Number(row.message_count),
    })),
    total: Number(count?.total ?? 0),
  };
};

export const readAdminConversation = (
  adminId: string,
  participantAId: string,
  participantBId: string,
  serviceId: string | null,
  reason: string,
): AdminConversationMessage[] | null => {
  const [a, b] = [participantAId, participantBId].sort();
  const rows = db.prepare(`SELECT id, sender_id, receiver_id, content, created_at,
      attachment_name, attachment_mime, attachment_size
    FROM messages
    WHERE ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?))
      AND service_id IS ?
    ORDER BY created_at ASC, id ASC
    LIMIT 500`).all(a, b, b, a, serviceId) as unknown as AdminMessageRow[];
  if (rows.length === 0) return null;

  const auditId = randomUUID();
  const subjectId = `${a}:${b}:${serviceId ?? 'direct'}`;
  db.prepare(`INSERT INTO admin_audit_logs
    (id, admin_id, action, subject_type, subject_id, reason, metadata_json)
    VALUES (?, ?, 'view_conversation', 'conversation', ?, ?, ?)`)
    .run(auditId, adminId, subjectId, reason, JSON.stringify({ participantAId: a, participantBId: b, serviceId, messageCount: rows.length }));

  return rows.map((row) => ({
    id: row.id,
    senderId: row.sender_id,
    receiverId: row.receiver_id,
    content: row.content,
    createdAt: row.created_at,
    attachment: row.attachment_name && row.attachment_mime
      ? { name: row.attachment_name, mimeType: row.attachment_mime, size: Number(row.attachment_size ?? 0) }
      : null,
  }));
};

interface AdminAuditRow {
  id: string;
  admin_id: string | null;
  admin_name: string | null;
  action: string;
  subject_type: string;
  subject_id: string;
  reason: string;
  created_at: string;
}

export const listAdminAuditLogs = (page: number, limit: number): { items: AdminAuditLog[]; total: number } => {
  const total = db.prepare('SELECT COUNT(*) AS total FROM admin_audit_logs').get() as { total: number };
  const rows = db.prepare(`SELECT l.id, l.admin_id, u.name AS admin_name, l.action,
      l.subject_type, l.subject_id, l.reason, l.created_at
    FROM admin_audit_logs l LEFT JOIN users u ON u.id = l.admin_id
    ORDER BY l.created_at DESC LIMIT ? OFFSET ?`)
    .all(limit, (page - 1) * limit) as unknown as AdminAuditRow[];
  return {
    items: rows.map((row) => ({
      id: row.id,
      adminId: row.admin_id,
      adminName: row.admin_name,
      action: row.action,
      subjectType: row.subject_type,
      subjectId: row.subject_id,
      reason: row.reason,
      createdAt: row.created_at,
    })),
    total: Number(total.total),
  };
};
