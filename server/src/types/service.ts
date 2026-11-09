export type ServiceStatus = 'active' | 'inactive';
export type ServiceMediaType = 'image' | 'video' | 'link';
export interface ServiceMedia { url: string; type: ServiceMediaType; }
export interface ServiceSource { title: string; url: string; }

export interface Service {
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

export interface ServiceDraft {
  title: string;
  description: string;
  price: number;
  category: string;
  status?: ServiceStatus;
  media?: ServiceMedia[];
  sources?: ServiceSource[];
}
