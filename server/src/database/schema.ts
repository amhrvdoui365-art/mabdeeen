export const USERS_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL CHECK (length(trim(name)) >= 2),
  email TEXT NOT NULL COLLATE NOCASE UNIQUE,
  password_hash TEXT NOT NULL,
  phone TEXT,
  whatsapp_number TEXT,
  role TEXT NOT NULL DEFAULT 'Freelancer' CHECK (role IN ('Freelancer', 'Admin', 'Buyer', 'Parent')),
  bio TEXT,
  title TEXT,
  location TEXT,
  min_budget REAL CHECK (min_budget IS NULL OR min_budget >= 0),
  hourly_rate REAL CHECK (hourly_rate IS NULL OR hourly_rate >= 0),
  avatar_url TEXT,
  parent_phone TEXT,
  parent_photo TEXT,
  parent_approval_token TEXT,
  account_status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (account_status IN ('ACTIVE', 'PENDING_PARENT_APPROVAL', 'PENDING_ADMIN_REVIEW', 'REJECTED')),
  github_url TEXT,
  linkedin_url TEXT,
  website_url TEXT,
  is_available INTEGER NOT NULL DEFAULT 1 CHECK (is_available IN (0, 1)),
  is_featured INTEGER NOT NULL DEFAULT 0 CHECK (is_featured IN (0, 1)),
  is_verified INTEGER NOT NULL DEFAULT 0 CHECK (is_verified IN (0, 1)),
  featured_until TEXT,
  avg_response_hours REAL CHECK (avg_response_hours IS NULL OR avg_response_hours >= 0),
  token_invalid_before TEXT,
  profile_complete INTEGER NOT NULL DEFAULT 1 CHECK (profile_complete IN (0, 1)),
  points INTEGER NOT NULL DEFAULT 0 CHECK (points >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  verified_until TEXT,
  premium_badge_until TEXT,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
`;

export const SCHEMA_SQL = `${USERS_TABLE_SQL}
CREATE TABLE IF NOT EXISTS articles (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  excerpt TEXT NOT NULL,
  content TEXT NOT NULL,
  cover_image TEXT NOT NULL,
  category TEXT NOT NULL,
  author_name TEXT NOT NULL,
  author_avatar TEXT,
  author_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  published_at TEXT NOT NULL,
  read_time INTEGER NOT NULL CHECK (read_time > 0)
);
CREATE INDEX IF NOT EXISTS idx_articles_published ON articles (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_articles_category_published ON articles (category, published_at DESC);

CREATE TABLE IF NOT EXISTS community_posts (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL CHECK (length(trim(title)) BETWEEN 3 AND 160),
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 20 AND 12000),
  cover_image TEXT,
  author_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  author_role TEXT NOT NULL CHECK (author_role IN ('FREELANCER', 'CLIENT', 'ADMIN')),
  category TEXT NOT NULL CHECK (category IN ('تجربتي', 'درس برمجة', 'مشروعي', 'نصائح', 'أخرى')),
  status TEXT NOT NULL DEFAULT 'PUBLISHED' CHECK (status IN ('PUBLISHED', 'DRAFT')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  views_count INTEGER NOT NULL DEFAULT 0 CHECK (views_count >= 0),
  likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0)
);
CREATE INDEX IF NOT EXISTS idx_community_posts_feed ON community_posts (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_community_posts_author ON community_posts (author_id, created_at DESC);

CREATE TABLE IF NOT EXISTS skills (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL COLLATE NOCASE UNIQUE
);

CREATE TABLE IF NOT EXISTS user_skills (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  skill_id TEXT NOT NULL REFERENCES skills (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, skill_id)
);

CREATE TABLE IF NOT EXISTS portfolio_items (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  image_url TEXT,
  project_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price REAL NOT NULL CHECK (price >= 0),
  category TEXT NOT NULL,
  media_json TEXT NOT NULL DEFAULT '[]',
  sources_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  featured_until TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS service_orders (
  id TEXT PRIMARY KEY NOT NULL,
  service_id TEXT REFERENCES services (id) ON DELETE SET NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  buyer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  service_title TEXT NOT NULL,
  price_snapshot REAL NOT NULL CHECK (price_snapshot >= 0),
  brief TEXT NOT NULL CHECK (length(trim(brief)) BETWEEN 5 AND 4000),
  status TEXT NOT NULL DEFAULT 'requested' CHECK (status IN ('requested', 'accepted', 'rejected', 'in_progress', 'delivered', 'revision_requested', 'completed', 'cancelled')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at TEXT,
  completed_at TEXT,
  CHECK (freelancer_id <> buyer_id)
);
CREATE INDEX IF NOT EXISTS idx_service_orders_buyer ON service_orders (buyer_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_service_orders_freelancer ON service_orders (freelancer_id, updated_at DESC);

CREATE TABLE IF NOT EXISTS order_messages (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES service_orders (id) ON DELETE CASCADE,
  sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 4000),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_order_messages_order ON order_messages (order_id, created_at ASC);

CREATE TABLE IF NOT EXISTS admin_order_cases (
  id TEXT PRIMARY KEY NOT NULL,
  order_id TEXT NOT NULL REFERENCES service_orders (id) ON DELETE CASCADE,
  opened_by TEXT NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  reason TEXT NOT NULL CHECK (length(trim(reason)) BETWEEN 5 AND 2000),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'RESOLVED')),
  resolution TEXT,
  resolved_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_admin_order_cases_status ON admin_order_cases (status, created_at DESC);

CREATE TABLE IF NOT EXISTS messages (
  id TEXT PRIMARY KEY NOT NULL,
  sender_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  receiver_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  service_id TEXT REFERENCES services (id) ON DELETE SET NULL,
  content TEXT NOT NULL CHECK (length(trim(content)) BETWEEN 1 AND 2000),
  attachment_storage_key TEXT,
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size INTEGER CHECK (attachment_size IS NULL OR attachment_size >= 0),
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (sender_id <> receiver_id)
);

CREATE TABLE IF NOT EXISTS deliveries (
  id TEXT PRIMARY KEY NOT NULL,
  project_id TEXT NOT NULL REFERENCES services (id) ON DELETE CASCADE,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  client_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL CHECK (file_size > 0),
  source_url TEXT,
  source_kind TEXT NOT NULL DEFAULT 'file' CHECK (source_kind IN ('file', 'website', 'youtube', 'drive')),
  archived_at TEXT,
  status TEXT NOT NULL DEFAULT 'pending_approval' CHECK (status IN ('pending_approval', 'approved', 'rejected', 'revision_requested')),
  is_locked INTEGER NOT NULL DEFAULT 1 CHECK (is_locked IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_deliveries_project ON deliveries (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_deliveries_client ON deliveries (client_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS points_transactions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  amount INTEGER NOT NULL CHECK (amount <> 0),
  reason TEXT NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_points_transactions_user ON points_transactions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reward_redemptions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reward_code TEXT NOT NULL,
  points_cost INTEGER NOT NULL CHECK (points_cost > 0),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user ON reward_redemptions (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reward_claims (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  milestone INTEGER NOT NULL CHECK (milestone IN (100, 200, 250, 500, 1000, 2500)),
  reward_code TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  UNIQUE (user_id, milestone)
);
CREATE INDEX IF NOT EXISTS idx_reward_claims_user ON reward_claims (user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS support_tickets (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  guest_email TEXT,
  subject TEXT NOT NULL CHECK (length(trim(subject)) BETWEEN 3 AND 120),
  status TEXT NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'CLOSED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (user_id IS NOT NULL OR guest_email IS NOT NULL)
);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY NOT NULL,
  ticket_id TEXT NOT NULL REFERENCES support_tickets (id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL CHECK (sender_type IN ('USER', 'ADMIN')),
  sender_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  message TEXT NOT NULL DEFAULT '' CHECK (length(message) <= 4000),
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IS NULL OR attachment_type IN ('IMAGE', 'VIDEO', 'FILE')),
  attachment_name TEXT,
  attachment_mime TEXT,
  attachment_size INTEGER CHECK (attachment_size IS NULL OR attachment_size >= 0),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK (length(trim(message)) > 0 OR attachment_url IS NOT NULL)
);
CREATE INDEX IF NOT EXISTS idx_support_tickets_user_updated ON support_tickets (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_admin_updated ON support_tickets (status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON support_messages (ticket_id, created_at ASC);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  client_name TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  order_id TEXT REFERENCES service_orders (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY NOT NULL,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS profile_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  freelancer_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  event_type TEXT NOT NULL CHECK (event_type = 'View'),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_notifications (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('NEW_MESSAGE', 'NEW_REVIEW', 'ACCOUNT_STATUS', 'NEW_REPORT', 'ADMIN_ANNOUNCEMENT', 'NEW_POST_COMMENT', 'NEW_POST_LIKE', 'PARENT_LINK_REQUEST')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '/',
  is_read INTEGER NOT NULL DEFAULT 0 CHECK (is_read IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS parent_child_links (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  chat_access_enabled INTEGER NOT NULL DEFAULT 0 CHECK (chat_access_enabled IN (0, 1)),
  parent_display_name TEXT,
  parent_avatar_data_url TEXT,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  responded_at TEXT,
  CHECK (parent_id <> child_id)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_parent_child_pending ON parent_child_links(parent_id, child_id) WHERE status = 'PENDING';
CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_child_links(parent_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_parent_links_child ON parent_child_links(child_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS parent_access_logs (
  id TEXT PRIMARY KEY NOT NULL,
  parent_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  child_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('VIEW_CONVERSATIONS', 'VIEW_MESSAGES')),
  peer_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);
CREATE INDEX IF NOT EXISTS idx_parent_access_logs_child ON parent_access_logs(child_id, created_at DESC);

CREATE TABLE IF NOT EXISTS parent_verifications (
  id TEXT PRIMARY KEY NOT NULL,
  child_id TEXT NOT NULL UNIQUE REFERENCES users (id) ON DELETE CASCADE,
  parent_phone TEXT,
  parent_email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  challenge_a INTEGER NOT NULL,
  challenge_b INTEGER NOT NULL,
  parent_photo_path TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING_PARENT_APPROVAL' CHECK (status IN ('PENDING_PARENT_APPROVAL', 'PENDING_ADMIN_REVIEW', 'APPROVED', 'REJECTED')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  submitted_at TEXT,
  reviewed_at TEXT,
  reviewed_by TEXT REFERENCES users (id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_parent_verifications_status ON parent_verifications(status, created_at);

CREATE TABLE IF NOT EXISTS post_likes (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT REFERENCES community_posts (id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NOT NULL) + (article_id IS NOT NULL) = 1)
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user_post ON post_likes (post_id, user_id) WHERE post_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_user_article ON post_likes (article_id, user_id) WHERE article_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS post_comments (
  id TEXT PRIMARY KEY NOT NULL,
  post_id TEXT REFERENCES community_posts (id) ON DELETE CASCADE,
  article_id TEXT REFERENCES articles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  content TEXT NOT NULL DEFAULT '' CHECK (length(trim(content)) <= 2000),
  attachment_url TEXT,
  attachment_type TEXT CHECK (attachment_type IS NULL OR attachment_type IN ('IMAGE', 'VIDEO', 'FILE')),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  CHECK ((post_id IS NOT NULL) + (article_id IS NOT NULL) = 1),
  CHECK (length(trim(content)) > 0 OR attachment_url IS NOT NULL),
  CHECK ((attachment_url IS NULL) = (attachment_type IS NULL))
);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON post_comments (post_id, created_at) WHERE post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_post_comments_article ON post_comments (article_id, created_at) WHERE article_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS admin_audit_logs (
  id TEXT PRIMARY KEY NOT NULL,
  admin_id TEXT REFERENCES users (id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  subject_type TEXT NOT NULL,
  subject_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  metadata_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE INDEX IF NOT EXISTS idx_users_discovery
  ON users (is_active, is_featured DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_location ON users (location);
CREATE INDEX IF NOT EXISTS idx_users_min_budget ON users (min_budget);
CREATE INDEX IF NOT EXISTS idx_users_name ON users (name);
CREATE INDEX IF NOT EXISTS idx_user_skills_skill ON user_skills (skill_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_user ON portfolio_items (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_services_freelancer_status ON services (freelancer_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages (sender_id, receiver_id, service_id, created_at);
CREATE INDEX IF NOT EXISTS idx_messages_receiver_unread ON messages (receiver_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reviews_freelancer ON reviews (freelancer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports (status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_freelancer ON reports (freelancer_id);
CREATE INDEX IF NOT EXISTS idx_profile_events_freelancer
  ON profile_events (freelancer_id, event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_active
  ON notifications (is_active, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_notifications_inbox
  ON user_notifications (user_id, is_read, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_created
  ON admin_audit_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS app_settings (
  key TEXT PRIMARY KEY NOT NULL,
  value TEXT NOT NULL,
  updated_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_key TEXT NOT NULL UNIQUE,
  user_id TEXT REFERENCES users (id) ON DELETE CASCADE,
  ip TEXT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  agent_hash TEXT NOT NULL,
  route_count INTEGER NOT NULL DEFAULT 1,
  first_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  last_seen TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  revoked_at TEXT
);

CREATE TABLE IF NOT EXISTS ip_blocks (
  ip TEXT PRIMARY KEY NOT NULL,
  reason TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  expires_at TEXT
);

CREATE TABLE IF NOT EXISTS moderation_flags (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  field TEXT NOT NULL,
  rule TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high')),
  excerpt TEXT NOT NULL,
  suggestion TEXT,
  status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved', 'Dismissed')),
  resolved_by TEXT REFERENCES users (id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  resolved_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_last_seen
  ON user_sessions (last_seen DESC, route_count DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions (user_id);

CREATE INDEX IF NOT EXISTS idx_moderation_status
  ON moderation_flags (status, severity, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderation_user ON moderation_flags (user_id);

CREATE INDEX IF NOT EXISTS idx_users_verified
  ON users (is_verified, is_active, is_featured DESC);

CREATE TRIGGER IF NOT EXISTS trg_users_updated_at
AFTER UPDATE ON users
FOR EACH ROW
WHEN NEW.updated_at = OLD.updated_at
BEGIN
  UPDATE users
  SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
  WHERE id = NEW.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_users_profile_completion
AFTER UPDATE OF name, role, title, location ON users
FOR EACH ROW
WHEN NEW.profile_complete != CASE
  WHEN NEW.role = 'Freelancer'
    AND length(trim(NEW.name)) >= 2
    AND length(trim(COALESCE(NEW.title, ''))) >= 2
    AND length(trim(COALESCE(NEW.location, ''))) >= 2 THEN 1
  WHEN NEW.role IN ('Buyer', 'Parent', 'Admin') AND length(trim(NEW.name)) >= 2 THEN 1
  ELSE 0
END
BEGIN
  UPDATE users SET profile_complete = CASE
    WHEN NEW.role = 'Freelancer'
      AND length(trim(NEW.name)) >= 2
      AND length(trim(COALESCE(NEW.title, ''))) >= 2
      AND length(trim(COALESCE(NEW.location, ''))) >= 2 THEN 1
    WHEN NEW.role IN ('Buyer', 'Parent', 'Admin') AND length(trim(NEW.name)) >= 2 THEN 1
    ELSE 0
  END
  WHERE id = NEW.id;
END;

CREATE VIEW IF NOT EXISTS freelancer_stats AS
SELECT
  u.id AS freelancer_id,
  (SELECT COUNT(*) FROM reviews r WHERE r.freelancer_id = u.id) AS review_count,
  COALESCE(
    (SELECT ROUND(AVG(r.rating), 2) FROM reviews r WHERE r.freelancer_id = u.id),
    0
  ) AS avg_rating,
  (SELECT COUNT(*) FROM profile_events pe
   WHERE pe.freelancer_id = u.id AND pe.event_type = 'View') AS view_count
FROM users u;
`;
