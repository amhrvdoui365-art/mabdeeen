import { api, unwrap } from './api';

export interface ChildLinkRequest { id: string; parentId: string; childId: string; status: 'PENDING'; createdAt: string; parentName: string; parentAvatar: string | null; }
export interface LinkedChild { id: string; name: string; avatarUrl: string | null; parentDisplayName: string | null; parentAvatarDataUrl: string | null; title: string | null; location: string | null; bio: string | null; githubUrl: string | null; linkedinUrl: string | null; websiteUrl: string | null; hourlyRate: number | null; minBudget: number | null; isAvailable: number; isVerified: number; linkedAt: string; portfolioCount: number; serviceCount: number; postCount: number; reviewCount: number; skills: Array<{ id: string; name: string }>; services: Array<{ id: string; title: string; description: string; category: string; price: number; mediaJson: string; sourcesJson: string; createdAt: string }>; posts: Array<{ id: string; title: string; content: string; category: string; coverImage: string | null; createdAt: string; viewsCount: number; likesCount: number }>; portfolio: Array<{ id: string; title: string; description: string | null; imageUrl: string | null; projectUrl: string | null; createdAt: string }>; }
export interface ParentChatConsent { linkId: string; parentId: string; parentName: string; parentAvatar: string | null; chatAccessEnabled: boolean; }
export interface ChildConversation { peerId: string; peerName: string; peerAvatar: string | null; serviceId: string | null; serviceTitle: string | null; lastMessageAt: string; lastMessage: string; }
export interface ChildMessage { id: string; senderId: string; senderName: string; receiverId: string; receiverName: string; content: string; createdAt: string; attachmentName: string | null; attachmentMime: string | null; }
export interface ParentAccessLog { id: string; action: 'VIEW_CONVERSATIONS' | 'VIEW_MESSAGES'; createdAt: string; parentName: string; peerName: string | null; }
export interface ParentVerificationRequest { id: string; childId: string; childName: string; childEmail: string; parentEmail: string | null; status: string; createdAt: string; submittedAt: string | null; }

export const parentApi = {
  requestLink: async (childEmail: string) => unwrap<{ id: string; childName: string }>(await api.post('/parent/link-request', { childEmail })),
  linkRequests: async () => unwrap<{ items: ChildLinkRequest[] }>(await api.get('/parent/link-requests')).items,
  respond: async (linkId: string, status: 'APPROVED' | 'REJECTED') => api.patch('/parent/link-response', { linkId, status }),
  children: async () => unwrap<{ items: LinkedChild[] }>(await api.get('/parent/children')).items,
  updateChildDisplay: async (childId: string, displayName: string, avatar?: File) => {
    const form = new FormData();
    form.append('displayName', displayName);
    if (avatar) form.append('avatar', avatar);
    return api.patch(`/parent/children/${encodeURIComponent(childId)}/display`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  chatConsents: async () => unwrap<{ items: ParentChatConsent[] }>(await api.get('/parent/chat-consent')).items,
  approveExistingChatAccess: async (linkId: string) => api.post('/parent/chat-access/approve-existing-link', { linkId }),
  accessLog: async () => unwrap<{ items: ParentAccessLog[] }>(await api.get('/parent/access-log')).items,
  childConversations: async (childId: string) => unwrap<{ items: ChildConversation[] }>(await api.get(`/parent/children/${childId}/conversations`)).items,
  childMessages: async (childId: string, peerId: string, serviceId?: string | null) => unwrap<{ items: ChildMessage[] }>(await api.get(`/parent/children/${childId}/conversations/${peerId}/messages`, { params: serviceId ? { serviceId } : undefined })).items,
  childMessageAttachment: async (childId: string, messageId: string) => (await api.get(`/parent/children/${childId}/messages/${messageId}/attachment`, { responseType: 'blob' })).data as Blob,
  startVerification: async (email: string) => unwrap<{ sent: boolean }>(await api.post('/parent/verification/start', { email })),
  verificationInfo: async (token: string) => unwrap<{ childName: string; a: number; b: number }>(await api.get(`/parent/verify/${encodeURIComponent(token)}`)),
  submitVerification: async (token: string, answer: number, photo: Blob) => {
    const form = new FormData();
    form.append('answer', String(answer));
    form.append('photo', photo, 'parent-verification.jpg');
    return api.post(`/parent/verify/${encodeURIComponent(token)}`, form, { headers: { 'Content-Type': 'multipart/form-data' } });
  },
  adminQueue: async () => unwrap<{ items: ParentVerificationRequest[] }>(await api.get('/parent/admin/verifications')).items,
  adminPhoto: async (id: string) => (await api.get(`/parent/admin/verifications/${id}/photo`, { responseType: 'blob' })).data as Blob,
  review: async (id: string, approve: boolean) => api.patch(`/parent/admin/verifications/${id}`, { approve }),
};
