import type {
  CreateReportPayload,
  CreateReviewPayload,
  FreelancerCard,
  FreelancerDetail,
  FreelancersResult,
  Review,
  Skill,
} from '@/types';
import { api, unwrap } from './api';

export interface FreelancerQueryParams {
  q?: string;
  skill?: string;
  location?: string;
  governorate?: string;
  budget?: number;
  featured?: boolean;
  available?: boolean;
  verified?: boolean;
  minRating?: number;
  maxResponseHours?: number;
  sort?: 'featured' | 'newest' | 'rating' | 'budget_low' | 'response';
  page?: number;
  limit?: number;
}

export const freelancersApi = {
  list: async (params: FreelancerQueryParams): Promise<FreelancersResult> => {
    const response = await api.get('/freelancers', { params });
    return unwrap<FreelancersResult>(response);
  },

  featured: async (limit = 6): Promise<FreelancerCard[]> => {
    const response = await api.get('/freelancers/featured', { params: { limit } });
    return unwrap<{ items: FreelancerCard[] }>(response).items;
  },

  detail: async (id: string): Promise<FreelancerDetail> => {
    const response = await api.get(`/freelancers/${id}`);
    return unwrap<FreelancerDetail>(response);
  },

  skills: async (): Promise<Skill[]> => {
    const response = await api.get('/skills');
    const data = unwrap<{ skills: Skill[] }>(response);
    return data.skills;
  },

  addReview: async (
    freelancerId: string,
    payload: CreateReviewPayload,
  ): Promise<Review> => {
    const response = await api.post(`/freelancers/${freelancerId}/reviews`, payload);
    const data = unwrap<{ review: Review }>(response);
    return data.review;
  },

  notifyFavorite: async (freelancerId: string): Promise<void> => {
    await api.post(`/freelancers/${freelancerId}/favorite`);
  },

  addReport: async (
    freelancerId: string,
    payload: CreateReportPayload,
  ): Promise<void> => {
    await api.post(`/freelancers/${freelancerId}/reports`, payload);
  },

};
