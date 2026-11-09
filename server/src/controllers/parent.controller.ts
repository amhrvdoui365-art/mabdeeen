import type { Request, Response } from 'express';
import { adminParentVerificationQueue, getPublicParentVerification, linkedChildren, pendingLinkRequests, requestParentLink, respondToLinkRequest, reviewParentVerificationRequest, startParentVerification, submitParentVerificationForm, parentVerificationPhoto, childParentChatSettings, childParentAccessHistory, parentChildConversations, parentChildMessages, parentChildMessageAttachment, approveLegacyParentChatAccess, updateParentChildDisplay } from '../services/parent.service';
import type { ParentLinkRequestInput } from '../validators/parent.validator';
import { AppError } from '../utils/app-error';

export const requestLink = async (req: Request<unknown, unknown, ParentLinkRequestInput>, res: Response) => res.status(201).json({ success: true, data: await requestParentLink(req.user!.id, req.body.childEmail) });
export const listLinkRequests = async (req: Request, res: Response) => res.json({ success: true, data: { items: pendingLinkRequests(req.user!.id) } });
export const respondLink = async (req: Request, res: Response) => res.json({ success: true, data: await respondToLinkRequest(req.user!.id, String(req.body.linkId), req.body.status) });
export const listLinkedChildrenHandler = async (req: Request, res: Response) => res.json({ success: true, data: { items: linkedChildren(req.user!.id) } });
export const updateChildDisplay = async (req: Request, res: Response) => res.json({ success: true, data: updateParentChildDisplay(req.user!.id, String(req.params.childId), req.body.displayName, req.file) });
export const listChildParentChatSettings = async (req: Request, res: Response) => res.json({ success: true, data: { items: childParentChatSettings(req.user!.id) } });
export const approveLegacyChatAccess = async (req: Request, res: Response) => res.json({ success: true, data: approveLegacyParentChatAccess(req.user!.id, req.body.linkId) });
export const listChildParentAccessHistory = async (req: Request, res: Response) => res.json({ success: true, data: { items: childParentAccessHistory(req.user!.id) } });
export const listParentChildConversations = async (req: Request, res: Response) => res.json({ success: true, data: { items: parentChildConversations(req.user!.id, String(req.params.childId)) } });
export const listParentChildMessages = async (req: Request, res: Response) => res.json({ success: true, data: { items: parentChildMessages(req.user!.id, String(req.params.childId), String(req.params.peerId), typeof req.query.serviceId === 'string' ? req.query.serviceId : null) } });
export const getParentChildMessageAttachment = async (req: Request, res: Response) => {
  const file = parentChildMessageAttachment(req.user!.id, String(req.params.childId), String(req.params.messageId));
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.type(file.mimeType);
  res.setHeader('Content-Disposition', /^(image|video)\//i.test(file.mimeType) ? 'inline' : 'attachment');
  res.sendFile(file.filePath);
};
export const startVerification = async (req: Request, res: Response) => res.status(201).json({ success: true, data: await startParentVerification(req.user!.id, req.body.email) });
export const getVerification = async (req: Request, res: Response) => res.json({ success: true, data: getPublicParentVerification(String(req.params.token)) });
export const submitVerification = async (req: Request, res: Response) => {
  if (!req.file) throw new AppError('أرفق صورة ولي الأمر للتحقق', 400);
  const answer = Number(req.body.answer);
  if (!Number.isInteger(answer)) throw new AppError('أدخل إجابة المسألة الحسابية', 422);
  res.status(201).json({ success: true, data: await submitParentVerificationForm(String(req.params.token), answer, req.file) });
};
export const adminVerificationQueue = async (_req: Request, res: Response) => res.json({ success: true, data: { items: adminParentVerificationQueue() } });
export const adminVerificationPhoto = (req: Request, res: Response) => {
  res.setHeader('Cache-Control', 'private, no-store');
  res.sendFile(parentVerificationPhoto(String(req.params.id)));
};
export const reviewVerification = async (req: Request, res: Response) => res.json({ success: true, data: await reviewParentVerificationRequest(String(req.params.id), req.user!.id, req.body.approve) });
