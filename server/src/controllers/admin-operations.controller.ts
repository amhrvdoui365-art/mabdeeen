import type { Request, Response } from 'express';
import * as operations from '../services/admin-operations.service';

export const adminOrders = async (req: Request, res: Response) => res.json({ success: true, data: operations.listAdminOrders(req.query as never) });
export const adminOrderStatus = async (req: Request, res: Response) => res.json({ success: true, data: { order: operations.setAdminOrderStatus(req.user!.id, String(req.params.id), req.body.status, req.body.reason) } });
export const adminOrderCase = async (req: Request, res: Response) => res.status(201).json({ success: true, data: { case: operations.openAdminOrderCase(req.user!.id, String(req.params.id), req.body.reason) } });
export const adminOrderCaseResolve = async (req: Request, res: Response) => res.json({ success: true, data: { case: operations.resolveAdminOrderCase(req.user!.id, String(req.params.id), req.body.resolution) } });
export const adminServices = async (req: Request, res: Response) => res.json({ success: true, data: operations.listAdminServices(req.query as never) });
export const adminServiceStatus = async (req: Request, res: Response) => res.json({ success: true, data: { service: operations.setAdminServiceStatus(req.user!.id, String(req.params.id), req.body.status, req.body.reason) } });
export const adminPoints = async (req: Request, res: Response) => res.json({ success: true, data: operations.listAdminPointAccounts(req.query as never) });
export const adminPointAdjustment = async (req: Request, res: Response) => res.status(201).json({ success: true, data: { transaction: operations.adjustAdminPoints(req.user!.id, String(req.params.id), req.body.amount, req.body.reason) } });
export const adminRewards = async (_req: Request, res: Response) => res.json({ success: true, data: operations.getAdminRewardSettings() });
export const adminSaveRewards = async (req: Request, res: Response) => res.json({ success: true, data: operations.saveAdminRewardSettings(req.user!.id, req.body.deliveryPoints, req.body.rewards) });
export const adminArticles = async (_req: Request, res: Response) => res.json({ success: true, data: { items: operations.listAdminArticles() } });
export const adminSaveArticle = async (req: Request, res: Response) => res.status(req.params.id ? 200 : 201).json({ success: true, data: { article: operations.saveAdminArticle({ ...req.body, id: req.params.id }, req.user!.id) } });
export const adminDeleteArticle = async (req: Request, res: Response) => { operations.deleteAdminArticle(req.user!.id, String(req.params.id)); res.status(200).json({ success: true, data: { deleted: true } }); };
export const adminExport = async (req: Request, res: Response) => {
  const entity = String(req.params.entity) as 'users' | 'services' | 'orders' | 'points' | 'articles' | 'reports';
  const csv = operations.exportAdminData(entity);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="mabdeen-${entity}-${new Date().toISOString().slice(0, 10)}.csv"`);
  res.setHeader('Cache-Control', 'private, no-store');
  res.send(csv);
};

export const adminWipePlatform = async (req: Request, res: Response) => {
  const result = operations.wipePlatformData(req.user!.id);
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ success: true, message: 'تم مسح بيانات المنصة والإبقاء على حسابات الإدارة.', data: result });
};

export const adminImpersonate = async (req: Request, res: Response) => {
  const result = operations.startAdminImpersonation(req.user!.id, String(req.params.id));
  res.setHeader('Cache-Control', 'no-store');
  res.status(200).json({ success: true, data: result });
};

export const adminConversationAttachment = async (req: Request, res: Response) => {
  const file = operations.getAdminConversationAttachment(req.user!.id, String(req.params.id));
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.type(file.mimeType).sendFile(file.filePath, (error) => { if (error && !res.headersSent) res.status(404).end(); });
};

export const adminOrderDeliveryFile = async (req: Request, res: Response) => {
  const file = operations.getAdminOrderDelivery(req.user!.id, String(req.params.id));
  res.setHeader('Cache-Control', 'private, no-store, max-age=0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', `inline; filename*=UTF-8''${encodeURIComponent(file.name)}`);
  res.type(file.mimeType).sendFile(file.filePath, (error) => { if (error && !res.headersSent) res.status(404).end(); });
};
