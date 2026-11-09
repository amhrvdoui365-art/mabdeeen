import type {
  IpBlock,
  ModerationFlag,
  ModerationResult,
  ModerationScanResult,
  SessionsResult,
  SystemHealth,
  SystemSettingsPayload,
  SystemStatus,
} from '@/types';
import { api, unwrap } from './api';

export interface SessionsParams {
  q?: string;
  includeRevoked?: boolean;
  page?: number;
  limit?: number;
}

export interface ModerationParams {
  status?: 'Pending' | 'Resolved' | 'Dismissed';
  severity?: 'low' | 'medium' | 'high';
  page?: number;
  limit?: number;
}

export interface AdminSettingsResult {
  system: SystemStatus;
  blockedTerms: string[];
}

export const systemApi = {
  status: async (): Promise<SystemStatus> => {
    const response = await api.get('/system/status');
    return unwrap<{ system: SystemStatus }>(response).system;
  },

  health: async (): Promise<SystemHealth> => {
    const response = await api.get('/admin/system/health');
    return unwrap<{ metrics: SystemHealth }>(response).metrics;
  },

  settings: async (): Promise<AdminSettingsResult> => {
    const response = await api.get('/admin/system/settings');
    return unwrap<AdminSettingsResult>(response);
  },

  saveSettings: async (payload: SystemSettingsPayload): Promise<SystemStatus> => {
    const response = await api.patch('/admin/system/settings', payload);
    return unwrap<{ system: SystemStatus }>(response).system;
  },

  sessions: async (params: SessionsParams): Promise<SessionsResult> => {
    const response = await api.get('/admin/system/sessions', { params });
    return unwrap<SessionsResult>(response);
  },

  forceLogout: async (userId: string): Promise<number> => {
    const response = await api.post(`/admin/system/sessions/${userId}/revoke`);
    return unwrap<{ revoked: number }>(response).revoked;
  },

  ipBlocks: async (): Promise<IpBlock[]> => {
    const response = await api.get('/admin/system/ip-blocks');
    return unwrap<{ items: IpBlock[] }>(response).items;
  },

  blockIp: async (payload: {
    ip: string;
    reason: string;
    hours: number | null;
  }): Promise<IpBlock> => {
    const response = await api.post('/admin/system/ip-blocks', payload);
    return unwrap<{ block: IpBlock }>(response).block;
  },

  unblockIp: async (ip: string): Promise<void> => {
    await api.delete(`/admin/system/ip-blocks/${encodeURIComponent(ip)}`);
  },

  flags: async (params: ModerationParams): Promise<ModerationResult> => {
    const response = await api.get('/admin/system/moderation', { params });
    return unwrap<ModerationResult>(response);
  },

  actOnFlag: async (
    flagId: string,
    action: 'Resolve' | 'Dismiss' | 'Reopen',
  ): Promise<ModerationFlag> => {
    const response = await api.patch(`/admin/system/moderation/${flagId}`, { action });
    return unwrap<{ flag: ModerationFlag }>(response).flag;
  },

  cleanupFlag: async (flagId: string): Promise<ModerationFlag> => {
    const response = await api.post(`/admin/system/moderation/${flagId}/cleanup`);
    return unwrap<{ flag: ModerationFlag }>(response).flag;
  },

  rescan: async (): Promise<ModerationScanResult> => {
    const response = await api.post('/admin/system/moderation/rescan');
    return unwrap<{ scan: ModerationScanResult }>(response).scan;
  },
};
