import { randomUUID } from 'node:crypto';
import { mkdir, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { privateChatFilesDir, privateDeliveriesDir, uploadsDir } from '../config/paths';
import { AppError } from '../utils/app-error';

const MIME_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

type UploadFolder = 'portfolio' | 'avatars' | 'community';
const SERVICE_MEDIA_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

const CHAT_FILE_EXTENSIONS: Record<string, string> = {
  'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif',
  'application/pdf': 'pdf', 'text/plain': 'txt',
  'video/mp4': 'mp4', 'video/webm': 'webm', 'video/quicktime': 'mov',
};

const COMMENT_FILE_EXTENSIONS: Record<string, string> = {
  ...CHAT_FILE_EXTENSIONS,
};

const DELIVERY_FILE_EXTENSIONS: Record<string, string> = { ...CHAT_FILE_EXTENSIONS };

const matchesFileSignature = (file: Express.Multer.File): boolean => {
  const bytes = file.buffer;
  switch (file.mimetype) {
    case 'image/jpeg': return bytes.length > 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    case 'image/png': return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    case 'image/gif': return bytes.subarray(0, 6).toString('ascii').match(/^GIF8[79]a$/) !== null;
    case 'image/webp': return bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP';
    case 'application/pdf': return bytes.subarray(0, 5).toString('ascii') === '%PDF-';
    case 'video/mp4':
    case 'video/quicktime': return bytes.length > 12 && bytes.subarray(4, 8).toString('ascii') === 'ftyp';
    case 'video/webm': return bytes.subarray(0, 4).equals(Buffer.from([0x1a, 0x45, 0xdf, 0xa3]));
    case 'text/plain':
      if (bytes.includes(0)) return false;
      try { new TextDecoder('utf-8', { fatal: true }).decode(bytes); return true; } catch { return false; }
    default: return false;
  }
};

export interface SavedChatAttachment {
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
}

export const saveChatAttachment = async (
  userId: string,
  file: Express.Multer.File,
): Promise<SavedChatAttachment> => {
  const extension = CHAT_FILE_EXTENSIONS[file.mimetype];
  if (!extension || !matchesFileSignature(file)) throw new AppError('محتوى الملف لا يطابق نوعه المسموح.', 400);
  const storedName = `${randomUUID()}.${extension}`;
  const storageKey = path.posix.join(userId, storedName);
  try {
    await mkdir(path.join(privateChatFilesDir, userId), { recursive: true });
    await writeFile(path.join(privateChatFilesDir, userId, storedName), file.buffer, { flag: 'wx' });
  } catch (error) {
    console.error('Chat attachment save failed:', error);
    throw new AppError('تعذر حفظ الملف المرفق.', 500);
  }
  const rawName = decodeMultipartFilename(file.originalname)
    .replace(/[\\/]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return { storageKey, name: rawName.slice(0, 140) || `attachment.${extension}`, mimeType: file.mimetype, size: file.size };
};

const decodeMultipartFilename = (value: string): string => {
  if (!/[ÃÂØÙ]/.test(value)) return path.win32.basename(value);
  const decoded = Buffer.from(path.win32.basename(value), 'latin1').toString('utf8');
  return decoded.includes('\uFFFD') ? path.win32.basename(value) : decoded;
};

export const resolveChatAttachmentPath = (storageKey: string): string => {
  const resolved = path.resolve(privateChatFilesDir, storageKey);
  if (!resolved.startsWith(`${privateChatFilesDir}${path.sep}`)) throw new AppError('الملف غير موجود.', 404);
  return resolved;
};

export const deleteChatAttachment = async (storageKey: string): Promise<void> => {
  await rm(resolveChatAttachmentPath(storageKey), { force: true });
};

export interface SavedDeliveryFile {
  storageKey: string;
  name: string;
  mimeType: string;
  size: number;
}

export const savePrivateDeliveryFile = async (
  userId: string,
  file: Express.Multer.File,
): Promise<SavedDeliveryFile> => {
  const extension = DELIVERY_FILE_EXTENSIONS[file.mimetype];
  if (!extension || !matchesFileSignature(file)) throw new AppError('محتوى الملف لا يطابق نوع الملف المسموح.', 400);
  const fileName = `${randomUUID()}.${extension}`;
  const storageKey = path.posix.join(userId, fileName);
  const directory = path.join(privateDeliveriesDir, userId);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), file.buffer, { flag: 'wx' });
  } catch (error) {
    console.error('Private delivery save failed:', error);
    throw new AppError('تعذر حفظ ملف التسليم.', 500);
  }
  const rawName = decodeMultipartFilename(file.originalname)
    .replace(/[\\/]/g, '').replace(/[\u0000-\u001f\u007f]/g, '').trim();
  return { storageKey, name: rawName.slice(0, 140) || `delivery.${extension}`, mimeType: file.mimetype, size: file.size };
};

