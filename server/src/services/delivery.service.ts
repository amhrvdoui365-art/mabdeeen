import { existsSync } from 'node:fs';
import { db } from '../config/db';
import { findDeliveryForParticipant, listDeliveriesForParticipant, listDeliveriesForVault, listOrderDeliveries, createDelivery as insertDelivery, type Delivery, type DeliveryRow,
  approveDelivery as approveDeliveryRecord, requestDeliveryRevision as requestRevisionRecord } from '../models/delivery.model';
import { findServiceById } from '../models/services.model';
import { createUserNotification } from '../models/notification.model';
import { emitRealtimeEvent } from './realtime.service';
import { deletePrivateDeliveryFile, resolvePrivateDeliveryPath, savePrivateDeliveryFile } from './upload.service';
import { AppError } from '../utils/app-error';
import { classifyExternalSource, normalizeExternalUrl } from '../utils/external-url';
import type { Express } from 'express';

const chatLink = (peerId: string, projectId: string) =>
  `/chat?userId=${encodeURIComponent(peerId)}&serviceId=${encodeURIComponent(projectId)}`;

const notifySafely = (userId: string, title: string, message: string, link: string): void => {
  try {
    createUserNotification(userId, 'NEW_MESSAGE', title, message, link);
  } catch (error) {
    console.error('Delivery notification failed:', error);
  }
};

const assertProjectParticipants = (projectId: string, freelancerId: string, clientId: string) => {
  const service = findServiceById(projectId);
  if (!service || service.freelancerId !== freelancerId) throw new AppError('المشروع غير متاح لهذا المستقل.', 404);
  const client = db.prepare("SELECT id FROM users WHERE id = ? AND role = 'Buyer' AND is_active = 1")
    .get(clientId) as { id: string } | undefined;
  if (!client) throw new AppError('حساب العميل غير متاح.', 404);
  const conversation = db.prepare(`SELECT 1 FROM messages WHERE service_id = ?
    AND ((sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)) LIMIT 1`)
    .get(projectId, freelancerId, clientId, clientId, freelancerId);
  if (!conversation) throw new AppError('لا توجد محادثة بين طرفي هذا المشروع.', 403);
  return service;
};

export const listProjectDeliveries = (userId: string, projectId: string) => {
  const service = findServiceById(projectId);
  if (!service) throw new AppError('المشروع غير موجود.', 404);
  const isFreelancer = service.freelancerId === userId;
  const isClient = Boolean(db.prepare(`SELECT 1 FROM users u JOIN messages m ON m.service_id = ?
    WHERE u.id = ? AND u.role = 'Buyer' AND u.is_active = 1
      AND ((m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)) LIMIT 1`)
    .get(projectId, userId, service.freelancerId, userId, userId, service.freelancerId));
  if (!isFreelancer && !isClient) throw new AppError('لا تملك صلاحية عرض تسليمات هذا المشروع.', 403);
  return listDeliveriesForParticipant(projectId, userId);
};

const assertOrderDeliveryAccess = (orderId: string, userId: string, sellerOnly = false) => {
  const order = db.prepare('SELECT id, service_id, freelancer_id, buyer_id, service_title, status FROM service_orders WHERE id = ?').get(orderId) as
    { id: string; service_id: string | null; freelancer_id: string; buyer_id: string; service_title: string; status: string } | undefined;
  if (!order || (order.freelancer_id !== userId && order.buyer_id !== userId)) throw new AppError('الطلب غير موجود أو لا تملك صلاحية الوصول إليه.', 404);
  if (sellerOnly && (order.freelancer_id !== userId || !['accepted', 'in_progress', 'revision_requested'].includes(order.status))) throw new AppError('لا يمكن إرسال تسليم في حالة الطلب الحالية.', 409);
  if (!order.service_id) throw new AppError('الخدمة المرتبطة بالطلب لم تعد متاحة لرفع التسليم.', 409);
  return order;
};

export const listOrderDeliveryItems = (userId: string, orderId: string) => {
  assertOrderDeliveryAccess(orderId, userId);
  return listOrderDeliveries(orderId, userId);
};

