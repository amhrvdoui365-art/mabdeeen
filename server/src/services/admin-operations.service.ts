import { randomUUID } from 'node:crypto';
import { db, transaction } from '../config/db';
import { getSetting, setSetting } from '../models/system.model';
import { AppError } from '../utils/app-error';
import { sanitizePlainText } from '../utils/sanitize';
import { createUserNotification } from '../models/notification.model';
import { emitRealtimeEvent } from './realtime.service';
import { signToken } from '../utils/jwt';
import { existsSync, rmSync } from 'node:fs';
import path from 'node:path';
import { resolveChatAttachmentPath, resolvePrivateDeliveryPath } from './upload.service';
import { databasePath, uploadsDir, privateChatFilesDir, privateDeliveriesDir, privateParentVerificationDir } from '../config/paths';

const REWARDS = [
  { code: 'premium_badge', title: 'شارة مبدع متميز', defaultCost: 100, durationDays: 30 },
  { code: 'featured_week', title: 'تمييز خدمة لمدة أسبوع', defaultCost: 200, durationDays: 7 },
  { code: 'verified_week', title: 'شارة موثوق لمدة أسبوع', defaultCost: 250, durationDays: 7 },
] as const;
const settingKey = (code: string) => `reward_cost_${code}`;
const audit = (adminId: string, action: string, subjectType: string, subjectId: string, reason: string, metadata: unknown = {}) => {
  db.prepare(`INSERT INTO admin_audit_logs (id, admin_id, action, subject_type, subject_id, reason, metadata_json)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(randomUUID(), adminId, action, subjectType, subjectId, reason, JSON.stringify(metadata));
};
const pagination = (page: number, limit: number) => ({ page, limit, totalPages: 0, totalItems: 0 });

export const startAdminImpersonation = (adminId: string, userId: string) => {
  const target = db.prepare('SELECT id,email,role,is_active FROM users WHERE id=?').get(userId) as
    { id: string; email: string; role: string; is_active: number } | undefined;
  if (!target) throw new AppError('الحساب غير موجود.', 404);
  if (target.role === 'Admin') throw new AppError('لا يمكن الدخول كحساب إداري آخر.', 403);
  if (!target.is_active) throw new AppError('فعّل الحساب قبل بدء جلسة المعاينة.', 409);
  audit(adminId, 'start_user_impersonation', 'user', userId, 'جلسة دعم مؤقتة', { expiresInMinutes: 15 });
  return { token: signToken({ sub: target.id, email: target.email, role: target.role as 'Buyer' | 'Parent' | 'Freelancer', impersonatedBy: adminId }, '15m'), expiresInSeconds: 900 };
};

export const wipePlatformData = (adminId: string) => {
  const adminIds = (db.prepare("SELECT id FROM users WHERE role='Admin'").all() as Array<{ id: string }>).map((row) => row.id);
  if (!adminIds.includes(adminId)) throw new AppError('لا يمكن تنفيذ الإجراء من هذا الحساب.', 403);
  const tables = (db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name <> 'users'").all() as Array<{ name: string }>).map((row) => row.name);
  const counts: Record<string, number> = {};
  transaction(() => {
    for (const table of tables) {
      const identifier = `"${table.replaceAll('"', '""')}"`;
      counts[table] = Number((db.prepare(`SELECT COUNT(*) AS count FROM ${identifier}`).get() as { count: number }).count);
      db.exec(`DELETE FROM ${identifier}`);
    }
    counts.users = Number((db.prepare("SELECT COUNT(*) AS count FROM users WHERE role <> 'Admin'").get() as { count: number }).count);
    db.prepare("DELETE FROM users WHERE role <> 'Admin'").run();
    const now = new Date().toISOString();
    db.prepare("UPDATE users SET token_invalid_before=? WHERE role='Admin'").run(now);
    db.prepare("INSERT OR REPLACE INTO app_settings (key,value,updated_by) VALUES ('platform_data_wiped','1',?)").run(adminId);
    audit(adminId, 'wipe_platform_data', 'platform', 'all', 'مسح جميع بيانات المنصة مع الإبقاء على حسابات الإدارة', { deletedRows: counts });
  });

  const serverRoot = path.resolve(__dirname, '../..');
  const directories = [
    { path: uploadsDir, name: 'uploads' },
    { path: privateChatFilesDir, name: 'private-chat-files' },
    { path: privateDeliveriesDir, name: 'private-deliveries' },
    { path: privateParentVerificationDir, name: 'private-parent-verification' },
  ];
  const warnings: string[] = [];
  for (const directory of directories) {
    const absolute = path.resolve(directory.path);
    const relative = path.relative(serverRoot, absolute);
    const databaseRelative = path.relative(absolute, path.resolve(databasePath));
    const containsDatabase = databaseRelative === '' || (!databaseRelative.startsWith(`..${path.sep}`) && databaseRelative !== '..' && !path.isAbsolute(databaseRelative));
    if (path.basename(absolute) !== directory.name || !relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative) || absolute === path.parse(absolute).root || containsDatabase) {
      warnings.push(`تم تجاوز مجلد خارج مساحة بيانات الخادم: ${path.basename(absolute)}`);
      continue;
    }
    try { rmSync(absolute, { recursive: true, force: true }); }
    catch { warnings.push(`تعذر تنظيف مجلد: ${path.basename(absolute)}`); }
  }
  return { deletedRows: counts, preservedAdminAccounts: adminIds.length, clearedUploadDirectories: directories.length - warnings.length, warnings };
};

