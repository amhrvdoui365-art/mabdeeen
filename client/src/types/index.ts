export type Role = 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';
export type AccountStatus = 'ACTIVE' | 'PENDING_PARENT_APPROVAL' | 'PENDING_ADMIN_REVIEW' | 'REJECTED';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  isDemo?: boolean;
  bio: string | null;
  title: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  isActive: boolean;
  profileComplete: boolean;
  accountStatus: AccountStatus;
  createdAt: string;
}

export interface PublicFreelancer {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  createdAt: string;
}

export interface Skill {
  id: string;
  name: string;
}

export interface Article {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  coverImage: string;
  category: string;
  authorName: string;
  authorAvatar: string | null;
  publishedAt: string;
  readTime: number;
  authorId: string | null;
}

export interface InteractionSummary {
  likesCount: number;
  commentsCount: number;
  likedByMe: boolean;
}

export type CommunityAuthorRole = 'FREELANCER' | 'CLIENT' | 'ADMIN';
export type CommunityPostStatus = 'PUBLISHED' | 'DRAFT';
export interface CommunityPost {
  id: string;
  title: string;
  content: string;
  coverImage: string | null;
  authorId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: CommunityAuthorRole;
  category: string;
  status: CommunityPostStatus;
  createdAt: string;
  viewsCount: number;
  likesCount: number;
  likedByMe?: boolean;
}

export interface CommunityPostComment {
  id: string;
  postId: string | null;
  articleId: string | null;
  userId: string;
  authorName: string;
  authorAvatar: string | null;
  authorRole: Role;
  content: string;
  attachmentUrl: string | null;
  attachmentType: 'IMAGE' | 'VIDEO' | 'FILE' | null;
  createdAt: string;
}
export interface CommunityPostPayload {
  title: string;
  content: string;
  coverImage?: string | null;
  category: string;
  status: CommunityPostStatus;
}

export interface Review {
  id: string;
  clientName: string;
  rating: number;
  comment: string | null;
  createdAt: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  description: string | null;
  imageUrl: string | null;
  projectUrl: string | null;
  createdAt: string;
}

export interface FreelancerStats {
  viewCount: number;
  reviewCount: number;
  avgRating: number;
}

