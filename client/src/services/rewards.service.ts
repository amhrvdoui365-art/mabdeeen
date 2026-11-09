import { api, unwrap } from './api';

export type DeliveryStatus = 'pending_approval' | 'approved' | 'rejected' | 'revision_requested';

export interface ProtectedDelivery {
  id: string;
  projectId: string;
  freelancerId: string;
  clientId: string;
  fileUrl: string;
  previewUrl: string;
  downloadUrl: string | null;
  fileType: string;
  fileName: string;
  fileSize: number;
  status: DeliveryStatus;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
  sourceUrl?: string | null;
  sourceKind?: 'file' | 'website' | 'youtube' | 'drive';
  serviceTitle?: string;
}

export interface RewardItem {
  code: 'premium_badge' | 'verified_week' | 'featured_week';
  title: string;
  description: string;
  cost: number;
  durationDays: number;
}

export interface RewardsSnapshot {
  points: number;
  lifetimePoints: number;
  sellerDeliveryPoints: number;
  claimedMilestones: Array<{ milestone: number; rewardCode: string; expiresAt: string }>;
  benefits: {
    verifiedUntil: string | null;
    premiumBadgeUntil: string | null;
    featuredUntil: string | null;
    isFeatured: boolean;
    featuredServices: Array<{ id: string; title: string; expiresAt: string }>;
  };
  transactions: Array<{ id: string; amount: number; reason: string; createdAt: string }>;
  rewards: RewardItem[];
}

export const deliveryApi = {
  list: async (projectId?: string, orderId?: string): Promise<ProtectedDelivery[]> => {
    const response = await api.get('/deliveries', { params: orderId ? { orderId } : { projectId } });
    return unwrap<{ items: ProtectedDelivery[] }>(response).items;
  },
  vault: async (): Promise<ProtectedDelivery[]> => {
    const response = await api.get('/deliveries/vault');
    return unwrap<{ items: ProtectedDelivery[] }>(response).items;
  },
  upload: async (input: { projectId?: string; clientId?: string; orderId?: string; file: File }): Promise<ProtectedDelivery> => {
    const form = new FormData();
    if (input.projectId) form.append('projectId', input.projectId);
    if (input.clientId) form.append('clientId', input.clientId);
    if (input.orderId) form.append('orderId', input.orderId);
    form.append('file', input.file);
    const response = await api.post('/deliveries/upload', form, { headers: { 'Content-Type': 'multipart/form-data' } });
    return unwrap<{ delivery: ProtectedDelivery }>(response).delivery;
  },
  addLink: async (input: { projectId?: string; clientId?: string; orderId?: string; url: string; title: string }): Promise<ProtectedDelivery> => {
    const response = await api.post('/deliveries/link', input);
    return unwrap<{ delivery: ProtectedDelivery }>(response).delivery;
  },
  approve: async (id: string): Promise<{ delivery: ProtectedDelivery; pointsAwarded: number }> => {
    const response = await api.post(`/deliveries/${id}/approve`);
    return unwrap<{ delivery: ProtectedDelivery; pointsAwarded: number }>(response);
  },
  requestRevision: async (id: string): Promise<ProtectedDelivery> => {
    const response = await api.post(`/deliveries/${id}/request-revision`);
    return unwrap<{ delivery: ProtectedDelivery }>(response).delivery;
  },
  file: async (url: string, download = false): Promise<Blob> => {
    const response = await api.get(url, { params: download ? { download: 1 } : undefined, responseType: 'blob' });
    return response.data as Blob;
  },
};

export const rewardsApi = {
  get: async (): Promise<RewardsSnapshot> => {
    const response = await api.get('/rewards');
    return unwrap<RewardsSnapshot>(response);
  },
  redeem: async (rewardCode: RewardItem['code'], serviceId?: string): Promise<{ points: number; expiresAt: string }> => {
    const response = await api.post('/rewards/redeem', { rewardCode, serviceId });
    return unwrap<{ points: number; expiresAt: string }>(response);
  },
  claim: async (milestone: number): Promise<{ milestone: number; expiresAt: string }> => {
    const response = await api.post('/rewards/claim', { milestone });
    return unwrap<{ milestone: number; expiresAt: string }>(response);
  },
};
