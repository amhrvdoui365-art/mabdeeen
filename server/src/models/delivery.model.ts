import { randomUUID } from 'node:crypto';
import { db, transaction } from '../config/db';

export type DeliveryStatus = 'pending_approval' | 'approved' | 'rejected' | 'revision_requested';

export interface Delivery {
  id: string;
  projectId: string;
  freelancerId: string;
  clientId: string;
  fileUrl: string;
  fileType: string;
  fileName: string;
  fileSize: number;
  status: DeliveryStatus;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string | null;
  sourceKind?: 'file' | 'website' | 'youtube' | 'drive';
}

export interface DeliveryRow {
  id: string;
  project_id: string;
  order_id?: string | null;
  freelancer_id: string;
  client_id: string;
  file_url: string;
  file_type: string;
  storage_key: string;
  file_name: string;
  file_size: number;
  status: DeliveryStatus;
  is_locked: number;
  created_at: string;
  updated_at: string;
  source_url?: string | null;
  source_kind?: 'file' | 'website' | 'youtube' | 'drive';
  service_title?: string;
}

const mapDelivery = (row: DeliveryRow): Delivery => ({
  id: row.id,
  projectId: row.project_id,
  freelancerId: row.freelancer_id,
  clientId: row.client_id,
  fileUrl: row.file_url,
  fileType: row.file_type,
  fileName: row.file_name,
  fileSize: Number(row.file_size),
  status: row.status,
  isLocked: Boolean(row.is_locked),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  sourceUrl: row.source_url ?? null,
  sourceKind: row.source_kind ?? 'file',
});

const SELECT_DELIVERY = `SELECT id, project_id, freelancer_id, client_id, file_url, file_type,
  order_id, storage_key, file_name, file_size, status, is_locked, created_at, updated_at, source_url, source_kind FROM deliveries`;

