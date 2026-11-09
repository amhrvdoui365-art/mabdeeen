import type { Request, Response } from 'express';
import { addOrderMessage, createOrder, createOrderReview, getOrderDetails, listOrders, transitionOrder } from '../services/orders.service';

export const listMyOrders = (req: Request, res: Response) => res.json({ success: true, data: { items: listOrders(req.user!.id) } });
export const showOrder = (req: Request, res: Response) => res.json({ success: true, data: { order: getOrderDetails(String(req.params.id), req.user!.id) } });
export const requestOrder = (req: Request, res: Response) => res.status(201).json({ success: true, data: { order: createOrder(req.user!.id, req.body.serviceId, req.body.brief) } });
export const actOnOrder = (req: Request, res: Response) => res.json({ success: true, data: { order: transitionOrder(String(req.params.id), req.user!.id, req.body.action) } });
export const postOrderMessage = (req: Request, res: Response) => res.status(201).json({ success: true, data: { message: addOrderMessage(String(req.params.id), req.user!.id, req.body.content) } });
export const reviewOrder = (req: Request, res: Response) => res.status(201).json({ success: true, data: createOrderReview(String(req.params.id), req.user!.id, req.body.rating, req.body.comment) });
