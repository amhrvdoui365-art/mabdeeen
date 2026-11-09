import { createHash, randomUUID } from 'node:crypto';
import type { SQLInputValue } from 'node:sqlite';
import { db } from '../config/db';
import { describeAgent } from '../utils/agent';
import type { ActiveSession, IpBlock, ModerationFlag } from '../types/system';

export const nowIso = (): string => new Date().toISOString();

const agentHash = (userAgent: string): string =>
  createHash('sha1').update(userAgent).digest('hex').slice(0, 16);

interface SessionRow {
  id: number;
  user_id: string | null;
  name: string | null;
  email: string | null;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin' | null;
  ip: string;
  user_agent: string;
  route_count: number;
  first_seen: string;
  last_seen: string;
  revoked_at: string | null;
}

const mapSession = (row: SessionRow): ActiveSession => {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    email: row.email,
    role: row.role,
    ip: row.ip,
    userAgent: row.user_agent,
    device: describeAgent(row.user_agent),
    firstSeen: row.first_seen,
    lastSeen: row.last_seen,
    routeCount: Number(row.route_count),
    revokedAt: row.revoked_at,
  };
};

export const getSetting = (key: string): string | null => {
  const row = db.prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined;

  return row?.value ?? null;
};

export const setSetting = (key: string, value: string, updatedBy: string | null): void => {
  db.prepare(
    `INSERT INTO app_settings (key, value, updated_by, updated_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT (key) DO UPDATE SET
       value = excluded.value,
       updated_by = excluded.updated_by,
       updated_at = excluded.updated_at`,
  ).run(key, value, updatedBy, nowIso());
};

export const recordSession = (input: {
  userId: string | null;
  ip: string;
  userAgent: string;
}): void => {
  const hash = agentHash(input.userAgent);
  const sessionKey = `${input.userId ?? 'anon'}|${input.ip}|${hash}`;
  const seen = nowIso();

  db.prepare(
    `INSERT INTO user_sessions (session_key, user_id, ip, user_agent, agent_hash, last_seen)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT (session_key) DO UPDATE SET
       route_count = user_sessions.route_count + 1,
       last_seen = excluded.last_seen,
       revoked_at = NULL`,
  ).run(sessionKey, input.userId, input.ip, input.userAgent.slice(0, 300), hash, seen);
};

export interface SessionFilters {
  q?: string;
  userId?: string;
  includeRevoked?: boolean;
  limit: number;
  offset: number;
}

export const listSessions = (
  filters: SessionFilters,
): { items: ActiveSession[]; total: number } => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (!filters.includeRevoked) {
    clauses.push('s.revoked_at IS NULL');
  }

  if (filters.userId) {
    clauses.push('s.user_id = ?');
    params.push(filters.userId);
  }

  if (filters.q) {
    const like = `%${filters.q}%`;
    clauses.push('(s.ip LIKE ? OR u.name LIKE ? OR u.email LIKE ?)');
    params.push(like, like, like);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = db
    .prepare(
      `SELECT COUNT(*) AS total FROM user_sessions s LEFT JOIN users u ON u.id = s.user_id ${whereSql}`,
    )
    .get(...params) as { total: number } | undefined;

  const rows = db
    .prepare(
      `SELECT
         s.id, s.user_id, u.name, u.email, u.role, s.ip, s.user_agent,
         s.route_count, s.first_seen, s.last_seen, s.revoked_at
       FROM user_sessions s
       LEFT JOIN users u ON u.id = s.user_id
       ${whereSql}
       ORDER BY s.last_seen DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, filters.limit, filters.offset) as unknown as SessionRow[];

  return { items: rows.map(mapSession), total: Number(countRow?.total ?? 0) };
};

export const pruneSessions = (cutoffIso: string): number => {
  return Number(db.prepare('DELETE FROM user_sessions WHERE last_seen < ?').run(cutoffIso).changes);
};

interface BlockedIpRow {
  ip: string;
  reason: string;
  created_at: string;
  expires_at: string | null;
  created_by_name: string | null;
}

const mapIpBlock = (row: BlockedIpRow): IpBlock => {
  return {
    ip: row.ip,
    reason: row.reason,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    createdByName: row.created_by_name,
  };
};

export const isIpBlocked = (ip: string): boolean => {
  const row = db
    .prepare(
      `SELECT ip FROM ip_blocks
       WHERE ip = ? AND (expires_at IS NULL OR expires_at > ?)
       LIMIT 1`,
    )
    .get(ip, nowIso());

  return row !== undefined;
};

export const blockIp = (input: {
  ip: string;
  reason: string;
  userId: string;
  expiresAt: string | null;
}): IpBlock => {
  db.prepare(
    `INSERT INTO ip_blocks (ip, reason, created_by, created_at, expires_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT (ip) DO UPDATE SET
       reason = excluded.reason,
       created_by = excluded.created_by,
       created_at = excluded.created_at,
       expires_at = excluded.expires_at`,
  ).run(input.ip, input.reason, input.userId, nowIso(), input.expiresAt);

  const row = db
    .prepare(
      `SELECT b.ip, b.reason, b.created_at, b.expires_at, u.name AS created_by_name
       FROM ip_blocks b
       LEFT JOIN users u ON u.id = b.created_by
       WHERE b.ip = ?`,
    )
    .get(input.ip) as unknown as BlockedIpRow;

  return mapIpBlock(row);
};

export const unblockIp = (ip: string): boolean => {
  return db.prepare('DELETE FROM ip_blocks WHERE ip = ?').run(ip).changes > 0;
};

export const listBlockedIps = (): IpBlock[] => {
  const rows = db
    .prepare(
      `SELECT b.ip, b.reason, b.created_at, b.expires_at, u.name AS created_by_name
       FROM ip_blocks b
       LEFT JOIN users u ON u.id = b.created_by
       ORDER BY b.created_at DESC`,
    )
    .all() as unknown as BlockedIpRow[];

  return rows.map(mapIpBlock);
};

export const countActiveBlockedIps = (): number => {
  const row = db
    .prepare('SELECT COUNT(*) AS total FROM ip_blocks WHERE expires_at IS NULL OR expires_at > ?')
    .get(nowIso()) as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

export interface FlagDraft {
  field: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  suggestion: string | null;
}

export const replacePendingFlags = (userId: string, drafts: FlagDraft[]): void => {
  db.prepare("DELETE FROM moderation_flags WHERE user_id = ? AND status = 'Pending'").run(userId);

  const insert = db.prepare(
    `INSERT INTO moderation_flags (id, user_id, field, rule, severity, excerpt, suggestion)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  );

  for (const draft of drafts) {
    insert.run(
      randomUUID(),
      userId,
      draft.field,
      draft.rule,
      draft.severity,
      draft.excerpt.slice(0, 400),
      draft.suggestion ? draft.suggestion.slice(0, 400) : null,
    );
  }
};

interface ModerationFlagRow {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  field: string;
  rule: string;
  severity: 'low' | 'medium' | 'high';
  excerpt: string;
  suggestion: string | null;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  created_at: string;
  resolved_at: string | null;
}

const mapFlag = (row: ModerationFlagRow): ModerationFlag => {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name,
    userEmail: row.user_email,
    field: row.field,
    rule: row.rule,
    severity: row.severity,
    excerpt: row.excerpt,
    suggestion: row.suggestion,
    status: row.status,
    createdAt: row.created_at,
    resolvedAt: row.resolved_at,
  };
};

