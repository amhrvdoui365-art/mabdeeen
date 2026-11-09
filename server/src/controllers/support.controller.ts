import type { Request, Response } from 'express';
import { createSupportTicket, getAdminSupportTickets, getMySupportTickets, getSupportMessageAttachment, getSupportTicketMessages, sendSupportMessage, updateSupportTicketStatus } from '../services/support.service';

export const createTicket = async (req: Request, res: Response): Promise<void> => {
  const ticket = await createSupportTicket(req.user!.id, req.body.subject, req.body.message, req.file);
  res.status(201).json({ success: true, data: { ticket } });
};

export const myTickets = async (req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: getMySupportTickets(req.user!.id) } });
};

export const ticketMessages = async (req: Request, res: Response): Promise<void> => {
  const result = await getSupportTicketMessages(req.user!.id, String(req.params.id));
  res.status(200).json({ success: true, data: result });
};

export const addTicketMessage = async (req: Request, res: Response): Promise<void> => {
  const message = await sendSupportMessage(req.user!.id, String(req.params.id), req.body.message, req.file);
  res.status(201).json({ success: true, data: { message } });
};

export const ticketAttachment = async (req: Request, res: Response): Promise<void> => {
  const attachment = await getSupportMessageAttachment(req.user!.id, String(req.params.id), String(req.params.messageId));
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Type', attachment.mimeType);
  res.setHeader('Cache-Control', 'private, no-store');
  res.download(attachment.filePath, attachment.name, (error) => { if (error && !res.headersSent) res.status(404).end(); });
};

export const adminTickets = async (_req: Request, res: Response): Promise<void> => {
  res.status(200).json({ success: true, data: { items: getAdminSupportTickets() } });
};

export const adminTicketStatus = async (req: Request, res: Response): Promise<void> => {
  const ticket = await updateSupportTicketStatus(String(req.params.id), req.body.status);
  res.status(200).json({ success: true, data: { ticket } });
};