export const finishAdminImpersonation = (adminId: string, userId: string) => {
  audit(adminId, 'stop_user_impersonation', 'user', userId, 'إنهاء جلسة الدعم');
};

export const listAdminOrders = (input: { q?: string; status?: string; page: number; limit: number }) => {
  const where: string[] = [];
  const params: Array<string | number> = [];
  if (input.status) { where.push('o.status = ?'); params.push(input.status); }
  if (input.q) { where.push('(o.service_title LIKE ? OR b.name LIKE ? OR b.email LIKE ? OR f.name LIKE ? OR f.email LIKE ? OR o.id LIKE ?)'); params.push(...Array(6).fill(`%${input.q}%`)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM service_orders o JOIN users b ON b.id=o.buyer_id JOIN users f ON f.id=o.freelancer_id ${clause}`).get(...params) as { n: number }).n);
  const items = db.prepare(`SELECT o.id, o.service_id AS serviceId, o.service_title AS serviceTitle,
    o.price_snapshot AS points, o.status, o.created_at AS createdAt, o.updated_at AS updatedAt,
    b.id AS buyerId, b.name AS buyerName, b.email AS buyerEmail,
    f.id AS freelancerId, f.name AS freelancerName, f.email AS freelancerEmail,
    c.id AS caseId, c.status AS caseStatus, c.reason AS caseReason
    FROM service_orders o JOIN users b ON b.id=o.buyer_id JOIN users f ON f.id=o.freelancer_id
    LEFT JOIN admin_order_cases c ON c.order_id=o.id AND c.status='OPEN' ${clause}
    ORDER BY CASE WHEN c.status='OPEN' THEN 0 ELSE 1 END, o.updated_at DESC
    LIMIT ? OFFSET ?`).all(...params, input.limit, (input.page - 1) * input.limit) as Array<Record<string, unknown> & { id: string }>;
  const deliveryQuery = db.prepare(`SELECT id, file_name AS name, file_type AS mimeType, file_size AS size,
    source_url AS sourceUrl, source_kind AS sourceKind FROM deliveries WHERE order_id=? ORDER BY created_at DESC`);
  for (const order of items) order.deliveries = deliveryQuery.all(order.id);
  return { items, pagination: { ...pagination(input.page, input.limit), totalItems: total, totalPages: Math.ceil(total / input.limit) } };
};

export const setAdminOrderStatus = (adminId: string, orderId: string, status: 'cancelled' | 'rejected', reasonInput: string) => {
  const order = db.prepare('SELECT id, buyer_id, freelancer_id, service_title, status FROM service_orders WHERE id=?').get(orderId) as { id: string; buyer_id: string; freelancer_id: string; service_title: string; status: string } | undefined;
  if (!order) throw new AppError('الطلب غير موجود.', 404);
  if (['completed', 'cancelled', 'rejected'].includes(order.status)) throw new AppError('الطلب منتهٍ بالفعل ولا يمكن تغيير حالته.', 409);
  const reason = sanitizePlainText(reasonInput).slice(0, 300);
  transaction(() => {
    db.prepare("UPDATE service_orders SET status=?, updated_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=?").run(status, orderId);
    db.prepare("UPDATE admin_order_cases SET status='RESOLVED', resolution=?, resolved_by=?, resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE order_id=? AND status='OPEN'").run(reason, adminId, orderId);
    audit(adminId, 'change_order_status', 'service_order', orderId, reason, { from: order.status, to: status });
  });
  for (const userId of [order.buyer_id, order.freelancer_id]) {
    createUserNotification(userId, 'NEW_MESSAGE', 'تحديث إداري على الطلب', `تم تحديث حالة طلب «${order.service_title}». السبب: ${reason}`, `/orders?id=${orderId}`);
    emitRealtimeEvent(userId, 'data');
  }
  return { id: orderId, status };
};

export const openAdminOrderCase = (adminId: string, orderId: string, reasonInput: string) => {
  const reason = sanitizePlainText(reasonInput).slice(0, 2000);
  const exists = db.prepare('SELECT id FROM service_orders WHERE id=?').get(orderId);
  if (!exists) throw new AppError('الطلب غير موجود.', 404);
  const existing = db.prepare("SELECT id FROM admin_order_cases WHERE order_id=? AND status='OPEN'").get(orderId) as { id: string } | undefined;
  if (existing) throw new AppError('يوجد بالفعل ملف مراجعة مفتوح لهذا الطلب.', 409);
  const id = randomUUID();
  db.prepare("INSERT INTO admin_order_cases (id,order_id,opened_by,reason) VALUES (?,?,?,?)").run(id, orderId, adminId, reason);
  audit(adminId, 'open_order_case', 'service_order', orderId, reason, { caseId: id });
  return { id, orderId, reason, status: 'OPEN' as const };
};

export const resolveAdminOrderCase = (adminId: string, caseId: string, resolutionInput: string) => {
  const resolution = sanitizePlainText(resolutionInput).slice(0, 2000);
  const result = db.prepare("UPDATE admin_order_cases SET status='RESOLVED', resolution=?, resolved_by=?, resolved_at=strftime('%Y-%m-%dT%H:%M:%fZ','now') WHERE id=? AND status='OPEN'").run(resolution, adminId, caseId);
  if (!Number(result.changes)) throw new AppError('ملف المراجعة غير موجود أو مغلق.', 404);
  const row = db.prepare('SELECT order_id AS orderId FROM admin_order_cases WHERE id=?').get(caseId) as { orderId: string };
  audit(adminId, 'resolve_order_case', 'service_order', row.orderId, resolution, { caseId });
  return { id: caseId, status: 'RESOLVED' as const, resolution };
};

export const listAdminServices = (input: { q?: string; status?: string; page: number; limit: number }) => {
  const where: string[] = [];
  const params: string[] = [];
  if (input.status) { where.push('s.status=?'); params.push(input.status); }
  if (input.q) { where.push('(s.title LIKE ? OR s.category LIKE ? OR u.name LIKE ? OR u.email LIKE ?)'); params.push(...Array(4).fill(`%${input.q}%`)); }
  const clause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM services s JOIN users u ON u.id=s.freelancer_id ${clause}`).get(...params) as { n: number }).n);
  const items = db.prepare(`SELECT s.id, s.title, s.category, s.price AS points, s.status, s.created_at AS createdAt,
    s.media_json AS media, s.sources_json AS sources,
    u.id AS freelancerId, u.name AS freelancerName, u.email AS freelancerEmail
    FROM services s JOIN users u ON u.id=s.freelancer_id ${clause} ORDER BY s.created_at DESC LIMIT ? OFFSET ?`)
    .all(...params, input.limit, (input.page - 1) * input.limit) as Array<{ [key: string]: unknown; media: unknown; sources: unknown }>;
  for (const item of items) {
    let media: Array<Record<string, unknown>> = [];
    let sources: Array<Record<string, unknown>> = [];
    try { media = JSON.parse(String(item.media ?? '[]')); } catch { /* Keep malformed legacy media out of the admin view. */ }
    try { sources = JSON.parse(String(item.sources ?? '[]')); } catch { /* Keep malformed legacy sources out of the admin view. */ }
    item.media = [...media, ...sources.map((source) => ({ ...source, type: 'link' }))];
  }
  return { items, pagination: { ...pagination(input.page, input.limit), totalItems: total, totalPages: Math.ceil(total / input.limit) } };
};

