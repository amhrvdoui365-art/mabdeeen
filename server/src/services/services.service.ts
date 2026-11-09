import { createService, deleteService, findServiceById, listActiveServices, listServicesByFreelancer, updateService } from '../models/services.model';
import type { ServiceDraft } from '../types/service';
import { AppError } from '../utils/app-error';
import { scanText } from '../utils/moderation';
import { emitRealtimeEventToAll } from './realtime.service';
import type { ServiceCreateInput, ServiceUpdateInput } from '../validators/service.validator';

const assertSafeText = (values: Array<string | undefined>): void => {
  if (values.some((value) => value && scanText(value).length > 0)) {
    throw new AppError('لا يُسمح بإضافة أرقام أو بريد أو روابط خارجية إلى الخدمة', 400);
  }
};

export const getServices = (freelancerId?: string) => listActiveServices(freelancerId);
export const getMyServices = (freelancerId: string) => listServicesByFreelancer(freelancerId);

export const addService = (freelancerId: string, input: ServiceCreateInput) => {
  assertSafeText([input.title, input.description, input.category]);
  const service = createService(freelancerId, input as ServiceDraft);
  emitRealtimeEventToAll('services');
  return service;
};

export const editService = (id: string, freelancerId: string, patch: ServiceUpdateInput) => {
  const existing = findServiceById(id);
  if (!existing || existing.freelancerId !== freelancerId) {
    throw new AppError('الخدمة غير موجودة', 404);
  }
  assertSafeText([patch.title, patch.description, patch.category]);
  const service = updateService(id, freelancerId, patch);
  emitRealtimeEventToAll('services');
  return service;
};

export const removeService = (id: string, freelancerId: string): void => {
  const service = findServiceById(id);
  if (!deleteService(id, freelancerId)) throw new AppError('الخدمة غير موجودة', 404);
  emitRealtimeEventToAll('services');
};
