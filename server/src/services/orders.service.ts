import { randomUUID } from 'node:crypto';
import { db, transaction } from '../config/db';
import { createUserNotification } from '../models/notification.model';
import { findServiceById } from '../models/services.model';
import { emitRealtimeEvent, emitRealtimeEventToAll } from './realtime.service';
import { AppError } from '../utils/app-error';
import { scanText } from '../utils/moderation';

type OrderStatus = 'requested' | 'accepted' | 'rejected' | 'in_progress' | 'delivered' | 'revision_requested' | 'completed' | 'cancelled';
type OrderRow = { id: string; service_id: string | null; freelancer_id: string; buyer_id: string; service_title: string; price_snapshot: number; brief: string; status: OrderStatus; created_at: string; updated_at: string; completed_at: string | null };
const item = (row: OrderRow) => ({ id: row.id, serviceId: row.service_id, freelancerId: row.freelancer_id, buyerId: row.buyer_id, serviceTitle: row.service_title, price: Number(row.price_snapshot), brief: row.brief, status: row.status, createdAt: row.created_at, updatedAt: row.updated_at, completedAt: row.completed_at });
const getOrder = (id: string, userId: string) => {
  const row = db.prepare('SELECT * FROM service_orders WHERE id = ? AND (buyer_id = ? OR freelancer_id = ?)').get(id, userId, userId) as OrderRow | undefined;
  if (!row) throw new AppError('الطلب غير موجود أو لا تملك صلاحية الوصول إليه.', 404);
  return row;
};
const alertUser = (userId: string, title: string, message: string, orderId: string) => {
  createUserNotification(userId, 'NEW_MESSAGE', title, message, `/orders?id=${orderId}`);
  emitRealtimeEvent(userId, 'data');
};

export const createOrder = (buyerId: string, serviceId: string, brief: string) => {
  const buyer = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'Buyer' AND is_active = 1").get(buyerId);
  if (!buyer) throw new AppError('يجب أن يكون الحساب مشتريًا لإنشاء طلب خدمة.', 403);
  const service = findServiceById(serviceId);
  if (!service || service.status !== 'active') throw new AppError('الخدمة غير متاحة حاليًا.', 404);
  if (service.freelancerId === buyerId) throw new AppError('لا يمكنك طلب خدمتك الخاصة.', 400);
  const id = randomUUID();
  db.prepare(`INSERT INTO service_orders (id, service_id, freelancer_id, buyer_id, service_title, price_snapshot, brief)
    VALUES (?, ?, ?, ?, ?, ?, ?)`).run(id, service.id, service.freelancerId, buyerId, service.title, service.price, brief.trim());
  alertUser(service.freelancerId, 'طلب خدمة جديد', `وصلك طلب جديد لخدمة «${service.title}».`, id);
  return item(getOrder(id, buyerId));
};

export const listOrders = (userId: string) => (db.prepare('SELECT * FROM service_orders WHERE buyer_id = ? OR freelancer_id = ? ORDER BY updated_at DESC').all(userId, userId) as unknown as OrderRow[]).map(item);
export const getOrderDetails = (id: string, userId: string) => {
  const row = getOrder(id, userId);
  const messages = db.prepare(`SELECT m.id, m.sender_id AS senderId, u.name AS senderName, m.content, m.created_at AS createdAt
    FROM order_messages m JOIN users u ON u.id = m.sender_id WHERE m.order_id = ? ORDER BY m.created_at ASC`).all(id);
  const reviewed = Boolean(db.prepare('SELECT 1 FROM reviews WHERE order_id = ? LIMIT 1').get(id));
  return { ...item(row), messages, reviewed };
};
export const transitionOrder = (id: string, userId: string, action: 'accept' | 'reject' | 'start' | 'cancel') => {
  const row = getOrder(id, userId);
  const isSeller = row.freelancer_id === userId;
  const transitions: Record<typeof action, { from: OrderStatus[]; to: OrderStatus; role: 'seller' | 'buyer' }> = {
    accept: { from: ['requested'], to: 'accepted', role: 'seller' }, reject: { from: ['requested'], to: 'rejected', role: 'seller' },
    start: { from: ['accepted'], to: 'in_progress', role: 'seller' },
    cancel: { from: ['requested', 'accepted'], to: 'cancelled', role: 'buyer' },
  };
  const transition = transitions[action];
  if ((transition.role === 'seller') !== isSeller || !transition.from.includes(row.status)) throw new AppError('لا يمكن تنفيذ هذا الإجراء على حالة الطلب الحالية.', 409);
  transaction(() => db.prepare(`UPDATE service_orders SET status = ?, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now'), responded_at = COALESCE(responded_at, strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) WHERE id = ?`).run(transition.to, id));
  const recipient = isSeller ? row.buyer_id : row.freelancer_id;
  const titles: Record<typeof action, string> = { accept: 'تم قبول طلبك', reject: 'تم الاعتذار عن الطلب', start: 'بدأ المستقل التنفيذ', cancel: 'تم إلغاء الطلب' };
  alertUser(recipient, titles[action], `تحديث جديد على طلب «${row.service_title}».`, id);
  return item(getOrder(id, userId));
};
export const addOrderMessage = (id: string, userId: string, content: string) => {
  const row = getOrder(id, userId);
  if (scanText(content).length > 0) throw new AppError('لحمايتك، لا ترسل أرقام هاتف أو بريد أو روابط تواصل خارج المنصة.', 400);
  if (['rejected', 'completed', 'cancelled'].includes(row.status)) throw new AppError('المحادثة مغلقة لهذا الطلب.', 409);
  const messageId = randomUUID();
  db.prepare('INSERT INTO order_messages (id, order_id, sender_id, content) VALUES (?, ?, ?, ?)').run(messageId, id, userId, content.trim());
  db.prepare("UPDATE service_orders SET updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(id);
  alertUser(row.freelancer_id === userId ? row.buyer_id : row.freelancer_id, 'رسالة جديدة في الطلب', 'لديك رسالة جديدة داخل محادثة الطلب.', id);
  return db.prepare('SELECT id, sender_id AS senderId, content, created_at AS createdAt FROM order_messages WHERE id = ?').get(messageId);
};
export const createOrderReview = (id: string, buyerId: string, rating: number, comment?: string) => {
  const row = getOrder(id, buyerId);
  if (row.buyer_id !== buyerId || row.status !== 'completed') throw new AppError('يمكن تقييم الطلب بعد اكتماله فقط.', 409);
  const reviewId = randomUUID();
  try {
    db.prepare('INSERT INTO reviews (id, freelancer_id, client_name, rating, comment, order_id) VALUES (?, ?, (SELECT name FROM users WHERE id = ?), ?, ?, ?)')
      .run(reviewId, row.freelancer_id, buyerId, rating, comment?.trim() || null, id);
  } catch (error) {
    if (String(error).includes('UNIQUE')) throw new AppError('سبق لك تقييم هذا الطلب.', 409);
    throw error;
  }
  emitRealtimeEventToAll('profile');
  alertUser(row.freelancer_id, 'تقييم جديد', 'أضاف العميل تقييمًا بعد اكتمال الطلب.', id);
  return { id: reviewId };
};
