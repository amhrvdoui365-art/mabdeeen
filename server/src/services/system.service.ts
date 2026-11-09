import { statSync } from 'node:fs';
import { db, transaction } from '../config/db';
import { databasePath } from '../config/paths';
import { invalidateUserSessions } from '../models/admin.model';
import {
  blockIp,
  clearPendingFlagsForUser,
  countActiveBlockedIps,
  countPendingFlags,
  getSetting,
  isIpBlocked,
  listBlockedIps,
  listModerationFlags,
  listSessions,
  nowIso,
  pruneSessions,
  recordSession,
  replacePendingFlags,
  setModerationFlagStatus,
  setSetting,
  textFieldsForScan,
  unblockIp,
} from '../models/system.model';
import type { FlagDraft } from '../models/system.model';
import type { ModerationFlag, ModerationScanResult, SystemHealth, SystemStatus } from '../types/system';
import { readMetrics } from '../middlewares/metrics.middleware';
import { AppError } from '../utils/app-error';
import { buildPagination } from '../utils/pagination';
import { buildCleanupSuggestion, moderateText } from '../utils/moderation';

const STATUS_TTL_MS = 1000;

const SETTINGS = {
  maintenance: 'maintenance_mode',
  maintenanceMessage: 'maintenance_message',
  maintenanceReturnsAt: 'maintenance_returns_at',
  registrationOpen: 'registration_open',
  blockedTerms: 'custom_blocked_terms',
} as const;

const boolSetting = (key: string, fallback: boolean): boolean => {
  const value = getSetting(key);

  if (value === null) {
    return fallback;
  }

  return value === '1' || value === 'true';
};

let statusCache: { at: number; value: SystemStatus } | null = null;

const readStatus = (): SystemStatus => {
  const returnsAt = getSetting(SETTINGS.maintenanceReturnsAt);
  const registrationOpen = boolSetting(SETTINGS.registrationOpen, true);

  return {
    maintenanceEnabled: boolSetting(SETTINGS.maintenance, false),
    maintenanceMessage:
      getSetting(SETTINGS.maintenanceMessage) ??
      'المنصة قيد الصيانة الدورية، نعتذر عن أي تأخير. سنعود قريباً.',
    maintenanceReturnsAt: returnsAt ? returnsAt : null,
    registrationOpen,
    serverTime: nowIso(),
  };
};

export const getSystemStatus = (): SystemStatus => {
  const now = Date.now();

  if (statusCache && now - statusCache.at < STATUS_TTL_MS) {
    return statusCache.value;
  }

  const value = readStatus();

  statusCache = { at: now, value };

  return value;
};

export const getBlockedTerms = (): string[] => {
  const raw = getSetting(SETTINGS.blockedTerms);

  if (!raw) {
    return [];
  }

  return raw
    .split(',')
    .map((term) => term.trim())
    .filter((term) => term.length > 0);
};

export const invalidateStatusCache = (): void => {
  statusCache = null;
};

let lastPruneAt = 0;

const pruneStaleSessions = (): void => {
  const now = Date.now();

  if (now - lastPruneAt < 6 * 60 * 60 * 1000) {
    return;
  }

  lastPruneAt = now;
  pruneSessions(new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString());
};

export interface SettingsPatch {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceReturnsAt?: string | null;
  registrationOpen?: boolean;
  blockedTerms?: string[];
}

export const updateSettings = (adminId: string, patch: SettingsPatch): SystemStatus => {
  transaction(() => {
    if (patch.maintenanceEnabled !== undefined) {
      setSetting(SETTINGS.maintenance, patch.maintenanceEnabled ? '1' : '0', adminId);
    }

    if (patch.maintenanceMessage !== undefined) {
      setSetting(SETTINGS.maintenanceMessage, patch.maintenanceMessage, adminId);
    }

    if (patch.maintenanceReturnsAt !== undefined) {
      setSetting(
        SETTINGS.maintenanceReturnsAt,
        patch.maintenanceReturnsAt ? patch.maintenanceReturnsAt : '',
        adminId,
      );
    }

    if (patch.registrationOpen !== undefined) {
      setSetting(SETTINGS.registrationOpen, patch.registrationOpen ? '1' : '0', adminId);
    }

    if (patch.blockedTerms !== undefined) {
      setSetting(SETTINGS.blockedTerms, patch.blockedTerms.join(','), adminId);
    }
  });

  invalidateStatusCache();

  return getSystemStatus();
};

export const trackRequestSession = (input: {
  userId: string | null;
  ip: string;
  userAgent: string;
}): void => {
  recordSession(input);
};

const scalar = (sql: string, ...params: Array<string | number>): number => {
  const row = db.prepare(sql).get(...params) as { total: number } | undefined;

  return Number(row?.total ?? 0);
};

