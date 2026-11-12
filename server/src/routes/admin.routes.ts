import { Router } from 'express';
import {
  changeReportStatus,
  changeUserFeatured,
  changeUserStatus,
  changeUserDemoAccount,
  changeUserVerified,
  deleteReviewHandler,
  editUser,
  listReports,
  listConversations,
  listConversationMessages,
  listAuditLogs,
  listReviews,
  listUsers,
  removeUser,
  setPassword,
  stats,
} from '../controllers/admin.controller';
import {
  adminNotifications,
  createSiteNotification,
  updateSiteNotification,
} from '../controllers/notification.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { validate } from '../middlewares/validate.middleware';
import { adminSystemRouter } from './system.routes';
import { asyncHandler } from '../utils/async-handler';
import {
  adminReportsQuerySchema,
  adminConversationsQuerySchema,
  adminConversationMessagesParamsSchema,
  adminConversationMessagesQuerySchema,
  adminReviewsQuerySchema,
  adminUsersQuerySchema,
  manageUserSchema,
  updateReportSchema,
  updateUserFeaturedSchema,
  updateUserStatusSchema,
  updateUserDemoAccountSchema,
  updateUserVerifiedSchema,
  adminSetPasswordSchema,
} from '../validators/admin.validator';
import { adminPaginationSchema, uuidParamSchema } from '../validators/common.validator';
import { createNotificationSchema, updateNotificationSchema } from '../validators/notification.validator';
import { supportTicketParamsSchema, supportTicketStatusSchema } from '../validators/support.validator';
import { authLimiter } from '../middlewares/rate-limit.middleware';
import { adminTicketStatus, adminTickets } from '../controllers/support.controller';
import {
  adminArticles, adminDeleteArticle, adminExport, adminOrderCase, adminOrderCaseResolve,
  adminOrderStatus, adminOrders, adminPointAdjustment, adminPoints, adminRewards, adminSaveArticle,
  adminSaveRewards, adminServiceStatus, adminServices,
  adminImpersonate, adminConversationAttachment, adminOrderDeliveryFile, adminWipePlatform,
} from '../controllers/admin-operations.controller';
import {
  adminArticleSchema, adminExportEntitySchema, adminOrderCaseResolutionSchema, adminOrderCaseSchema,
  adminOrdersQuerySchema, adminOrderStatusSchema, adminPointsAdjustmentSchema, adminPointsQuerySchema,
  adminRewardSettingsSchema, adminServicesQuerySchema, adminServiceStatusSchema,
  adminWipePlatformSchema,
} from '../validators/admin-operations.validator';

export const adminRouter = Router();

adminRouter.use(authenticate, authorize('Admin'));

adminRouter.use('/system', adminSystemRouter);

adminRouter.get('/notifications', asyncHandler(adminNotifications));
adminRouter.post('/notifications', validate({ body: createNotificationSchema }), asyncHandler(createSiteNotification));
adminRouter.patch(
  '/notifications/:id',
  validate({ params: uuidParamSchema, body: updateNotificationSchema }),
  asyncHandler(updateSiteNotification),
);

adminRouter.get('/stats', asyncHandler(stats));

