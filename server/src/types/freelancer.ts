export interface Skill {
  id: string;
  name: string;
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

export interface FreelancerDetail {
  freelancer: PublicFreelancer;
  skills: Skill[];
  portfolio: PortfolioItem[];
  reviews: Review[];
  stats: FreelancerStats;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
