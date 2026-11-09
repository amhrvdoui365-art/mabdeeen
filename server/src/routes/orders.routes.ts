import { Router } from 'express';
import { actOnOrder, listMyOrders, postOrderMessage, requestOrder, reviewOrder, showOrder } from '../controllers/orders.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { orderActionBody, orderIdParams, orderMessageBody, orderReviewBody, createOrderBody } from '../validators/orders.validator';

export const ordersRouter = Router();
ordersRouter.use(authenticate, authorize('Freelancer', 'Buyer'));
ordersRouter.get('/', listMyOrders);
ordersRouter.post('/', publicActionLimiter, validate({ body: createOrderBody }), requestOrder);
ordersRouter.get('/:id', validate({ params: orderIdParams }), showOrder);
ordersRouter.post('/:id/actions', publicActionLimiter, validate({ params: orderIdParams, body: orderActionBody }), actOnOrder);
ordersRouter.post('/:id/messages', publicActionLimiter, validate({ params: orderIdParams, body: orderMessageBody }), postOrderMessage);
ordersRouter.post('/:id/review', publicActionLimiter, validate({ params: orderIdParams, body: orderReviewBody }), reviewOrder);
