import { Router } from 'express';
import { approveDelivery, createDeliveryLink, deliveryFile, listDeliveryVault, listProjectDeliveryItems, requestRevision, uploadDelivery } from '../controllers/delivery.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { uploadDeliveryFile } from '../middlewares/upload.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uuidParamSchema } from '../validators/common.validator';
import { createDeliveryLinkSchema, createDeliverySchema, deliveryProjectQuerySchema } from '../validators/delivery.validator';

export const deliveriesRouter = Router();
deliveriesRouter.use(authenticate, authorize('Freelancer', 'Buyer'));

deliveriesRouter.get('/', validate({ query: deliveryProjectQuerySchema }), listProjectDeliveryItems);
deliveriesRouter.get('/vault', listDeliveryVault);
deliveriesRouter.get('/:id/file', validate({ params: uuidParamSchema }), deliveryFile);
deliveriesRouter.post('/link', publicActionLimiter, validate({ body: createDeliveryLinkSchema }), createDeliveryLink);
deliveriesRouter.post('/upload', publicActionLimiter, uploadDeliveryFile.single('file'),
  validate({ body: createDeliverySchema }), asyncHandler(uploadDelivery));
deliveriesRouter.post('/:id/approve', publicActionLimiter, validate({ params: uuidParamSchema }), approveDelivery);
deliveriesRouter.post('/:id/request-revision', publicActionLimiter, validate({ params: uuidParamSchema }), requestRevision);
