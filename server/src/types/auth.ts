export type UserRole = 'Freelancer' | 'Buyer' | 'Parent' | 'Admin';

export interface TokenPayload {
  sub: string;
  email: string;
  role: UserRole;
  impersonatedBy?: string;
  demo?: boolean;
  fullDemoAdmin?: boolean;
}

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  impersonatedBy?: string;
  isDemo?: boolean;
  isFullDemoAdmin?: boolean;
}
