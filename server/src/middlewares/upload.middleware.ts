import multer from 'multer';
import { AppError } from '../utils/app-error';

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

export const uploadSingleImage = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 3 * 1024 * 1024,
    files: 1,
  },
  fileFilter: (_req, file, callback) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      callback(
        new AppError('صيغة الصورة غير مدعومة. المسموح: JPG, PNG, WEBP, GIF', 400),
      );
      return;
    }

    callback(null, true);
  },
});

const SERVICE_MEDIA_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime',
]);

export const uploadServiceMedia = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!SERVICE_MEDIA_TYPES.has(file.mimetype)) {
      callback(new AppError('الملف يجب أن يكون صورة أو فيديو MP4 أو WebM أو MOV.', 400));
      return;
    }
    callback(null, true);
  },
});

const CHAT_FILE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'video/mp4', 'video/webm', 'video/quicktime',
]);

const DELIVERY_FILE_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'application/pdf', 'text/plain', 'video/mp4', 'video/webm', 'video/quicktime',
]);

const COMMENT_ATTACHMENT_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf', 'text/plain',
]);

export const uploadCommentAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!COMMENT_ATTACHMENT_TYPES.has(file.mimetype)) {
      callback(new AppError('يسمح بإرفاق الصور والفيديو وملفات PDF أو TXT فقط.', 400));
      return;
    }
    callback(null, true);
  },
});

export const uploadChatAttachment = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!CHAT_FILE_TYPES.has(file.mimetype)) {
      callback(new AppError('يسمح بالصور وملفات PDF وTXT ومقاطع MP4 وWebM وMOV فقط.', 400));
      return;
    }
    callback(null, true);
  },
});

export const uploadDeliveryFile = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!DELIVERY_FILE_TYPES.has(file.mimetype)) {
      callback(new AppError('يسمح بالتسليم بصور أو PDF أو TXT أو فيديو MP4/WebM/MOV.', 400));
      return;
    }
    callback(null, true);
  },
});