export interface FreelancerCard {
  id: string;
  name: string;
  title: string | null;
  bio: string | null;
  location: string | null;
  minBudget: number | null;
  hourlyRate: number | null;
  avatarUrl: string | null;
  isAvailable: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  avgResponseHours: number | null;
  createdAt: string;
  avgRating: number;
  reviewCount: number;
  skills: Skill[];
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface FreelancersResult {
  items: FreelancerCard[];
  pagination: Pagination;
}

export interface FreelancerDetail {
  freelancer: PublicFreelancer;
  skills: Skill[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  stats: FreelancerStats;
}

export type ServiceStatus = 'active' | 'inactive';
export interface ServiceMedia { url: string; type: 'image' | 'video' | 'link'; }
export interface ServiceSource { title: string; url: string; }

export interface MicroService {
  id: string;
  freelancerId: string;
  freelancerName: string;
  freelancerAvatarUrl: string | null;
  title: string;
  description: string;
  price: number;
  category: string;
  media: ServiceMedia[];
  sources: ServiceSource[];
  status: ServiceStatus;
  createdAt: string;
}

export interface MicroServicePayload {
  title: string;
  description: string;
  price: number;
  category: string;
  media?: ServiceMedia[];
  sources?: ServiceSource[];
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  serviceId: string | null;
  content: string;
  attachment: {
    name: string;
    mimeType: string;
    size: number;
    downloadUrl: string;
  } | null;
  isRead: boolean;
  createdAt: string;
}

export interface ChatConversation {
  userId: string;
  name: string;
  avatarUrl: string | null;
  serviceId: string | null;
  serviceTitle: string | null;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
}

export interface ProfileResult {
  user: PublicFreelancer;
  skills: Skill[];
  stats: FreelancerStats;
}

export interface AuthResult {
  user: AuthUser;
  token: string;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: Role;
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
  lastMessage: string;
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

export interface AdminReview {
  id: string;
  freelancerId: string;
  freelancerName: string;
  clientName: string;
  rating: number;
  comment: string | null;
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

export interface AdminConversationsResult {
  items: AdminConversation[];
  pagination: Pagination;
}

export interface AdminAuditResult {
  items: AdminAuditLog[];
  pagination: Pagination;
}

export interface SiteNotification {
  id: string;
  title: string;
  message: string;
  isActive: boolean;
  createdAt: string;
}

export interface InboxNotification {
  id: string;
  type: 'NEW_MESSAGE' | 'NEW_REVIEW' | 'ACCOUNT_STATUS' | 'NEW_REPORT' | 'ADMIN_ANNOUNCEMENT' | 'NEW_POST_COMMENT' | 'NEW_POST_LIKE' | 'PARENT_LINK_REQUEST';
  title: string;
  message: string;
  link: string;
  isRead: boolean;
  createdAt: string;
}

export interface UpdateProfilePayload {
  name?: string;
  bio?: string | null;
  title?: string | null;
  location?: string | null;
  minBudget?: number | null;
  hourlyRate?: number | null;
  avatarUrl?: string | null;
  isAvailable?: boolean;
  skillIds?: string[];
}

export interface CreatePortfolioPayload {
  title: string;
  description?: string;
  imageUrl?: string;
  projectUrl?: string;
}

export interface CreateReviewPayload {
  clientName: string;
  rating: number;
  comment?: string;
}

export interface CreateReportPayload {
  reason: string;
}

export interface SystemStatus {
  maintenanceEnabled: boolean;
  maintenanceMessage: string;
  maintenanceReturnsAt: string | null;
  registrationOpen: boolean;
  serverTime: string;
}

export interface SystemSettingsPayload {
  maintenanceEnabled?: boolean;
  maintenanceMessage?: string;
  maintenanceReturnsAt?: string | null;
  registrationOpen?: boolean;
  blockedTerms?: string[];
}

export interface SystemHealth {
  status: 'ok' | 'degraded';
  environment: string;
  nodeVersion: string;
  uptimeSeconds: number;
  startedAt: string;
  now: string;
  memory: {
    rssMb: number;
    heapUsedMb: number;
    heapTotalMb: number;
    externalMb: number;
    peakRssMb: number;
  };
  eventLoop: { meanLagMs: number; maxLagMs: number };
  database: { latencyMs: number; sizeMb: number; users: number; sessions: number };
  latency: { samples: number; avgMs: number; p50Ms: number; p95Ms: number; maxMs: number };
  traffic: {
    windowSize: number;
    requests: number;
    statusCounts: { twoXx: number; threeXx: number; fourXx: number; fiveXx: number };
    errors: number;
    topRoutes: Array<{ route: string; count: number; avgMs: number }>;
  };
  routes: Array<{ method: string; path: string; count: number; avgMs: number; maxMs: number }>;
  security: {
    blockedIps: number;
    liveSessions: number;
    anonymousSessions: number;
    revokedSessions: number;
    pendingFlags: number;
  };
}

export interface ActiveSession {
  id: number;
  userId: string | null;
  name: string | null;
  email: string | null;
  role: Role | null;
  ip: string;
  userAgent: string;
  device: string;
  firstSeen: string;
  lastSeen: string;
  routeCount: number;
  revokedAt: string | null;
}

export interface SessionsResult {
  items: ActiveSession[];
  pagination: Pagination;
}

export interface IpBlock {
  ip: string;
  reason: string;
  createdAt: string;
  expiresAt: string | null;
  createdByName: string | null;
}

export type ModerationSeverity = 'low' | 'medium' | 'high';

export interface ModerationFlag {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  field: string;
  rule: string;
  severity: ModerationSeverity;
  excerpt: string;
  suggestion: string | null;
  status: 'Pending' | 'Resolved' | 'Dismissed';
  createdAt: string;
  resolvedAt: string | null;
}

export interface ModerationResult {
  items: ModerationFlag[];
  pagination: Pagination;
}

export interface ModerationScanResult {
  scanned: number;
  flagged: number;
  skipped: number;
}

export interface AdminUserPatch {
  name?: string;
  title?: string | null;
  bio?: string | null;
  location?: string | null;
  minBudget?: number | null;
  hourlyRate?: number | null;
  avgResponseHours?: number | null;
  isAvailable?: boolean;
}