export const resolvePrivateDeliveryPath = (storageKey: string): string => {
  const resolved = path.resolve(privateDeliveriesDir, storageKey);
  if (!resolved.startsWith(`${privateDeliveriesDir}${path.sep}`)) throw new AppError('ملف التسليم غير موجود.', 404);
  return resolved;
};

export const deletePrivateDeliveryFile = async (storageKey: string): Promise<void> => {
  await rm(resolvePrivateDeliveryPath(storageKey), { force: true });
};

export const uploadServiceMedia = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ url: string; type: 'image' | 'video' }> => {
  const extension = SERVICE_MEDIA_EXTENSIONS[file.mimetype];
  if (!extension || !matchesFileSignature(file)) throw new AppError('محتوى الملف لا يطابق صيغته. اختر صورة أو فيديو صالحًا.', 400);
  const fileName = `${randomUUID()}.${extension}`;
  const targetDirectory = path.join(uploadsDir, 'services', userId);
  try {
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(path.join(targetDirectory, fileName), file.buffer);
  } catch (error) {
    console.error('Service media upload failed:', error);
    throw new AppError('تعذر حفظ الملف، حاول مرة أخرى.', 500);
  }
  return { url: `/uploads/services/${userId}/${fileName}`, type: file.mimetype.startsWith('video/') ? 'video' : 'image' };
};

export const listUploadedServiceMedia = async (userId: string): Promise<Array<{ url: string; type: 'image' | 'video' }>> => {
  const directory = path.join(uploadsDir, 'services', userId);
  let entries;
  try {
    entries = await readdir(directory, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return [];
    throw error;
  }

  return entries
    .filter((entry) => entry.isFile() && /^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(entry.name))
    .map((entry) => {
      const extension = path.extname(entry.name).slice(1).toLowerCase();
      const type = ['mp4', 'webm', 'mov'].includes(extension) ? 'video' : 'image';
      return { url: `/uploads/services/${userId}/${entry.name}`, type };
    });
};

export const deleteUploadedServiceMedia = async (userId: string, fileName: string): Promise<void> => {
  if (!/^[0-9a-f-]{36}\.(jpg|png|webp|gif|mp4|webm|mov)$/i.test(fileName)) {
    throw new AppError('ملف الوسيط غير صالح.', 400);
  }
  const target = path.join(uploadsDir, 'services', userId, fileName);
  try {
    await unlink(target);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') throw new AppError('ملف الوسيط غير موجود.', 404);
    throw error;
  }
};

export const uploadImage = async (
  userId: string,
  file: Express.Multer.File,
  folder: UploadFolder,
): Promise<string> => {
  const extension = MIME_EXTENSIONS[file.mimetype];

  if (!extension || !matchesFileSignature(file)) {
    throw new AppError('صيغة الصورة غير مدعومة. المسموح: JPG, PNG, WEBP, GIF', 400);
  }

  const fileName = `${randomUUID()}.${extension}`;
  const targetDirectory = path.join(uploadsDir, folder, userId);
  const targetPath = path.join(targetDirectory, fileName);

  try {
    await mkdir(targetDirectory, { recursive: true });
    await writeFile(targetPath, file.buffer);
  } catch (error) {
    console.error('Local image upload failed:', error);
    throw new AppError('تعذر حفظ الصورة، يرجى المحاولة مرة أخرى', 500);
  }

  return `/uploads/${folder}/${userId}/${fileName}`;
};

export const saveCommunityCommentAttachment = async (
  userId: string,
  file: Express.Multer.File,
): Promise<{ url: string; type: 'IMAGE' | 'VIDEO' | 'FILE' }> => {
  const extension = COMMENT_FILE_EXTENSIONS[file.mimetype];
  if (!extension || !matchesFileSignature(file)) throw new AppError('محتوى الملف لا يطابق نوعه أو أنه غير مدعوم.', 400);
  const fileName = `${randomUUID()}.${extension}`;
  const directory = path.join(uploadsDir, 'community-comments', userId);
  try {
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, fileName), file.buffer, { flag: 'wx' });
  } catch (error) {
    console.error('Community comment attachment save failed:', error);
    throw new AppError('تعذر حفظ المرفق. حاول مرة أخرى.', 500);
  }
  const type = file.mimetype.startsWith('image/') ? 'IMAGE' : file.mimetype.startsWith('video/') ? 'VIDEO' : 'FILE';
  return { url: `/uploads/community-comments/${userId}/${fileName}`, type };
};

export const deleteLocalImage = async (imageUrl: string): Promise<void> => {
  if (!imageUrl.startsWith('/uploads/')) {
    return;
  }

  const relativePath = imageUrl.slice('/uploads/'.length);
  const targetPath = path.resolve(uploadsDir, relativePath);

  if (!targetPath.startsWith(`${uploadsDir}${path.sep}`)) {
    return;
  }

  await rm(targetPath, { force: true });
};
