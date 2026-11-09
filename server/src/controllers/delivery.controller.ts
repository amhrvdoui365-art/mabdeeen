import type { Request, Response } from 'express';
import { approveProjectDelivery, getDeliveryFile, listProjectDeliveries, mapDelivery,
  requestProjectDeliveryRevision, uploadProjectDelivery } from '../services/delivery.service';
import type { createDeliverySchema, deliveryProjectQuerySchema } from '../validators/delivery.validator';
import { listMyDeliveryVault, uploadProjectDeliveryLink } from '../services/delivery.service';
import type { createDeliveryLinkSchema } from '../validators/delivery.validator';
import type { z } from 'zod';
import { listOrderDeliveryItems, uploadOrderDeliveryFile, uploadOrderDeliveryLink } from '../services/delivery.service';

export const listProjectDeliveryItems = (req: Request, res: Response): void => {
  const { projectId, orderId } = req.query as unknown as z.infer<typeof deliveryProjectQuerySchema>;
  const items = orderId ? listOrderDeliveryItems(req.user!.id, orderId) : listProjectDeliveries(req.user!.id, projectId!);
  res.status(200).json({ success: true, data: { items: items.map(mapDelivery) } });
};

export const listDeliveryVault = (req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: { items: listMyDeliveryVault(req.user!.id) } });
};

export const createDeliveryLink = (req: Request, res: Response): void => {
  const input = req.body as z.infer<typeof createDeliveryLinkSchema>;
  const delivery = input.orderId ? uploadOrderDeliveryLink(req.user!.id, { ...input, orderId: input.orderId }) : uploadProjectDeliveryLink(req.user!.id, { ...input, projectId: input.projectId!, clientId: input.clientId! });
  res.status(201).json({ success: true, data: { delivery } });
};

export const uploadDelivery = async (req: Request, res: Response): Promise<void> => {
  const input = req.body as z.infer<typeof createDeliverySchema>;
  const delivery = input.orderId ? await uploadOrderDeliveryFile(req.user!.id, input.orderId, req.file) : await uploadProjectDelivery(req.user!.id, { projectId: input.projectId!, clientId: input.clientId! }, req.file);
  res.status(201).json({ success: true, message: 'تم رفع التسليم بأمان.', data: { delivery } });
};

export const approveDelivery = (req: Request, res: Response): void => {
  const result = approveProjectDelivery(String(req.params.id), req.user!.id);
  res.status(200).json({ success: true, message: 'تم تأكيد الاستلام وإضافة النقاط.', data: result });
};

export const requestRevision = (req: Request, res: Response): void => {
  const delivery = requestProjectDeliveryRevision(String(req.params.id), req.user!.id);
  res.status(200).json({ success: true, message: 'تم إرسال طلب التعديل للمستقل.', data: { delivery } });
};

export const deliveryFile = (req: Request, res: Response): void => {
  const download = req.query.download === '1';
  const file = getDeliveryFile(String(req.params.id), req.user!.id, download);
  const disposition = download ? 'attachment' : 'inline';
  const safeName = encodeURIComponent(file.name).replace(/['()]/g, escape);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'self'; sandbox");
  res.setHeader('Content-Disposition', `${disposition}; filename*=UTF-8''${safeName}`);
  res.type(file.mimeType);
  res.sendFile(file.filePath, (error) => {
    if (error && !res.headersSent) res.status(404).end();
  });
};
