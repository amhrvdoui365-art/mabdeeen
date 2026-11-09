import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { SCHEMA_SQL, USERS_TABLE_SQL } from '../database/schema';
import { seedArticles, seedDatabase } from '../database/seed';
import { databasePath } from './paths';

mkdirSync(path.dirname(databasePath), { recursive: true });

export const db = new DatabaseSync(databasePath);

db.exec("PRAGMA encoding = 'UTF-8';");
db.exec('PRAGMA busy_timeout = 5000;');
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

const USER_COLUMN_MIGRATIONS: Array<{ name: string; sql: string }> = [
  { name: 'github_url', sql: 'ALTER TABLE users ADD COLUMN github_url TEXT' },
  { name: 'linkedin_url', sql: 'ALTER TABLE users ADD COLUMN linkedin_url TEXT' },
  { name: 'website_url', sql: 'ALTER TABLE users ADD COLUMN website_url TEXT' },
  {
    name: 'is_available',
    sql: 'ALTER TABLE users ADD COLUMN is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1))',
  },
  {
    name: 'is_verified',
    sql: 'ALTER TABLE users ADD COLUMN is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1))',
  },
  { name: 'featured_until', sql: 'ALTER TABLE users ADD COLUMN featured_until TEXT' },
  {
    name: 'avg_response_hours',
    sql: 'ALTER TABLE users ADD COLUMN avg_response_hours REAL CHECK (avg_response_hours IS NULL OR avg_response_hours >= 0)',
  },
  { name: 'token_invalid_before', sql: 'ALTER TABLE users ADD COLUMN token_invalid_before TEXT' },
  { name: 'parent_phone', sql: 'ALTER TABLE users ADD COLUMN parent_phone TEXT' },
  { name: 'parent_photo', sql: 'ALTER TABLE users ADD COLUMN parent_photo TEXT' },
  { name: 'parent_approval_token', sql: 'ALTER TABLE users ADD COLUMN parent_approval_token TEXT' },
  { name: 'account_status', sql: "ALTER TABLE users ADD COLUMN account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'PENDING_PARENT_APPROVAL', 'PENDING_ADMIN_REVIEW', 'REJECTED'))" },
  {
    name: 'profile_complete',
    sql: 'ALTER TABLE users ADD COLUMN profile_complete INTEGER NOT NULL DEFAULT 1 CHECK (profile_complete IN (0, 1))',
  },
  { name: 'points', sql: 'ALTER TABLE users ADD COLUMN points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0)' },
  { name: 'lifetime_points', sql: 'ALTER TABLE users ADD COLUMN lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0)' },
  { name: 'verified_until', sql: 'ALTER TABLE users ADD COLUMN verified_until TEXT' },
  { name: 'premium_badge_until', sql: 'ALTER TABLE users ADD COLUMN premium_badge_until TEXT' },
];

const ensureServiceColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(services)').all() as unknown as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  if (!existing.has('media_json')) db.exec("ALTER TABLE services ADD COLUMN media_json TEXT NOT NULL DEFAULT '[]'");
  if (!existing.has('sources_json')) db.exec("ALTER TABLE services ADD COLUMN sources_json TEXT NOT NULL DEFAULT '[]'");
  if (!existing.has('featured_until')) db.exec('ALTER TABLE services ADD COLUMN featured_until TEXT');
  db.exec('CREATE INDEX IF NOT EXISTS idx_services_featured_until ON services (featured_until)');
};

const ensureOrderColumns = (): void => {
  const deliveryColumns = db.prepare('PRAGMA table_info(deliveries)').all() as unknown as Array<{ name: string }>;
  if (deliveryColumns.length && !deliveryColumns.some((column) => column.name === 'order_id')) {
    db.exec('ALTER TABLE deliveries ADD COLUMN order_id TEXT REFERENCES service_orders (id) ON DELETE SET NULL');
  }
  const reviewColumns = db.prepare('PRAGMA table_info(reviews)').all() as unknown as Array<{ name: string }>;
  if (reviewColumns.length && !reviewColumns.some((column) => column.name === 'order_id')) {
    db.exec('ALTER TABLE reviews ADD COLUMN order_id TEXT REFERENCES service_orders (id) ON DELETE SET NULL');
  }
  if (reviewColumns.length) db.exec('CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_one_per_order ON reviews (order_id) WHERE order_id IS NOT NULL');
};

const ensureArticleColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(articles)').all() as unknown as Array<{ name: string }>;
  if (rows.length && !rows.some((row) => row.name === 'author_id')) {
    db.exec('ALTER TABLE articles ADD COLUMN author_id TEXT REFERENCES users (id) ON DELETE SET NULL');
  }
};

const ensureMessageAttachmentColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(messages)').all() as unknown as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  const additions: Array<[string, string]> = [
    ['attachment_storage_key', 'TEXT'], ['attachment_name', 'TEXT'], ['attachment_mime', 'TEXT'],
    ['attachment_size', 'INTEGER CHECK (attachment_size IS NULL OR attachment_size >= 0)'],
  ];
  for (const [name, type] of additions) {
    if (!existing.has(name)) db.exec(`ALTER TABLE messages ADD COLUMN ${name} ${type}`);
  }
};

const ensureDeliveryVaultColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(deliveries)').all() as unknown as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  if (!existing.has('source_url')) db.exec('ALTER TABLE deliveries ADD COLUMN source_url TEXT');
  if (!existing.has('source_kind')) db.exec("ALTER TABLE deliveries ADD COLUMN source_kind TEXT NOT NULL DEFAULT 'file'");
  if (!existing.has('archived_at')) db.exec('ALTER TABLE deliveries ADD COLUMN archived_at TEXT');
  db.exec("UPDATE deliveries SET archived_at = updated_at WHERE status = 'approved' AND archived_at IS NULL");
};

const ensureParentLinkColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(parent_child_links)').all() as unknown as Array<{ name: string }>;
  if (!rows.length) return;
  const existing = new Set(rows.map((row) => row.name));
  if (!existing.has('chat_access_enabled')) db.exec('ALTER TABLE parent_child_links ADD COLUMN chat_access_enabled INTEGER NOT NULL DEFAULT 0 CHECK (chat_access_enabled IN (0, 1))');
  if (!existing.has('parent_display_name')) db.exec('ALTER TABLE parent_child_links ADD COLUMN parent_display_name TEXT');
  if (!existing.has('parent_avatar_data_url')) db.exec('ALTER TABLE parent_child_links ADD COLUMN parent_avatar_data_url TEXT');
};

const ensureParentVerificationColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(parent_verifications)').all() as unknown as Array<{ name: string }>;
  const existing = new Set(rows.map((row) => row.name));
  if (!existing.has('parent_email')) db.exec('ALTER TABLE parent_verifications ADD COLUMN parent_email TEXT');
};