export const getAdminConversationAttachment = (adminId: string, messageId: string) => {
  const row = db.prepare('SELECT attachment_storage_key AS storageKey, attachment_name AS name, attachment_mime AS mimeType FROM messages WHERE id=? AND attachment_storage_key IS NOT NULL').get(messageId) as { storageKey: string; name: string; mimeType: string } | undefined;
  if (!row) throw new AppError('الملف غير موجود.', 404);
  const filePath = resolveChatAttachmentPath(row.storageKey);
  if (!existsSync(filePath)) throw new AppError('الملف غير متاح.', 404);
  audit(adminId, 'view_conversation_attachment', 'message', messageId, 'معاينة مرفق محادثة', { mimeType: row.mimeType });
  return { ...row, filePath };
};

export const getAdminOrderDelivery = (adminId: string, deliveryId: string) => {
  const row = db.prepare('SELECT storage_key AS storageKey, file_name AS name, file_type AS mimeType FROM deliveries WHERE id=? AND source_url IS NULL').get(deliveryId) as { storageKey: string; name: string; mimeType: string } | undefined;
  if (!row) throw new AppError('الملف غير موجود.', 404);
  const filePath = resolvePrivateDeliveryPath(row.storageKey);
  if (!existsSync(filePath)) throw new AppError('الملف غير متاح.', 404);
  audit(adminId, 'view_order_delivery', 'delivery', deliveryId, 'معاينة تسليم طلب', { mimeType: row.mimeType });
  return { ...row, filePath };
};

