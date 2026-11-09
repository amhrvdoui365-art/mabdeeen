import { api, unwrap } from './api';

export type OrderStatus = 'requested' | 'accepted' | 'rejected' | 'in_progress' | 'delivered' | 'revision_requested' | 'completed' | 'cancelled';
export interface ServiceOrder { id: string; serviceId: string | null; freelancerId: string; buyerId: string; serviceTitle: string; price: number; brief: string; status: OrderStatus; createdAt: string; updatedAt: string; completedAt: string | null; }
export interface OrderMessage { id: string; senderId: string; senderName?: string; content: string; createdAt: string; }
export interface OrderDetails extends ServiceOrder { messages: OrderMessage[]; reviewed: boolean; }
export const ordersApi = {
  list: async () => unwrap<{ items: ServiceOrder[] }>(await api.get('/orders')).items,
  get: async (id: string) => unwrap<{ order: OrderDetails }>(await api.get(`/orders/${id}`)).order,
  create: async (serviceId: string, brief: string) => unwrap<{ order: ServiceOrder }>(await api.post('/orders', { serviceId, brief })).order,
  action: async (id: string, action: string) => unwrap<{ order: ServiceOrder }>(await api.post(`/orders/${id}/actions`, { action })).order,
  message: async (id: string, content: string) => unwrap<{ message: OrderMessage }>(await api.post(`/orders/${id}/messages`, { content })).message,
  review: async (id: string, rating: number, comment: string) => unwrap<{ id: string }>(await api.post(`/orders/${id}/review`, { rating, comment })),
};