export const listModerationFlags = (input: {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page: number;
  limit: number;
}): { items: ModerationFlag[]; total: number } => {
  const clauses: string[] = [];
  const params: SQLInputValue[] = [];

  if (input.status) {
    clauses.push('mf.status = ?');
    params.push(input.status);
  }

  if (input.severity) {
    clauses.push('mf.severity = ?');
    params.push(input.severity);
  }

  const whereSql = clauses.length > 0 ? `WHERE ${clauses.join(' AND ')}` : '';

  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM moderation_flags mf ${whereSql}`)
    .get(...params) as { total: number } | undefined;

  const rows = db
    .prepare(
      `SELECT
         mf.id, mf.user_id, u.name AS user_name, u.email AS user_email,
         mf.field, mf.rule, mf.severity, mf.excerpt, mf.suggestion,
         mf.status, mf.created_at, mf.resolved_at
       FROM moderation_flags mf
       JOIN users u ON u.id = mf.user_id
       ${whereSql}
       ORDER BY CASE mf.severity WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END DESC,
         mf.created_at DESC
       LIMIT ? OFFSET ?`,
    )
    .all(...params, input.limit, (input.page - 1) * input.limit) as unknown as ModerationFlagRow[];

  return { items: rows.map(mapFlag), total: Number(countRow?.total ?? 0) };
};

export const setModerationFlagStatus = (
  id: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
  resolvedBy: string,
): ModerationFlag | null => {
  const result = db
    .prepare(
      `UPDATE moderation_flags
       SET status = ?, resolved_by = ?, resolved_at = CASE WHEN ? = 'Pending' THEN NULL ELSE ? END
       WHERE id = ?`,
    )
    .run(status, resolvedBy, status, nowIso(), id);

  if (result.changes === 0) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT
         mf.id, mf.user_id, u.name AS user_name, u.email AS user_email,
         mf.field, mf.rule, mf.severity, mf.excerpt, mf.suggestion,
         mf.status, mf.created_at, mf.resolved_at
       FROM moderation_flags mf
       JOIN users u ON u.id = mf.user_id
       WHERE mf.id = ?`,
    )
    .get(id) as ModerationFlagRow | undefined;

  return row ? mapFlag(row) : null;
};

export const clearPendingFlagsForUser = (userId: string): number => {
  return Number(
    db
      .prepare("DELETE FROM moderation_flags WHERE user_id = ? AND status = 'Pending'")
      .run(userId).changes,
  );
};

export const countPendingFlags = (): number => {
  const row = db
    .prepare("SELECT COUNT(*) AS total FROM moderation_flags WHERE status = 'Pending'")
    .get() as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

export const textFieldsForScan = (): Array<{ id: string; name: string; email: string; field: string; value: string }> => {
  const rows = db
    .prepare(
      `SELECT id, name, email, bio, title, location
       FROM users
       WHERE role = 'Freelancer' AND is_active = 1`,
    )
    .all() as unknown as Array<{
    id: string;
    name: string;
    email: string;
    bio: string | null;
    title: string | null;
    location: string | null;
  }>;

  const fields: Array<{ id: string; name: string; email: string; field: string; value: string }> = [];

  for (const row of rows) {
    if (row.bio) {
      fields.push({ id: row.id, name: row.name, email: row.email, field: 'bio', value: row.bio });
    }

    if (row.title) {
      fields.push({ id: row.id, name: row.name, email: row.email, field: 'title', value: row.title });
    }
  }

  return fields;
};