const probeDatabaseLatency = (): number => {
  const statement = db.prepare('SELECT 1');
  const startedAt = process.hrtime.bigint();

  statement.get();

  return Math.round((Number(process.hrtime.bigint() - startedAt) / 1_000_000) * 100) / 100;
};

export const getSystemHealth = (): SystemHealth => {
  pruneStaleSessions();

  const metrics = readMetrics();
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const databaseOnline = (() => {
    try {
      probeDatabaseLatency();

      return true;
    } catch {
      return false;
    }
  })();
  const databaseLatencyMs = databaseOnline ? probeDatabaseLatency() : -1;

  let sizeMb = 0;

  try {
    sizeMb = Math.round((statSync(databasePath).size / 1024 / 1024) * 100) / 100;
  } catch {
    sizeMb = 0;
  }

  const liveSessions = scalar(
    "SELECT COUNT(*) AS total FROM user_sessions WHERE revoked_at IS NULL AND user_id IS NOT NULL AND last_seen > ?",
    cutoff,
  );
  const anonymousSessions = scalar(
    'SELECT COUNT(*) AS total FROM user_sessions WHERE user_id IS NULL',
  );
  const revokedSessions = scalar('SELECT COUNT(*) AS total FROM user_sessions WHERE revoked_at IS NOT NULL');
  const databaseErrors = metrics.statusCounts.fiveXx + metrics.uncaughtErrors;
  const degraded = !databaseOnline || metrics.latency.p95Ms > 1500 || databaseErrors > 50;

  return {
    status: degraded ? 'degraded' : 'ok',
    environment: process.env.NODE_ENV ?? 'development',
    nodeVersion: process.version,
    uptimeSeconds: metrics.uptimeSeconds,
    startedAt: metrics.startedAt,
    now: nowIso(),
    memory: metrics.memory,
    eventLoop: metrics.eventLoop,
    database: {
      latencyMs: databaseLatencyMs,
      sizeMb,
      users: scalar('SELECT COUNT(*) AS total FROM users'),
      sessions: scalar('SELECT COUNT(*) AS total FROM user_sessions'),
    },
    latency: metrics.latency,
    traffic: {
      windowSize: metrics.latency.samples,
      requests: metrics.requests,
      statusCounts: metrics.statusCounts,
      errors: databaseErrors,
      topRoutes: metrics.routes.slice(0, 6).map((route) => ({
        route: `${route.method} ${route.path}`,
        count: route.count,
        avgMs: route.avgMs,
      })),
    },
    routes: metrics.routes.map((route) => ({
      method: route.method,
      path: route.path,
      count: route.count,
      avgMs: route.avgMs,
      maxMs: Math.round(route.maxMs * 100) / 100,
    })),
    security: {
      blockedIps: countActiveBlockedIps(),
      liveSessions,
      anonymousSessions,
      revokedSessions,
      pendingFlags: countPendingFlags(),
    },
    growth: {
      signups24h: scalar('SELECT COUNT(*) AS total FROM users WHERE created_at > ?', cutoff),
      profileViews24h: scalar(
        "SELECT COUNT(*) AS total FROM profile_events WHERE event_type = 'View' AND created_at > ?",
        cutoff,
      ),
    },
  };
};