export const uploadOrderDeliveryLink = (freelancerId: string, input: { orderId: string; url: string; title: string }) => {
  const order = assertOrderDeliveryAccess(input.orderId, freelancerId, true);
  const sourceUrl = normalizeExternalUrl(input.url);
  const sourceKind = classifyExternalSource(sourceUrl);
  const row = insertDelivery({ projectId: order.service_id!, orderId: input.orderId, freelancerId, clientId: order.buyer_id, fileType: 'text/uri-list', storageKey: 'external-link', fileName: input.title.trim(), fileSize: Buffer.byteLength(sourceUrl), sourceUrl, sourceKind });
  db.prepare("UPDATE service_orders SET status = 'delivered', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(input.orderId);
  notifySafely(order.buyer_id, 'التسليم النهائي جاهز', `أرسل المستقل رابط التسليم لطلب «${order.service_title}».`, `/orders?id=${input.orderId}`);
  emitRealtimeEvent(order.buyer_id, 'data');
  return mapDeliveryResponse(row);
};

export const uploadOrderDeliveryFile = async (freelancerId: string, orderId: string, file: Express.Multer.File | undefined) => {
  if (!file) throw new AppError('اختر ملف التسليم أولًا.', 400);
  const order = assertOrderDeliveryAccess(orderId, freelancerId, true);
  const saved = await savePrivateDeliveryFile(freelancerId, file);
  try {
    const row = insertDelivery({ projectId: order.service_id!, orderId, freelancerId, clientId: order.buyer_id, fileType: saved.mimeType, storageKey: saved.storageKey, fileName: saved.name, fileSize: saved.size });
    db.prepare("UPDATE service_orders SET status = 'delivered', updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = ?").run(orderId);
    notifySafely(order.buyer_id, 'التسليم النهائي جاهز', `أرسل المستقل ملف التسليم لطلب «${order.service_title}».`, `/orders?id=${orderId}`);
    emitRealtimeEvent(order.buyer_id, 'data');
    return mapDeliveryResponse(row);
  } catch (error) { await deletePrivateDeliveryFile(saved.storageKey); throw error; }
};

export const listMyDeliveryVault = (userId: string) => listDeliveriesForVault(userId).map((item) => ({
  ...mapDeliveryResponse(item), serviceTitle: item.serviceTitle,
}));

export const uploadProjectDeliveryLink = (freelancerId: string, input: { projectId: string; clientId: string; url: string; title: string }) => {
  const service = assertProjectParticipants(input.projectId, freelancerId, input.clientId);
  const sourceUrl = normalizeExternalUrl(input.url);
  const sourceKind = classifyExternalSource(sourceUrl);
  const row = insertDelivery({ projectId: input.projectId, freelancerId, clientId: input.clientId,
    fileType: 'text/uri-list', storageKey: 'external-link', fileName: input.title.trim(),
    fileSize: Buffer.byteLength(sourceUrl), sourceUrl, sourceKind });
  const delivery = mapDeliveryResponse(row);
  notifySafely(input.clientId, 'تسليم مشروع جديد بانتظار مراجعتك',
    `أرسل ${service.freelancerName} رابط معاينة للتسليم النهائي.`, chatLink(freelancerId, input.projectId));
  emitRealtimeEvent(input.clientId, 'data');
  return delivery;
};

export const uploadProjectDelivery = async (
  freelancerId: string,
  input: { projectId: string; clientId: string },
  file: Express.Multer.File | undefined,
) => {
  if (!file) throw new AppError('اختر ملف التسليم أولاً.', 400);
  const service = assertProjectParticipants(input.projectId, freelancerId, input.clientId);
  const saved = await savePrivateDeliveryFile(freelancerId, file);
  try {
    const row = insertDelivery({
      projectId: input.projectId,
      freelancerId,
      clientId: input.clientId,
      fileType: saved.mimeType,
      storageKey: saved.storageKey,
      fileName: saved.name,
      fileSize: saved.size,
    });
    const delivery = mapDeliveryResponse(row);
    notifySafely(input.clientId, 'تسليم مشروع جديد بانتظار مراجعتك',
      `أرسل ${service.freelancerName} ملف التسليم النهائي. يمكنك معاينته ثم قبول الاستلام أو طلب تعديل.`,
      chatLink(freelancerId, input.projectId));
    emitRealtimeEvent(input.clientId, 'data');
    return delivery;
  } catch (error) {
    await deletePrivateDeliveryFile(saved.storageKey);
    throw error;
  }
};

const mapDeliveryResponse = (row: DeliveryRow | Delivery) => {
  const databaseRow = 'project_id' in row;
  const fileUrl = databaseRow ? row.file_url : row.fileUrl;
  const status = row.status;
  const isLocked = databaseRow ? Boolean(row.is_locked) : row.isLocked;
  return {
    id: row.id,
    projectId: databaseRow ? row.project_id : row.projectId,
    freelancerId: databaseRow ? row.freelancer_id : row.freelancerId,
    clientId: databaseRow ? row.client_id : row.clientId,
    fileUrl,
    previewUrl: fileUrl,
    downloadUrl: null,
    sourceUrl: databaseRow ? row.source_url ?? null : row.sourceUrl ?? null,
    sourceKind: databaseRow ? row.source_kind ?? 'file' : row.sourceKind ?? 'file',
    fileType: databaseRow ? row.file_type : row.fileType,
    fileName: databaseRow ? row.file_name : row.fileName,
    fileSize: Number(databaseRow ? row.file_size : row.fileSize),
    status,
    isLocked,
    createdAt: databaseRow ? row.created_at : row.createdAt,
    updatedAt: databaseRow ? row.updated_at : row.updatedAt,
  };
};

export const mapDelivery = mapDeliveryResponse;

export const getDeliveryFile = (deliveryId: string, userId: string, download: boolean) => {
  const row = findDeliveryForParticipant(deliveryId, userId);
  if (!row) throw new AppError('ملف التسليم غير موجود أو لا تملك صلاحية عرضه.', 404);
  if (row.source_url) throw new AppError('هذا التسليم رابط خارجي ويعرض عبر المعاينة المضمّنة.', 400);
  if (download && row.is_locked) throw new AppError('لا يمكن تنزيل التسليم قبل موافقة المشتري.', 403);
  const filePath = resolvePrivateDeliveryPath(row.storage_key);
  if (!existsSync(filePath)) throw new AppError('ملف التسليم لم يعد متاحاً.', 404);
  return { filePath, name: row.file_name, mimeType: row.file_type };
};

export const approveProjectDelivery = (deliveryId: string, clientId: string) => {
  const result = approveDeliveryRecord(deliveryId, clientId);
  if (!result) throw new AppError('التسليم غير موجود أو تمت مراجعته بالفعل.', 409);
  const link = result.delivery.order_id ? '/orders?id=' + result.delivery.order_id : chatLink(clientId, result.delivery.project_id);
  notifySafely(result.delivery.freelancer_id, 'تم قبول تسليمك النهائي',
    `أكد العميل استلام المشروع، وأضيفت ${result.points} نقطة إلى رصيدك.`,
    link);
  if (result.delivery.order_id) notifySafely(clientId, 'اكتمل الطلب', `تم اعتماد التسليم وإضافة ${result.points} نقطة إلى رصيد المستقل.`, link);
  emitRealtimeEvent(result.delivery.freelancer_id, 'data');
  return { delivery: mapDeliveryResponse(result.delivery), pointsAwarded: result.points };
};

export const requestProjectDeliveryRevision = (deliveryId: string, clientId: string) => {
  const row = requestRevisionRecord(deliveryId, clientId);
  if (!row) throw new AppError('التسليم غير موجود أو تمت مراجعته بالفعل.', 409);
  const link = row.order_id ? '/orders?id=' + row.order_id : chatLink(clientId, row.project_id);
  notifySafely(row.freelancer_id, 'طلب العميل تعديلاً على التسليم',
    'راجع ملاحظات العميل في المحادثة ثم أرسل نسخة محدّثة من ملف التسليم.',
    link);
  return mapDeliveryResponse(row);
};
