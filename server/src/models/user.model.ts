import { randomUUID } from 'node:crypto';
import { db, transaction } from '../config/db';
import type { UserRole } from '../types/auth';
import type { PublicUser } from '../types/user';

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: UserRole;
  bio: string | null;
  title: string | null;
  location: string | null;
  min_budget: number | null;
  hourly_rate: number | null;
  avatar_url: string | null;
  parent_phone: string | null;
  parent_photo: string | null;
  parent_approval_token: string | null;
  account_status: 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';
  is_available: number;
  is_featured: number;
  is_verified: number;
  featured_until: string | null;
  avg_response_hours: number | null;
  token_invalid_before: string | null;
  profile_complete: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountInput {
  name: string;
  email: string;
  passwordHash: string;
  role: Exclude<UserRole, 'Admin'>;
  title: string | null;
  location: string | null;
  bio: string | null;
  profileComplete?: boolean;
}

export const toPublicUser = (row: UserRow): PublicUser => {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    bio: row.bio,
    title: row.title,
    location: row.location,
    minBudget: row.min_budget,
    hourlyRate: row.hourly_rate,
    avatarUrl: row.avatar_url,
    isAvailable: Boolean(row.is_available),
    isFeatured: Boolean(row.is_featured),
    isVerified: Boolean(row.is_verified),
    avgResponseHours: row.avg_response_hours === null ? null : Number(row.avg_response_hours),
    isActive: Boolean(row.is_active),
    profileComplete: Boolean(row.profile_complete),
    accountStatus: row.account_status,
    createdAt: row.created_at,
  };
};

export const findUserByEmail = async (email: string): Promise<UserRow | null> => {
  const row = db
    .prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE LIMIT 1')
    .get(email) as UserRow | undefined;

  return row ?? null;
};

export const findUserById = async (id: string): Promise<UserRow | null> => {
  const row = db
    .prepare('SELECT * FROM users WHERE id = ? LIMIT 1')
    .get(id) as UserRow | undefined;

  return row ?? null;
};

export const setOwnPassword = (userId: string, passwordHash: string, cutoff: string): boolean => {
  let changed = false;
  transaction(() => {
    const result = db.prepare('UPDATE users SET password_hash=?, token_invalid_before=? WHERE id=?').run(passwordHash, cutoff, userId);
    if (!Number(result.changes)) return;
    db.prepare('UPDATE user_sessions SET revoked_at=? WHERE user_id=? AND revoked_at IS NULL').run(cutoff, userId);
    changed = true;
  });
  return changed;
};

export const updateBuyerAccount = (userId: string, input: { name?: string; avatarUrl?: string | null }): UserRow | null => {
  const assignments: string[] = [];
  const values: Array<string | null> = [];
  if (input.name !== undefined) { assignments.push('name = ?'); values.push(input.name); }
  if (input.avatarUrl !== undefined) { assignments.push('avatar_url = ?'); values.push(input.avatarUrl); }
  if (!assignments.length) return null;
  const result = db.prepare(`UPDATE users SET ${assignments.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND role IN ('Buyer', 'Parent')`)
    .run(...values, userId);
  if (!Number(result.changes)) return null;
  return (db.prepare('SELECT * FROM users WHERE id = ?').get(userId) as UserRow | undefined) ?? null;
};

export const createAccount = async (
  input: CreateAccountInput,
): Promise<UserRow> => {
  const id = randomUUID();

  db.prepare(
    `INSERT INTO users
       (id, name, email, password_hash, role, title, location, bio, profile_complete, account_status)
     VALUES
       (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.name,
    input.email,
    input.passwordHash,
    input.role,
    input.title,
    input.location,
    input.bio,
    input.profileComplete === false ? 0 : 1,
    input.role === 'Freelancer' ? 'PENDING_PARENT_APPROVAL' : 'ACTIVE',
  );

  const row = db.prepare('SELECT * FROM users WHERE id = ?').get(id) as
    | UserRow
    | undefined;

  if (!row) {
    throw new Error('Failed to create account');
  }

  return row;
};

export const completeGoogleProfileForUser = (
  userId: string,
  input: { name: string; role: Exclude<UserRole, 'Admin'>; title: string | null; location: string | null },
): UserRow | null => {
  db.prepare(`UPDATE users SET name = ?, role = ?, title = ?, location = ?, profile_complete = 1,
      account_status = CASE WHEN ? = 'Freelancer' THEN account_status ELSE 'ACTIVE' END
    WHERE id = ? AND profile_complete = 0`).run(
    input.name, input.role, input.title, input.location, input.role, userId,
  );
  return (db.prepare('SELECT * FROM users WHERE id = ? LIMIT 1').get(userId) as UserRow | undefined) ?? null;
};