export const setAdminServiceStatus = (adminId: string, serviceId: string, status: 'active' | 'inactive', reasonInput: string) => {
  const reason = sanitizePlainText(reasonInput).slice(0, 300);
  const result = db.prepare('UPDATE services SET status=? WHERE id=?').run(status, serviceId);
  if (!Number(result.changes)) throw new AppError('الخدمة غير موجودة.', 404);
  audit(adminId, 'change_service_status', 'service', serviceId, reason, { status });
  const row = db.prepare('SELECT freelancer_id AS freelancerId, title FROM services WHERE id=?').get(serviceId) as { freelancerId: string; title: string };
  createUserNotification(row.freelancerId, 'NEW_MESSAGE', 'تحديث إداري على خدمتك', `تم ${status === 'active' ? 'إعادة نشر' : 'إيقاف'} الخدمة «${row.title}». السبب: ${reason}`, '/dashboard');
  emitRealtimeEvent(row.freelancerId, 'data');
  return { id: serviceId, status };
};

export const listAdminPointAccounts = (input: { q?: string; page: number; limit: number }) => {
  const q = input.q?.trim();
  const where = q ? 'WHERE name LIKE ? OR email LIKE ?' : '';
  const params = q ? [`%${q}%`, `%${q}%`] : [];
  const total = Number((db.prepare(`SELECT COUNT(*) AS n FROM users ${where}`).get(...params) as { n: number }).n);
  const items = db.prepare(`SELECT id, name, email, role, points, lifetime_points AS lifetimePoints FROM users ${where} ORDER BY points DESC, name LIMIT ? OFFSET ?`).all(...params, input.limit, (input.page - 1) * input.limit);
  return { items, pagination: { ...pagination(input.page, input.limit), totalItems: total, totalPages: Math.ceil(total / input.limit) } };
};

export const adjustAdminPoints = (adminId: string, userId: string, amount: number, reasonInput: string) => {
  const reason = sanitizePlainText(reasonInput).slice(0, 300);
  const id = randomUUID();
  transaction(() => {
    const user = db.prepare('SELECT points FROM users WHERE id=?').get(userId) as { points: number } | undefined;
    if (!user) throw new AppError('المستخدم غير موجود.', 404);
    if (Number(user.points) + amount < 0) throw new AppError('رصيد المستخدم لا يكفي لهذا الخصم.', 409);
    db.prepare('UPDATE users SET points=points+?, lifetime_points=lifetime_points+? WHERE id=?').run(amount, Math.max(0, amount), userId);
    db.prepare(`INSERT INTO points_transactions (id,user_id,amount,reason,source_type,source_id) VALUES (?,?,? ,?,'admin_adjustment',?)`).run(id, userId, amount, reason, id);
    audit(adminId, 'adjust_points', 'user', userId, reason, { amount, transactionId: id });
  });
  emitRealtimeEvent(userId, 'data');
  return { id, userId, amount, reason };
};