export const createDelivery = (input: {
  projectId: string;
  freelancerId: string;
  clientId: string;
  fileType: string;
  storageKey: string;
  fileName: string;
  fileSize: number;
  sourceUrl?: string | null;
  sourceKind?: 'file' | 'website' | 'youtube' | 'drive';
  orderId?: string;
}): DeliveryRow => {
  const id = randomUUID();
  const fileUrl = `/deliveries/${id}/file`;
  db.prepare(`INSERT INTO deliveries
    (id, project_id, order_id, freelancer_id, client_id, file_url, file_type, storage_key, file_name, file_size, source_url, source_kind)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(id, input.projectId, input.orderId ?? null, input.freelancerId, input.clientId, fileUrl, input.fileType,
      input.storageKey, input.fileName, input.fileSize, input.sourceUrl ?? null, input.sourceKind ?? 'file');
  return db.prepare(`${SELECT_DELIVERY} WHERE id = ?`).get(id) as unknown as DeliveryRow;
};

export const listDeliveriesForParticipant = (projectId: string, userId: string): Delivery[] =>
  (db.prepare(`${SELECT_DELIVERY} WHERE project_id = ? AND archived_at IS NULL AND (freelancer_id = ? OR client_id = ?)
    ORDER BY created_at DESC, id DESC`).all(projectId, userId, userId) as unknown as DeliveryRow[])
    .map(mapDelivery);

export const listOrderDeliveries = (orderId: string, userId: string): Delivery[] =>
  (db.prepare(`${SELECT_DELIVERY} WHERE order_id = ? AND (freelancer_id = ? OR client_id = ?)
    ORDER BY created_at DESC, id DESC`).all(orderId, userId, userId) as unknown as DeliveryRow[]).map(mapDelivery);

export const listDeliveriesForVault = (userId: string): Array<Delivery & { serviceTitle: string }> =>
  (db.prepare(`SELECT d.id, d.project_id, d.freelancer_id, d.client_id, d.file_url, d.file_type, d.storage_key,
    d.file_name, d.file_size, d.status, d.is_locked, d.created_at, d.updated_at, d.source_url, d.source_kind,
    s.title AS service_title FROM deliveries d JOIN services s ON s.id = d.project_id
    WHERE (d.freelancer_id = ? OR d.client_id = ?)
    ORDER BY d.created_at DESC, d.id DESC`).all(userId, userId) as unknown as DeliveryRow[])
    .map((row) => ({ ...mapDelivery(row), serviceTitle: row.service_title ?? 'خدمة محذوفة' }));

export const findDeliveryForParticipant = (deliveryId: string, userId: string): DeliveryRow | null =>
  (db.prepare(`${SELECT_DELIVERY} WHERE id = ? AND (freelancer_id = ? OR client_id = ?) LIMIT 1`)
    .get(deliveryId, userId, userId) as DeliveryRow | undefined) ?? null;

export const approveDelivery = (deliveryId: string, clientId: string): { delivery: DeliveryRow; points: number } | null => {
  let result: { delivery: DeliveryRow; points: number } | null = null;
  transaction(() => {
    const updated = db.prepare(`UPDATE deliveries SET status = 'approved', is_locked = 0,
      archived_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'),
      updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
      WHERE id = ? AND client_id = ? AND status = 'pending_approval' AND is_locked = 1`)
      .run(deliveryId, clientId);
    if (!Number(updated.changes)) return;

    const delivery = db.prepare(`${SELECT_DELIVERY} WHERE id = ?`).get(deliveryId) as unknown as DeliveryRow;
    if (delivery.order_id) db.prepare(`UPDATE service_orders SET status = 'completed', completed_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'delivered'`).run(delivery.order_id);
    const sourceType = delivery.order_id ? 'service_order' : 'delivery';
    const sourceId = delivery.order_id ?? delivery.id;
    const pointsReward = Number((db.prepare("SELECT value FROM app_settings WHERE key='accepted_delivery_points'").get() as { value: string } | undefined)?.value ?? 50);
    const awarded = db.prepare("INSERT OR IGNORE INTO points_transactions (id, user_id, amount, reason, source_type, source_id) VALUES (?, ?, ?, 'Accepted final delivery', ?, ?)").run(randomUUID(), delivery.freelancer_id, pointsReward, sourceType, sourceId);
    const points = Number(awarded.changes) ? pointsReward : 0;
    if (points) db.prepare('UPDATE users SET points = points + ?, lifetime_points = lifetime_points + ? WHERE id = ?').run(points, points, delivery.freelancer_id);
    result = { delivery, points };
  });
  return result;
};

export const requestDeliveryRevision = (deliveryId: string, clientId: string): DeliveryRow | null => {
  const updated = db.prepare(`UPDATE deliveries SET status = 'revision_requested',
    updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now')
    WHERE id = ? AND client_id = ? AND status = 'pending_approval' AND is_locked = 1`)
    .run(deliveryId, clientId);
  if (!Number(updated.changes)) return null;
  const delivery = db.prepare(`${SELECT_DELIVERY} WHERE id = ?`).get(deliveryId) as unknown as DeliveryRow;
  if (delivery.order_id) db.prepare(`UPDATE service_orders SET status = 'revision_requested', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ? AND status = 'delivered'`).run(delivery.order_id);
  return delivery;
};

export const getPointsBalance = (userId: string): number => {
  const row = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined;
  return Number(row?.points ?? 0);
};

export const getRewardsSnapshot = (userId: string) => {
  const account = db.prepare(`SELECT points, lifetime_points, verified_until, premium_badge_until, featured_until, is_featured
    FROM users WHERE id = ?`).get(userId) as {
      points: number; lifetime_points: number; verified_until: string | null; premium_badge_until: string | null;
      featured_until: string | null; is_featured: number;
    } | undefined;
  const transactions = db.prepare(`SELECT id, amount, reason, created_at FROM points_transactions
    WHERE user_id = ? ORDER BY created_at DESC, id DESC LIMIT 30`).all(userId) as Array<{
      id: string; amount: number; reason: string; created_at: string;
    }>;
  return {
    points: Number(account?.points ?? 0),
    lifetimePoints: Number(account?.lifetime_points ?? account?.points ?? 0),
    claimedMilestones: (db.prepare('SELECT milestone, reward_code AS rewardCode, expires_at AS expiresAt FROM reward_claims WHERE user_id = ? ORDER BY milestone').all(userId) as Array<{ milestone: number; rewardCode: string; expiresAt: string }>),
    benefits: {
      verifiedUntil: account?.verified_until ?? null,
      premiumBadgeUntil: account?.premium_badge_until ?? null,
      featuredUntil: account?.featured_until ?? null,
      isFeatured: Boolean(account?.is_featured),
      featuredServices: db.prepare("SELECT id, title, featured_until AS expiresAt FROM services WHERE freelancer_id = ? AND featured_until > strftime('%Y-%m-%dT%H:%M:%fZ', 'now') ORDER BY featured_until DESC").all(userId) as Array<{ id: string; title: string; expiresAt: string }>,
    },
    transactions: transactions.map((item) => ({
      id: item.id, amount: Number(item.amount), reason: item.reason, createdAt: item.created_at,
    })),
  };
};

export const redeemPointsReward = (
  userId: string,
  reward: { code: string; cost: number; durationDays: number; label: string; benefitColumn: 'verified_until' | 'premium_badge_until' | 'featured_until' },
): { points: number; expiresAt: string } | null => {
  let result: { points: number; expiresAt: string } | null = null;
  transaction(() => {
    const account = db.prepare(`SELECT points, ${reward.benefitColumn} AS expires_at FROM users WHERE id = ?`)
      .get(userId) as { points: number; expires_at: string | null } | undefined;
    if (!account || account.points < reward.cost) return;

    const now = Date.now();
    const currentExpiry = account.expires_at ? Date.parse(account.expires_at) : 0;
    const expiresAt = new Date(Math.max(now, Number.isFinite(currentExpiry) ? currentExpiry : 0) + reward.durationDays * 86_400_000).toISOString();
    const updated = db.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?')
      .run(reward.cost, userId, reward.cost);
    if (!Number(updated.changes)) return;

    if (reward.benefitColumn === 'featured_until') {
      db.prepare(`UPDATE users SET is_featured = 1, featured_until = ? WHERE id = ?`).run(expiresAt, userId);
    } else {
      db.prepare(`UPDATE users SET ${reward.benefitColumn} = ? WHERE id = ?`).run(expiresAt, userId);
    }
    const redemptionId = randomUUID();
    db.prepare(`INSERT INTO reward_redemptions (id, user_id, reward_code, points_cost, expires_at)
      VALUES (?, ?, ?, ?, ?)`)
      .run(redemptionId, userId, reward.code, reward.cost, expiresAt);
    db.prepare(`INSERT INTO points_transactions (id, user_id, amount, reason, source_type, source_id)
      VALUES (?, ?, ?, ?, 'reward', ?)`)
      .run(randomUUID(), userId, -reward.cost, `استبدال مكافأة: ${reward.label}`, redemptionId);
    result = { points: getPointsBalance(userId), expiresAt };
  });
  return result;
};

export const redeemServiceFeaturedReward = (userId: string, serviceId: string, input: { cost: number; durationDays: number; label: string }): { points: number; expiresAt: string } | null => {
  let result: { points: number; expiresAt: string } | null = null;
  transaction(() => {
    const service = db.prepare('SELECT featured_until FROM services WHERE id = ? AND freelancer_id = ? AND status = ?').get(serviceId, userId, 'active') as { featured_until: string | null } | undefined;
    const account = db.prepare('SELECT points FROM users WHERE id = ?').get(userId) as { points: number } | undefined;
    if (!service || !account || account.points < input.cost) return;
    const prior = service.featured_until ? Date.parse(service.featured_until) : 0;
    const expiresAt = new Date(Math.max(Date.now(), Number.isFinite(prior) ? prior : 0) + input.durationDays * 86_400_000).toISOString();
    if (!Number(db.prepare('UPDATE users SET points = points - ? WHERE id = ? AND points >= ?').run(input.cost, userId, input.cost).changes)) return;
    db.prepare('UPDATE services SET featured_until = ? WHERE id = ? AND freelancer_id = ?').run(expiresAt, serviceId, userId);
    const redemptionId = randomUUID();
    db.prepare('INSERT INTO reward_redemptions (id, user_id, reward_code, points_cost, expires_at) VALUES (?, ?, ?, ?, ?)').run(redemptionId, userId, 'featured_week', input.cost, expiresAt);
    db.prepare("INSERT INTO points_transactions (id, user_id, amount, reason, source_type, source_id) VALUES (?, ?, ?, ?, 'reward', ?)").run(randomUUID(), userId, -input.cost, `${input.label} (${serviceId})`, redemptionId);
    result = { points: getPointsBalance(userId), expiresAt };
  });
  return result;
};

export const claimPointsMilestone = (userId: string, milestone: number, reward: { code: string; durationDays: number; benefitColumn: 'verified_until' | 'premium_badge_until' | 'featured_until' }): { expiresAt: string } | null => {
  let result: { expiresAt: string } | null = null;
  transaction(() => {
    const account = db.prepare('SELECT lifetime_points, ' + reward.benefitColumn + ' AS expires_at FROM users WHERE id = ?').get(userId) as { lifetime_points: number; expires_at: string | null } | undefined;
    if (!account || Number(account.lifetime_points) < milestone) return;
    const now = Date.now();
    const prior = account.expires_at ? Date.parse(account.expires_at) : 0;
    const expiresAt = new Date(Math.max(now, Number.isFinite(prior) ? prior : 0) + reward.durationDays * 86_400_000).toISOString();
    const inserted = db.prepare(`INSERT OR IGNORE INTO reward_claims (id, user_id, milestone, reward_code, expires_at) VALUES (?, ?, ?, ?, ?)`)
      .run(randomUUID(), userId, milestone, reward.code, expiresAt);
    if (!Number(inserted.changes)) return;
    if (reward.benefitColumn === 'featured_until') db.prepare('UPDATE users SET is_featured = 1, featured_until = ? WHERE id = ?').run(expiresAt, userId);
    else db.prepare(`UPDATE users SET ${reward.benefitColumn} = ? WHERE id = ?`).run(expiresAt, userId);
    result = { expiresAt };
  });
  return result;
};