export const getAdminSessions = (input: {
  q?: string;
  includeRevoked?: boolean;
  page: number;
  limit: number;
}) => {
  pruneStaleSessions();

  const result = listSessions({
    q: input.q,
    includeRevoked: input.includeRevoked,
    limit: input.limit,
    offset: (input.page - 1) * input.limit,
  });

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

export const forceLogoutUser = (userId: string): { revoked: number } => {
  const revoked = invalidateUserSessions(userId, nowIso());

  if (revoked === 0 && !userExists(userId)) {
    throw new AppError('المستخدم غير موجود', 404);
  }

  return { revoked };
};

const userExists = (userId: string): boolean => {
  return db.prepare('SELECT id FROM users WHERE id = ?').get(userId) !== undefined;
};

const LOOPBACK = /^(?:127\.|::1$|localhost$|\[::1\]$)/;

export const banIpAddress = (input: {
  ip: string;
  reason: string;
  hours: number | null;
  adminId: string;
}) => {
  const ip = input.ip.trim();

  if (!ip) {
    throw new AppError('عنوان IP غير صالح', 422);
  }

  if (LOOPBACK.test(ip) || ip.startsWith('192.168.') || ip.startsWith('10.')) {
    throw new AppError('لا يمكن حظر العناوين المحلية أو الخاصة', 422);
  }

  const expiresAt =
    input.hours === null ? null : new Date(Date.now() + input.hours * 60 * 60 * 1000).toISOString();

  return blockIp({ ip, reason: input.reason, userId: input.adminId, expiresAt });
};

export const unbanIpAddress = (ip: string): void => {
  if (!unblockIp(ip.trim())) {
    throw new AppError('العنوان غير موجود في قائمة الحظر', 404);
  }
};

export const getBlockedIpList = () => {
  const cutoff = nowIso();

  db.prepare('DELETE FROM ip_blocks WHERE expires_at IS NOT NULL AND expires_at < ?').run(cutoff);

  return listBlockedIps();
};

export const isRequestBlocked = (ip: string): boolean => isIpBlocked(ip);

const SCAN_FIELDS: Array<'bio' | 'title'> = ['bio', 'title'];

export const buildDraftsForProfile = (
  fields: Partial<Record<'bio' | 'title' | 'name' | 'location', string | null | undefined>>,
): FlagDraft[] => {
  const drafts: FlagDraft[] = [];
  const extraTerms = getBlockedTerms();

  for (const field of SCAN_FIELDS) {
    const value = fields[field];

    if (!value) {
      continue;
    }

    const result = moderateText(value, { extraTerms });

    for (const hit of result.hits) {
      drafts.push({
        field,
        rule: hit.rule,
        severity: hit.severity,
        excerpt: hit.excerpt,
        suggestion: result.suggestion,
      });
    }
  }

  return drafts;
};

export const moderateProfileWrite = (
  userId: string,
  fields: Partial<Record<'bio' | 'title' | 'name' | 'location', string | null | undefined>>,
): { blockedMessage: string | null } => {
  const drafts = buildDraftsForProfile(fields);

  replacePendingFlags(userId, drafts);

  const blocked = drafts.find((draft) => draft.severity === 'high');

  if (blocked) {
    return { blockedMessage: `البيانات تحتوي على محتوى محظور: ${blocked.excerpt}` };
  }

  return { blockedMessage: null };
};

export const rescanAllProfiles = (): ModerationScanResult => {
  const fields = textFieldsForScan();
  const grouped = new Map<string, FlagDraft[]>();
  const extraTerms = getBlockedTerms();
  let flagged = 0;

  for (const entry of fields) {
    const result = moderateText(entry.value, { extraTerms });

    if (result.hits.length === 0) {
      continue;
    }

    const drafts = grouped.get(entry.id) ?? [];

    for (const hit of result.hits) {
      drafts.push({
        field: entry.field,
        rule: hit.rule,
        severity: hit.severity,
        excerpt: hit.excerpt,
        suggestion: buildCleanupSuggestion(entry.value),
      });
    }

    grouped.set(entry.id, drafts);
    flagged += 1;
  }

  transaction(() => {
    for (const [userId, drafts] of grouped.entries()) {
      replacePendingFlags(userId, drafts);
    }
  });

  return {
    scanned: new Set(fields.map((field) => field.id)).size,
    flagged,
    skipped: new Set(fields.map((field) => field.id)).size - flagged,
  };
};

export const getModerationFlags = (input: {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page: number;
  limit: number;
}) => {
  const result = listModerationFlags(input);

  return {
    items: result.items,
    pagination: buildPagination(input.page, input.limit, result.total),
  };
};

const FLAG_COLUMNS: Record<string, string> = {
  bio: 'bio',
  title: 'title',
  name: 'name',
  location: 'location',
};

const getFlagById = (id: string): ModerationFlag | null => {
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
    .get(id) as
    | {
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
    | undefined;

  if (!row) {
    return null;
  }

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

export const reviewModerationFlag = (
  id: string,
  status: 'Pending' | 'Resolved' | 'Dismissed',
  adminId: string,
): ModerationFlag => {
  const flag = setModerationFlagStatus(id, status, adminId);

  if (!flag) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  return flag;
};

/** Applies the stored cleanup suggestion straight onto the user's profile column. */
export const applyModerationCleanup = (
  id: string,
  adminId: string,
): { flag: ModerationFlag; updated: boolean } => {
  const flag = getFlagById(id);

  if (!flag) {
    throw new AppError('البلاغ غير موجود', 404);
  }

  const column = FLAG_COLUMNS[flag.field];

  if (!column || !flag.suggestion) {
    throw new AppError('لا يوجد اقتراح تنظيف صالح لهذا البلاغ', 422);
  }

  db.prepare(`UPDATE users SET ${column} = ? WHERE id = ?`).run(flag.suggestion, flag.userId);

  const updatedFlag = setModerationFlagStatus(id, 'Resolved', adminId);

  return { flag: updatedFlag ?? flag, updated: true };
};

export const clearUserFlags = (userId: string): number => {
  return clearPendingFlagsForUser(userId);
};
