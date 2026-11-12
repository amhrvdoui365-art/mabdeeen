import type { Pagination, Skill } from './freelancer';

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
  title: string | null;
  bio: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isActive: boolean;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  isDemoAccount: boolean;
  featuredUntil: string | null;
  avgResponseHours: number | null;
  createdAt: string;
  avgRating: number;
  reviewCount: number;
  pendingFlags: number;
}

export interface AdminReport {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerEmail: string;
  reason: string;
  status: 'Pending' | 'Resolved';
  createdAt: string;
}

export interface AdminReview {
  id: string;
  freelancerId: string;
  freelancerName: string;
  clientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface AdminConversation {
  participantAId: string;
  participantAName: string;
  participantAEmail: string;
  participantAAvatarUrl: string | null;
  participantBId: string;
  participantBName: string;
  participantBEmail: string;
  participantBAvatarUrl: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  serviceFreelancerId?: string | null;
  lastMessageAt: string;
  messageCount: number;
}

export interface AdminConversationMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  createdAt: string;
  attachment: { name: string; mimeType: string; size: number } | null;
}

export interface AdminAuditLog {
  id: string;
  adminId: string | null;
  adminName: string | null;
  action: string;
  subjectType: string;
  subjectId: string;
  reason: string;
  createdAt: string;
}

export interface AdminStats {
  freelancers: number;
  activeFreelancers: number;
  featuredFreelancers: number;
  verifiedFreelancers: number;
  reviews: number;
  pendingReports: number;
  pendingFlags: number;
  blockedIps: number;
  liveSessions: number;
  profileViews: number;
  topSkills: Array<Skill & { freelancers: number }>;
}

export interface AdminUsersResult {
  items: AdminUser[];
  pagination: Pagination;
}

export interface AdminReportsResult {
  items: AdminReport[];
  pagination: Pagination;
}

export interface AdminReviewsResult {
  items: AdminReview[];
  pagination: Pagination;
}