adminRouter.get('/orders', validate({ query: adminOrdersQuerySchema }), asyncHandler(adminOrders));
adminRouter.get('/orders/deliveries/:id/file', validate({ params: uuidParamSchema }), asyncHandler(adminOrderDeliveryFile));
adminRouter.patch('/orders/:id/status', validate({ params: uuidParamSchema, body: adminOrderStatusSchema }), asyncHandler(adminOrderStatus));
adminRouter.post('/orders/:id/cases', validate({ params: uuidParamSchema, body: adminOrderCaseSchema }), asyncHandler(adminOrderCase));
adminRouter.patch('/order-cases/:id', validate({ params: uuidParamSchema, body: adminOrderCaseResolutionSchema }), asyncHandler(adminOrderCaseResolve));
adminRouter.get('/services', validate({ query: adminServicesQuerySchema }), asyncHandler(adminServices));
adminRouter.patch('/services/:id/status', validate({ params: uuidParamSchema, body: adminServiceStatusSchema }), asyncHandler(adminServiceStatus));
adminRouter.get('/points', validate({ query: adminPointsQuerySchema }), asyncHandler(adminPoints));
adminRouter.post('/points/:id/adjust', validate({ params: uuidParamSchema, body: adminPointsAdjustmentSchema }), asyncHandler(adminPointAdjustment));
adminRouter.get('/rewards/settings', asyncHandler(adminRewards));
adminRouter.patch('/rewards/settings', validate({ body: adminRewardSettingsSchema }), asyncHandler(adminSaveRewards));
adminRouter.get('/articles/manage', asyncHandler(adminArticles));
adminRouter.post('/articles/manage', validate({ body: adminArticleSchema }), asyncHandler(adminSaveArticle));
adminRouter.patch('/articles/manage/:id', validate({ params: uuidParamSchema, body: adminArticleSchema }), asyncHandler(adminSaveArticle));
adminRouter.delete('/articles/manage/:id', validate({ params: uuidParamSchema }), asyncHandler(adminDeleteArticle));
adminRouter.get('/export/:entity', validate({ params: adminExportEntitySchema }), asyncHandler(adminExport));
adminRouter.post('/users/:id/impersonate', validate({ params: uuidParamSchema }), asyncHandler(adminImpersonate));
adminRouter.post('/platform/wipe', authLimiter, validate({ body: adminWipePlatformSchema }), asyncHandler(adminWipePlatform));
adminRouter.get('/messages/:id/attachment', validate({ params: uuidParamSchema }), asyncHandler(adminConversationAttachment));

adminRouter.get('/support/tickets', asyncHandler(adminTickets));
adminRouter.patch('/support/tickets/:id/status', validate({ params: supportTicketParamsSchema, body: supportTicketStatusSchema }), asyncHandler(adminTicketStatus));

adminRouter.get(
  '/conversations',
  validate({ query: adminConversationsQuerySchema }),
  asyncHandler(listConversations),
);
adminRouter.get(
  '/conversations/:participantAId/:participantBId/messages',
  validate({ params: adminConversationMessagesParamsSchema, query: adminConversationMessagesQuerySchema }),
  asyncHandler(listConversationMessages),
);
adminRouter.get(
  '/audit-logs',
  validate({ query: adminPaginationSchema }),
  asyncHandler(listAuditLogs),
);

adminRouter.get(
  '/users',
  validate({ query: adminUsersQuerySchema }),
  asyncHandler(listUsers),
);

adminRouter.patch(
  '/users/:id/demo',
  validate({ params: uuidParamSchema, body: updateUserDemoAccountSchema }),
  asyncHandler(changeUserDemoAccount),
);

adminRouter.patch(
  '/users/:id/status',
  validate({ params: uuidParamSchema, body: updateUserStatusSchema }),
  asyncHandler(changeUserStatus),
);

adminRouter.patch(
  '/users/:id/featured',
  validate({ params: uuidParamSchema, body: updateUserFeaturedSchema }),
  asyncHandler(changeUserFeatured),
);

adminRouter.patch(
  '/users/:id/verified',
  validate({ params: uuidParamSchema, body: updateUserVerifiedSchema }),
  asyncHandler(changeUserVerified),
);

adminRouter.patch(
  '/users/:id',
  validate({ params: uuidParamSchema, body: manageUserSchema }),
  asyncHandler(editUser),
);

adminRouter.put(
  '/users/:id/password',
  validate({ params: uuidParamSchema, body: adminSetPasswordSchema }),
  asyncHandler(setPassword),
);

adminRouter.delete(
  '/users/:id',
  validate({ params: uuidParamSchema }),
  asyncHandler(removeUser),
);

adminRouter.get(
  '/reports',
  validate({ query: adminReportsQuerySchema }),
  asyncHandler(listReports),
);

adminRouter.patch(
  '/reports/:id',
  validate({ params: uuidParamSchema, body: updateReportSchema }),
  asyncHandler(changeReportStatus),
);

adminRouter.get(
  '/reviews',
  validate({ query: adminReviewsQuerySchema }),
  asyncHandler(listReviews),
);

adminRouter.delete(
  '/reviews/:id',
  validate({ params: uuidParamSchema }),
  asyncHandler(deleteReviewHandler),
);