export const getAdminRewardSettings = () => ({
  sellerDeliveryPoints: Number(getSetting('accepted_delivery_points') ?? 50),
  rewards: REWARDS.map((reward) => ({ ...reward, cost: Number(getSetting(settingKey(reward.code)) ?? reward.defaultCost) })),
});
export const saveAdminRewardSettings = (adminId: string, deliveryPoints: number, costs: Array<{ code: string; cost: number }>) => {
  transaction(() => costs.forEach(({ code, cost }) => {
    if (!REWARDS.some((reward) => reward.code === code)) throw new AppError('كود المكافأة غير معروف.', 400);
    setSetting(settingKey(code), String(cost), adminId);
    audit(adminId, 'change_reward_cost', 'reward', code, 'تحديث تكلفة المكافأة', { cost });
  }));
  transaction(() => {
    setSetting('accepted_delivery_points', String(deliveryPoints), adminId);
    audit(adminId, 'change_delivery_points_award', 'points_config', 'accepted_delivery_points', 'تحديث مكافأة اعتماد التسليم', { deliveryPoints });
  });
  return getAdminRewardSettings();
};

export const listAdminArticles = () => db.prepare('SELECT id,title,slug,excerpt,content,cover_image AS coverImage,category,author_name AS authorName,published_at AS publishedAt,read_time AS readTime FROM articles ORDER BY published_at DESC').all();
export const saveAdminArticle = (input: { id?: string; title: string; slug: string; excerpt: string; content: string; coverImage: string; category: string; readTime: number }, adminId: string) => {
  const slug = input.slug.trim().toLowerCase().replace(/[^\p{L}\p{N}-]+/gu, '-').replace(/^-|-$/g, '');
  const values = [sanitizePlainText(input.title), slug, sanitizePlainText(input.excerpt), sanitizePlainText(input.content), input.coverImage.trim(), sanitizePlainText(input.category), input.readTime];
  if (input.id) db.prepare(`UPDATE articles SET title=?,slug=?,excerpt=?,content=?,cover_image=?,category=?,read_time=? WHERE id=?`).run(...values, input.id);
  else db.prepare(`INSERT INTO articles (id,title,slug,excerpt,content,cover_image,category,author_name,author_id,published_at,read_time)
    VALUES (?,?,?,?,?,?,?,'إدارة المنصة',?,strftime('%Y-%m-%dT%H:%M:%fZ','now'),?)`).run(randomUUID(), ...values.slice(0, 6), adminId, values[6]);
  const id = input.id ?? String((db.prepare('SELECT id FROM articles WHERE slug=?').get(slug) as { id: string }).id);
  audit(adminId, input.id ? 'update_article' : 'create_article', 'article', id, 'إدارة المقالات', { slug });
  return db.prepare('SELECT id,title,slug,excerpt,content,cover_image AS coverImage,category,author_name AS authorName,published_at AS publishedAt,read_time AS readTime FROM articles WHERE id=?').get(id);
};
export const deleteAdminArticle = (adminId: string, id: string) => {
  const article = db.prepare('SELECT title FROM articles WHERE id=?').get(id) as { title: string } | undefined;
  if (!article) throw new AppError('المقال غير موجود.', 404);
  db.prepare('DELETE FROM articles WHERE id=?').run(id);
  audit(adminId, 'delete_article', 'article', id, 'حذف مقال', { title: article.title });
};

const csvCell = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`;
export const exportAdminData = (entity: 'users' | 'services' | 'orders' | 'points' | 'articles' | 'reports') => {
  const queries: Record<typeof entity, string> = {
    users: 'SELECT id,name,email,role,is_active,account_status,points,lifetime_points,created_at FROM users ORDER BY created_at DESC',
    services: 'SELECT id,freelancer_id,title,category,price AS points,status,created_at FROM services ORDER BY created_at DESC',
    orders: 'SELECT id,service_title,buyer_id,freelancer_id,price_snapshot AS points,status,created_at,updated_at FROM service_orders ORDER BY created_at DESC',
    points: 'SELECT t.id,u.name,u.email,t.amount,t.reason,t.source_type,t.source_id,t.created_at FROM points_transactions t JOIN users u ON u.id=t.user_id ORDER BY t.created_at DESC',
    articles: 'SELECT id,title,slug,excerpt,category,published_at,read_time FROM articles ORDER BY published_at DESC',
    reports: 'SELECT id,freelancer_id,reason,status,created_at FROM reports ORDER BY created_at DESC',
  };
  const rows = db.prepare(queries[entity]).all() as Array<Record<string, unknown>>;
  const headers = rows.length ? Object.keys(rows[0]) : [];
  return `\uFEFF${[headers, ...rows.map((row) => headers.map((header) => row[header]))].map((line) => line.map(csvCell).join(',')).join('\r\n')}`;
};
