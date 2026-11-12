import { createHash, randomInt, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '../config/db';
import { env } from '../config/env';
import { privateParentVerificationDir } from '../config/paths';
import { createUserNotification } from '../models/notification.model';
import { createParentLink, createParentVerification, findChildByEmail, findParentById, findParentVerificationByChild, findParentVerificationByToken, getChildLinkRequests, listLinkedChildren, listParentVerifications, markAccountVerificationPending, respondToParentLink, reviewParentVerification, submitParentVerification, type ParentLinkRow, linkedParentsForChild, parentHasChatConsent, recordParentAccess, getChildParentAccessLog, getChildConversations, getChildConversationMessages, findLinkedChildMessageAttachment, findParentChildDelivery, approveLinkedParentChatAccess, updateLinkedChildDisplay } from '../models/parent.model';
import { findUserById } from '../models/user.model';
import { AppError } from '../utils/app-error';
import { emitRealtimeEvent } from './realtime.service';
import { sendParentVerificationDecisionEmail, sendParentVerificationEmail } from './email.service';
import { resolveChatAttachmentPath, resolvePrivateDeliveryPath } from './upload.service';

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export const requestParentLink = async (parentId: string, emailInput: string) => {
  const parent = findParentById(parentId);
  if (!parent) throw new AppError('حساب ولي الأمر غير متاح', 403);
  const child = findChildByEmail(emailInput.trim().toLowerCase());
  if (!child) throw new AppError('لم نعثر على حساب مستقل بهذا البريد الإلكتروني', 404);
  if (db.prepare("SELECT 1 FROM parent_child_links WHERE parent_id = ? AND child_id = ? AND status = 'APPROVED'").get(parentId, child.id)) {
    throw new AppError('هذا الحساب مرتبط بك بالفعل', 409);
  }
  if (db.prepare("SELECT 1 FROM parent_child_links WHERE parent_id = ? AND child_id = ? AND status = 'PENDING'").get(parentId, child.id)) {
    throw new AppError('لديك طلب ربط معلّق لهذا الحساب', 409);
  }
  const id = createParentLink(parentId, child.id);
  createUserNotification(child.id, 'PARENT_LINK_REQUEST', 'طلب ربط من ولي الأمر', `يرغب ولي أمرك ${parent.name} في ربط الحساب لمتابعة إنجازاتك.`, '/dashboard?parentRequests=1');
  emitRealtimeEvent(child.id, 'data');
  return { id, childName: child.name };
};

export const pendingLinkRequests = (childId: string) => getChildLinkRequests(childId);

export const respondToLinkRequest = async (childId: string, linkId: string, status: 'APPROVED' | 'REJECTED') => {
  const link = respondToParentLink(linkId, childId, status);
  if (!link) throw new AppError('طلب الربط غير موجود أو تمت معالجته', 404);
  const child = await findUserById(childId);
  createUserNotification(link.parent_id, 'ACCOUNT_STATUS', status === 'APPROVED' ? 'تمت الموافقة على طلب الربط' : 'تم رفض طلب الربط', status === 'APPROVED' ? `وافق ${child?.name ?? 'المستقل'} على ربط الحساب.` : 'تم رفض طلب ربط الحساب.', '/buyer');
  emitRealtimeEvent(link.parent_id, 'data');
  emitRealtimeEvent(childId, 'data');
  return { status };
};

export const linkedChildren = (parentId: string) => {
  if (!findParentById(parentId)) throw new AppError('حساب ولي الأمر غير متاح', 403);
  return listLinkedChildren(parentId);
};

export const updateParentChildDisplay = (parentId: string, childId: string, displayName: string | null | undefined, file?: Express.Multer.File) => {
  let avatarDataUrl: string | undefined;
  if (file) {
    if (file.size > 1024 * 1024) throw new AppError('يجب ألا يتجاوز حجم الصورة 1 ميجابايت', 413);
    const validImage = file.mimetype === 'image/jpeg'
      ? file.buffer[0] === 0xff && file.buffer[1] === 0xd8 && file.buffer[2] === 0xff
      : file.mimetype === 'image/png'
        ? file.buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
        : file.mimetype === 'image/webp'
          ? file.buffer.subarray(0, 4).toString('ascii') === 'RIFF' && file.buffer.subarray(8, 12).toString('ascii') === 'WEBP'
          : file.mimetype === 'image/gif'
            ? ['GIF87a', 'GIF89a'].includes(file.buffer.subarray(0, 6).toString('ascii'))
            : false;
    if (!validImage) throw new AppError('ملف الصورة غير صالح. استخدم JPG أو PNG أو WebP أو GIF.', 400);
    avatarDataUrl = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  }

  const updated = updateLinkedChildDisplay(parentId, childId, displayName, avatarDataUrl);
  if (!updated) throw new AppError('الحساب غير مرتبط بك أو لا توجد تغييرات لحفظها', 404);
  emitRealtimeEvent(parentId, 'data');
  return { success: true };
};

export const childParentChatSettings = (childId: string) => linkedParentsForChild(childId).map((parent) => ({ ...parent, chatAccessEnabled: Boolean(parent.chatAccessEnabled) }));

export const approveLegacyParentChatAccess = (childId: string, linkId: string) => {
  const parentId = approveLinkedParentChatAccess(childId, linkId);
  if (!parentId) throw new AppError('This relationship already has access or is no longer active', 409);
  createUserNotification(parentId, 'ACCOUNT_STATUS', 'تم تحديث صلاحيات متابعة الحساب', 'وافق صاحب الحساب على إتاحة محادثاته للقراءة ضمن ربط ولي الأمر.', '/parent');
  emitRealtimeEvent(parentId, 'data');
  emitRealtimeEvent(childId, 'data');
  return { enabled: true };
};

export const childParentAccessHistory = (childId: string) => getChildParentAccessLog(childId);

export const parentChildConversations = (parentId: string, childId: string) => {
  if (!findParentById(parentId) || !parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires the child\'s separate consent', 403);
  recordParentAccess(parentId, childId, 'VIEW_CONVERSATIONS');
  emitRealtimeEvent(childId, 'data');
  return getChildConversations(childId);
};

export const parentChildMessages = (parentId: string, childId: string, peerId: string, serviceId: string | null) => {
  if (!findParentById(parentId) || !parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires the child\'s separate consent', 403);
  if (peerId === childId) throw new AppError('Invalid conversation participant', 400);
  recordParentAccess(parentId, childId, 'VIEW_MESSAGES', peerId);
  emitRealtimeEvent(childId, 'data');
  return getChildConversationMessages(childId, peerId, serviceId);
};

export const parentChildMessageAttachment = (parentId: string, childId: string, messageId: string) => {
  if (!findParentById(parentId) || !parentHasChatConsent(parentId, childId)) throw new AppError('Chat access requires an approved parent link', 403);
  const attachment = findLinkedChildMessageAttachment(messageId, childId);
  if (!attachment) throw new AppError('Attachment was not found for this linked account', 404);
  recordParentAccess(parentId, childId, 'VIEW_MESSAGES', attachment.senderId === childId ? attachment.receiverId : attachment.senderId);
  const filePath = resolveChatAttachmentPath(attachment.storageKey);
  if (!existsSync(filePath)) throw new AppError('Attachment is no longer available', 404);
  return { filePath, name: attachment.name, mimeType: attachment.mimeType };
};

export const parentChildDeliveryFile = (parentId: string, childId: string, deliveryId: string, download: boolean) => {
  if (!findParentById(parentId)) throw new AppError('حساب ولي الأمر غير متاح', 403);
  const delivery = findParentChildDelivery(parentId, childId, deliveryId);
  if (!delivery) throw new AppError('ملف التسليم غير موجود أو لا تملك صلاحية الوصول إليه.', 404);
  if (delivery.sourceUrl) throw new AppError('هذا التسليم رابط خارجي ويعرض من بطاقة التسليم.', 400);
  if (download && delivery.isLocked) throw new AppError('يصبح تنزيل الملف متاحًا بعد اعتماد التسليم.', 403);
  const filePath = resolvePrivateDeliveryPath(delivery.storageKey);
  if (!existsSync(filePath)) throw new AppError('ملف التسليم لم يعد متاحًا.', 404);
  return { filePath, name: delivery.name, mimeType: delivery.mimeType };
};

export const startParentVerification = async (childId: string, emailInput: string) => {
  const child = await findUserById(childId);
  if (!child || child.role !== 'Freelancer' || (!child.is_active && child.account_status !== 'REJECTED')) throw new AppError('الحساب غير مؤهل لبدء التحقق', 403);
  if (child.account_status === 'PENDING_ADMIN_REVIEW') throw new AppError('تم إرسال التوثيق بالفعل. انتظر مراجعة الإدارة قبل إرسال طلب جديد.', 409);
  const parentEmail = emailInput.trim().toLowerCase();
  const token = randomUUID() + randomUUID().replaceAll('-', '');
  const a = randomInt(3, 13);
  const b = randomInt(3, 13);
  const tokenHash = hashToken(token);
  const verificationUrl = new URL(`/parent-verify/${token}`, env.FRONTEND_URL).toString();
  const sent = await sendParentVerificationEmail(parentEmail, child.name, verificationUrl);
  if (!sent) throw new AppError('تعذر إرسال رسالة التوثيق. تحقق من إعداد البريد الإلكتروني وحاول مرة أخرى.', 503);
  createParentVerification(childId, parentEmail, tokenHash, a, b);
  markAccountVerificationPending(childId, tokenHash);
  emitRealtimeEvent(childId, 'data');
  return { sent: true };
};

export const getPublicParentVerification = (token: string) => {
  const row = findParentVerificationByToken(hashToken(token));
  if (!row || row.status !== 'PENDING_PARENT_APPROVAL') throw new AppError('رابط التحقق غير صالح أو منتهي', 404);
  if (Date.now() - Date.parse(row.created_at) > 24 * 60 * 60 * 1000) throw new AppError('انتهت صلاحية رابط التحقق، اطلب رابطًا جديدًا', 410);
  return { childName: row.child_name, a: row.challenge_a, b: row.challenge_b };
};

export const saveParentPhoto = async (file: Express.Multer.File) => {
  const extensions: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
  const extension = extensions[file.mimetype];
  if (!extension || file.size > 3 * 1024 * 1024) throw new AppError('ارفع صورة JPG أو PNG أو WebP بحجم لا يتجاوز 3 ميجابايت', 400);
  const bytes = file.buffer;
  const valid = file.mimetype === 'image/jpeg' ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    : file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
      : bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
  if (!valid) throw new AppError('محتوى الصورة لا يطابق نوع الملف', 400);
  await mkdir(privateParentVerificationDir, { recursive: true });
  const fileName = `${randomUUID()}.${extension}`;
  await writeFile(path.join(privateParentVerificationDir, fileName), bytes, { flag: 'wx' });
  return fileName;
};

export const submitParentVerificationForm = async (token: string, mathAnswer: number, file: Express.Multer.File) => {
  const row = findParentVerificationByToken(hashToken(token));
  if (!row || row.status !== 'PENDING_PARENT_APPROVAL') throw new AppError('رابط التحقق غير صالح أو منتهي', 404);
  if (Date.now() - Date.parse(row.created_at) > 24 * 60 * 60 * 1000) throw new AppError('انتهت صلاحية رابط التحقق، اطلب رابطًا جديدًا', 410);
  if (row.challenge_a * row.challenge_b !== mathAnswer) throw new AppError('إجابة المسألة الحسابية غير صحيحة', 422);
  const photoName = await saveParentPhoto(file);
  const result = submitParentVerification(row.id, photoName, row.child_id);
  if (!Number(result.changes)) throw new AppError('تم إرسال طلب التحقق مسبقًا', 409);
  db.prepare("UPDATE users SET parent_photo = ?, account_status = 'PENDING_ADMIN_REVIEW' WHERE id = ?").run(photoName, row.child_id);
  const admins = db.prepare("SELECT id FROM users WHERE role = 'Admin' AND is_active = 1").all() as Array<{ id: string }>;
  for (const admin of admins) createUserNotification(admin.id, 'NEW_REPORT', 'طلب توثيق ولي أمر جديد', 'يوجد طلب توثيق حساب قيد المراجعة.', '/admin?tab=parent-verifications');
  emitRealtimeEvent(row.child_id, 'data');
  return { status: 'PENDING_ADMIN_REVIEW' as const };
};

export const adminParentVerificationQueue = () => listParentVerifications();

export const parentVerificationPhoto = (id: string) => {
  const row = db.prepare('SELECT parent_photo_path FROM parent_verifications WHERE id = ?').get(id) as { parent_photo_path: string | null } | undefined;
  if (!row?.parent_photo_path) throw new AppError('الصورة غير متاحة', 404);
  return path.join(privateParentVerificationDir, path.basename(row.parent_photo_path));
};

export const reviewParentVerificationRequest = async (id: string, adminId: string, approve: boolean) => {
  const reviewed = reviewParentVerification(id, adminId, approve);
  if (!reviewed) throw new AppError('طلب المراجعة غير موجود أو تمت معالجته', 404);
  const child = await findUserById(reviewed.child_id);
  const decision = approve ? 'تمت الموافقة على توثيق الحساب وتفعيله' : 'تعذر اعتماد التوثيق، يرجى التواصل مع إدارة مبدعين';
  createUserNotification(reviewed.child_id, 'ACCOUNT_STATUS', approve ? 'تم تفعيل الحساب' : 'تعذر توثيق الحساب', decision, '/login');
  const sent = reviewed.parent_email && child
    ? await sendParentVerificationDecisionEmail(reviewed.parent_email, child.name, decision)
    : false;
  emitRealtimeEvent(reviewed.child_id, 'data');
  return { sent, parentEmail: reviewed.parent_email };
};
