import type {
  AdminReportsResult,
  AdminReviewsResult,
  AdminConversationsResult,
  AdminAuditResult,
  AdminConversationMessage,
  AdminStats,
  AdminUser,
  AdminUserPatch,
  AdminUsersResult,
  SiteNotification,
} from '@/types';
import { api, unwrap } from './api';

export interface AdminUsersParams {
  q?: string;
  role?: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  status?: 'active' | 'inactive';
  featured?: boolean;
  verified?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminReportsParams {
  status?: 'Pending' | 'Resolved';
  page?: number;
  limit?: number;
}

export interface AdminReviewsParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminConversationsParams {
  q?: string;
  page?: number;
  limit?: number;
}

export interface AdminOperationsParams { q?: string; status?: string; page?: number; limit?: number; }
export const PLATFORM_WIPE_CONFIRMATION = 'DELETE ALL PLATFORM DATA';
export interface ManagedArticle { id: string; title: string; slug: string; excerpt: string; content: string; coverImage: string; category: string; authorName: string; publishedAt: string; readTime: number; }
export interface ManagedReward { code: 'premium_badge' | 'featured_week' | 'verified_week'; title: string; defaultCost?: number; cost: number; durationDays: number; }
export interface ManagedRewardSettings { sellerDeliveryPoints: number; rewards: ManagedReward[]; }
export interface ManagedDelivery { id: string; name: string; mimeType: string; size: number; sourceUrl: string | null; sourceKind: string | null; }
export interface ManagedOrder { id: string; serviceId: string | null; serviceTitle: string; points: number; status: string; createdAt: string; updatedAt: string; buyerId: string; buyerName: string; buyerEmail: string; freelancerId: string; freelancerName: string; freelancerEmail: string; caseId: string | null; caseStatus: 'OPEN' | 'RESOLVED' | null; caseReason: string | null; deliveries: ManagedDelivery[]; }
export interface ManagedService { id: string; title: string; category: string; points: number; status: 'active' | 'inactive'; createdAt: string; freelancerId: string; freelancerName: string; freelancerEmail: string; media: Array<{ url: string; title?: string; type: 'image' | 'video' | 'link' }>; }

export const adminApi = {
  stats: async (): Promise<AdminStats> => {
    const response = await api.get('/admin/stats');
    return unwrap<AdminStats>(response);
  },

  conversations: async (params: AdminConversationsParams): Promise<AdminConversationsResult> => {
    const response = await api.get('/admin/conversations', { params });
    return unwrap<AdminConversationsResult>(response);
  },

  conversationMessages: async (input: {
    participantAId: string;
    participantBId: string;
    serviceId: string | null;
    reason: string;
  }): Promise<AdminConversationMessage[]> => {
    const response = await api.get(`/admin/conversations/${input.participantAId}/${input.participantBId}/messages`, {
      params: { serviceId: input.serviceId ?? undefined, reason: input.reason },
    });
    return unwrap<{ items: AdminConversationMessage[] }>(response).items;
  },

  auditLogs: async (params: { page?: number; limit?: number }): Promise<AdminAuditResult> => {
    const response = await api.get('/admin/audit-logs', { params });
    return unwrap<AdminAuditResult>(response);
  },

  users: async (params: AdminUsersParams): Promise<AdminUsersResult> => {
    const response = await api.get('/admin/users', { params });
    return unwrap<AdminUsersResult>(response);
  },

  setUserStatus: async (userId: string, isActive: boolean): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/status`, { isActive });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserFeatured: async (
    userId: string,
    isFeatured: boolean,
    featuredUntil?: string | null,
  ): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/featured`, {
      isFeatured,
      featuredUntil: featuredUntil ?? null,
    });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserVerified: async (userId: string, isVerified: boolean): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/verified`, { isVerified });
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserDemoAccount: async (userId: string, isDemoAccount: boolean): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}/demo`, { isDemoAccount });
    return unwrap<{ user: AdminUser }>(response).user;
  },

  manageUser: async (userId: string, payload: AdminUserPatch): Promise<AdminUser> => {
    const response = await api.patch(`/admin/users/${userId}`, payload);
    const data = unwrap<{ user: AdminUser }>(response);
    return data.user;
  },

  setUserPassword: async (userId: string, password: string): Promise<void> => {
    await api.put(`/admin/users/${userId}/password`, { password });
  },

  deleteUser: async (userId: string): Promise<void> => {
    await api.delete(`/admin/users/${userId}`);
  },

  impersonateUser: async (userId: string): Promise<{ token: string; expiresInSeconds: number }> =>
    unwrap<{ token: string; expiresInSeconds: number }>(await api.post(`/admin/users/${userId}/impersonate`)),
  stopImpersonation: async (): Promise<void> => { await api.post('/auth/impersonation/stop'); },
  conversationAttachment: async (messageId: string): Promise<Blob> =>
    (await api.get(`/admin/messages/${messageId}/attachment`, { responseType: 'blob' })).data as Blob,
  orderDeliveryFile: async (deliveryId: string): Promise<Blob> =>
    (await api.get(`/admin/orders/deliveries/${deliveryId}/file`, { responseType: 'blob' })).data as Blob,
  wipePlatform: async (confirmation: string): Promise<{ deletedRows: Record<string, number>; preservedAdminAccounts: number; clearedUploadDirectories: number; warnings: string[] }> =>
    unwrap(await api.post('/admin/platform/wipe', { confirmation })),

  reports: async (params: AdminReportsParams): Promise<AdminReportsResult> => {
    const response = await api.get('/admin/reports', { params });
    return unwrap<AdminReportsResult>(response);
  },

  setReportStatus: async (
    reportId: string,
    status: 'Pending' | 'Resolved',
  ): Promise<void> => {
    await api.patch(`/admin/reports/${reportId}`, { status });
  },

  reviews: async (params: AdminReviewsParams): Promise<AdminReviewsResult> => {
    const response = await api.get('/admin/reviews', { params });
    return unwrap<AdminReviewsResult>(response);
  },

  deleteReview: async (reviewId: string): Promise<void> => {
    await api.delete(`/admin/reviews/${reviewId}`);
  },

  notifications: async (): Promise<SiteNotification[]> => {
    const response = await api.get('/admin/notifications');
    return unwrap<{ items: SiteNotification[] }>(response).items;
  },

  createNotification: async (payload: { title: string; message: string }): Promise<SiteNotification> => {
    const response = await api.post('/admin/notifications', payload);
    return unwrap<{ notification: SiteNotification }>(response).notification;
  },

  setNotificationActive: async (id: string, isActive: boolean): Promise<SiteNotification> => {
    const response = await api.patch(`/admin/notifications/${id}`, { isActive });
    return unwrap<{ notification: SiteNotification }>(response).notification;
  },

  orders: async (params: AdminOperationsParams) => unwrap<{ items: ManagedOrder[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>(await api.get('/admin/orders', { params })),
  setOrderStatus: async (id: string, status: 'cancelled' | 'rejected', reason: string) => unwrap<{ order: { id: string; status: string } }>(await api.patch(`/admin/orders/${id}/status`, { status, reason })),
  openOrderCase: async (id: string, reason: string) => unwrap<{ case: { id: string; orderId: string; status: string } }>(await api.post(`/admin/orders/${id}/cases`, { reason })),
  resolveOrderCase: async (id: string, resolution: string) => unwrap<{ case: { id: string; status: string } }>(await api.patch(`/admin/order-cases/${id}`, { resolution })),
  services: async (params: AdminOperationsParams) => unwrap<{ items: ManagedService[]; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>(await api.get('/admin/services', { params })),
  setServiceStatus: async (id: string, status: 'active' | 'inactive', reason: string) => unwrap<{ service: { id: string; status: string } }>(await api.patch(`/admin/services/${id}/status`, { status, reason })),
  points: async (params: AdminOperationsParams) => unwrap<{ items: Array<{ id: string; name: string; email: string; role: string; points: number; lifetimePoints: number }>; pagination: { page: number; limit: number; totalItems: number; totalPages: number } }>(await api.get('/admin/points', { params })),
  adjustPoints: async (id: string, amount: number, reason: string) => unwrap<{ transaction: { id: string; userId: string; amount: number; reason: string } }>(await api.post(`/admin/points/${id}/adjust`, { amount, reason })),
  rewardSettings: async (): Promise<ManagedRewardSettings> => unwrap<ManagedRewardSettings>(await api.get('/admin/rewards/settings')),
  saveRewardSettings: async (deliveryPoints: number, rewards: Array<{ code: ManagedReward['code']; cost: number }>): Promise<ManagedRewardSettings> => unwrap<ManagedRewardSettings>(await api.patch('/admin/rewards/settings', { deliveryPoints, rewards })),
  articles: async (): Promise<ManagedArticle[]> => unwrap<{ items: ManagedArticle[] }>(await api.get('/admin/articles/manage')).items,
  saveArticle: async (article: Omit<ManagedArticle, 'id' | 'authorName' | 'publishedAt'>, id?: string): Promise<ManagedArticle> => unwrap<{ article: ManagedArticle }>(await (id ? api.patch(`/admin/articles/manage/${id}`, article) : api.post('/admin/articles/manage', article))).article,
  deleteArticle: async (id: string): Promise<void> => { await api.delete(`/admin/articles/manage/${id}`); },
  exportData: async (entity: 'users' | 'services' | 'orders' | 'points' | 'articles' | 'reports'): Promise<void> => {
    const response = await api.get(`/admin/export/${entity}`, { responseType: 'blob' });
    const url = URL.createObjectURL(response.data as Blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `mabdeen-${entity}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  },
};