const migrateUserNotificationTypes = (): void => {
  const table = db.prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'user_notifications'")
    .get() as { sql: string } | undefined;
  if (!table || (table.sql.includes("'NEW_POST_LIKE'") && table.sql.includes("'PARENT_LINK_REQUEST'"))) return;

  db.exec('BEGIN');
  try {
    db.exec('ALTER TABLE user_notifications RENAME TO user_notifications_legacy');
    db.exec(`CREATE TABLE user_notifications (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('NEW_MESSAGE', 'NEW_REVIEW', 'ACCOUNT_STATUS', 'NEW_REPORT', 'ADMIN_ANNOUNCEMENT', 'NEW_POST_COMMENT', 'NEW_POST_LIKE', 'PARENT_LINK_REQUEST')),
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      link TEXT NOT NULL DEFAULT '/',
      is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
      created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
    )`);
    db.exec(`INSERT INTO user_notifications (id, user_id, type, title, message, link, is_read, created_at)
      SELECT id, user_id,
        CASE type WHEN 'message' THEN 'NEW_MESSAGE' WHEN 'review' THEN 'NEW_REVIEW'
          WHEN 'system' THEN 'ACCOUNT_STATUS' WHEN 'report' THEN 'NEW_REPORT'
          WHEN 'announcement' THEN 'ADMIN_ANNOUNCEMENT'
          WHEN 'PARENT_LINK_REQUEST' THEN 'PARENT_LINK_REQUEST'
          WHEN 'NEW_POST_COMMENT' THEN 'NEW_POST_COMMENT'
          WHEN 'NEW_POST_LIKE' THEN 'NEW_POST_LIKE' END,
        title, message, link, is_read, created_at
      FROM user_notifications_legacy
      WHERE type IN ('message', 'review', 'system', 'report', 'announcement', 'PARENT_LINK_REQUEST', 'NEW_POST_COMMENT', 'NEW_POST_LIKE')`);
    db.exec('DROP TABLE user_notifications_legacy');
    db.exec('CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox ON user_notifications (user_id, is_read, created_at DESC)');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const migrateCommunityInteractions = (): void => {
  const exists = (name: string): boolean => Boolean(db.prepare(
    "SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = ?",
  ).get(name));
  const hasLegacyLikes = exists('community_post_likes');
  const hasLegacyComments = exists('community_post_comments');
  if (!hasLegacyLikes && !hasLegacyComments) return;

  db.exec('BEGIN');
  try {
    if (hasLegacyLikes) {
      db.exec(`INSERT OR IGNORE INTO post_likes (id, post_id, user_id, created_at)
        SELECT lower(hex(randomblob(16))), post_id, user_id, created_at FROM community_post_likes`);
      db.exec('DROP TABLE community_post_likes');
    }
    if (hasLegacyComments) {
      db.exec(`INSERT OR IGNORE INTO post_comments (id, post_id, user_id, content, created_at)
        SELECT id, post_id, author_id, content, created_at FROM community_post_comments`);
      db.exec('DROP TABLE community_post_comments');
    }
    db.exec(`UPDATE community_posts SET likes_count =
      (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = community_posts.id)`);
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

const ensureUserColumns = (): void => {
  const rows = db.prepare('PRAGMA table_info(users)').all() as unknown as Array<{
    name: string;
  }>;
  const existing = new Set(rows.map((row) => row.name));

  for (const migration of USER_COLUMN_MIGRATIONS) {
    if (!existing.has(migration.name)) {
      db.exec(migration.sql);
    }
  }
};

const migrateUserRoleConstraint = (): void => {
  const table = db
    .prepare("SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'users'")
    .get() as { sql: string } | undefined;

  if (!table || table.sql.includes("'Parent'")) {
    return;
  }

  const nextTableSql = USERS_TABLE_SQL.replace(
    'CREATE TABLE IF NOT EXISTS users',
    'CREATE TABLE users_next',
  );

  db.exec('PRAGMA foreign_keys = OFF;');

  try {
    db.exec('BEGIN');

    try {
      db.exec('DROP VIEW IF EXISTS freelancer_stats;');
      db.exec(nextTableSql);
      db.exec(`
        INSERT INTO users_next (
          id, name, email, password_hash, phone, whatsapp_number, role, bio,
          title, location, min_budget, hourly_rate, avatar_url, parent_phone,
          parent_photo, parent_approval_token, account_status, github_url,
          linkedin_url, website_url, is_available, is_featured, is_verified,
          featured_until, avg_response_hours, token_invalid_before,
          profile_complete, is_active, created_at, updated_at
        )
        SELECT
          id, name, email, password_hash, phone, whatsapp_number, role, bio,
          title, location, min_budget, hourly_rate, avatar_url, parent_phone,
          parent_photo, parent_approval_token, account_status, github_url,
          linkedin_url, website_url, is_available, is_featured, is_verified,
          featured_until, avg_response_hours, token_invalid_before,
          profile_complete, is_active, created_at, updated_at
        FROM users;
      `);
      db.exec('DROP TABLE users;');
      db.exec('ALTER TABLE users_next RENAME TO users;');
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    db.exec(SCHEMA_SQL);
  } finally {
    db.exec('PRAGMA foreign_keys = ON;');
  }
};

// The users table must exist with every column before SCHEMA_SQL builds the
// indexes and views that reference them.
db.exec(USERS_TABLE_SQL);
ensureUserColumns();
db.exec(SCHEMA_SQL);
ensureParentVerificationColumns();
db.exec('UPDATE users SET lifetime_points = points WHERE lifetime_points = 0 AND points > 0');
ensureArticleColumns();
ensureServiceColumns();
ensureMessageAttachmentColumns();
ensureDeliveryVaultColumns();
ensureOrderColumns();
ensureParentLinkColumns();
migrateUserNotificationTypes();
migrateCommunityInteractions();
migrateUserRoleConstraint();

// Older versions treated linked guardians as Buyers. Promote only accounts
// that actually have parent-link records; all other Buyer accounts stay Buyers.
db.exec(`UPDATE users SET role = 'Parent' WHERE role = 'Buyer' AND id IN
  (SELECT DISTINCT parent_id FROM parent_child_links)`);

// Bring existing unverified creator accounts under the same parent approval
// gate as newly registered freelancers. Previously approved parent checks and
// accounts already verified by the administration remain active.
db.exec(`UPDATE users SET account_status = 'PENDING_PARENT_APPROVAL'
  WHERE role = 'Freelancer' AND is_active = 1 AND account_status = 'ACTIVE' AND is_verified = 0
    AND NOT EXISTS (
      SELECT 1 FROM parent_verifications v
      WHERE v.child_id = users.id AND v.status = 'APPROVED'
    )`);

db.exec(`UPDATE users SET profile_complete = CASE
  WHEN role = 'Freelancer'
    AND length(trim(name)) >= 2
    AND length(trim(COALESCE(title, ''))) >= 2
    AND length(trim(COALESCE(location, ''))) >= 2 THEN 1
  WHEN role IN ('Buyer', 'Parent', 'Admin') AND length(trim(name)) >= 2 THEN 1
  ELSE 0
END
WHERE profile_complete != CASE
  WHEN role = 'Freelancer'
    AND length(trim(name)) >= 2
    AND length(trim(COALESCE(title, ''))) >= 2
    AND length(trim(COALESCE(location, ''))) >= 2 THEN 1
  WHEN role IN ('Buyer', 'Parent', 'Admin') AND length(trim(name)) >= 2 THEN 1
  ELSE 0
END`);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_users_available
    ON users (is_active, is_available, is_featured DESC, created_at DESC);
`);

seedDatabase(db);
const platformWasWiped = db.prepare("SELECT 1 FROM app_settings WHERE key='platform_data_wiped' AND value='1'").get();
if (!platformWasWiped) seedArticles(db);

export const transaction = <T>(work: () => T): T => {
  db.exec('BEGIN');

  try {
    const result = work();
    db.exec('COMMIT');
    return result;
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
};

export const closeDatabase = (): void => {
  db.close();
};
