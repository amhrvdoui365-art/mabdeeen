import { Router } from 'express';
import {
  createIpBlock,
  flagAction,
  flagCleanup,
  flags,
  health,
  ipBlocks,
  removeIpBlock,
  rescan,
  revokeSessions,
  saveSettings,
  sessions,
  settings,
  status,
} from '../controllers/system.controller';
import { validate } from '../middlewares/validate.middleware';
import { asyncHandler } from '../utils/async-handler';
import { uuidParamSchema } from '../validators/common.validator';
import {
  createIpBlockSchema,
  ipBlockParamsSchema,
  moderationActionSchema,
  moderationQuerySchema,
  sessionsQuerySchema,
  systemSettingsSchema,
} from '../validators/system.validator';

export const systemRouter = Router();

systemRouter.get('/status', asyncHandler(status));

export const adminSystemRouter = Router();

adminSystemRouter.get('/health', asyncHandler(health));
adminSystemRouter.get('/settings', asyncHandler(settings));
adminSystemRouter.patch(
  '/settings',
  validate({ body: systemSettingsSchema }),
  asyncHandler(saveSettings),
);

adminSystemRouter.get(
  '/sessions',
  validate({ query: sessionsQuerySchema }),
  asyncHandler(sessions),
);

adminSystemRouter.post(
  '/sessions/:id/revoke',
  validate({ params: uuidParamSchema }),
  asyncHandler(revokeSessions),
);

adminSystemRouter.get('/ip-blocks', asyncHandler(ipBlocks));

adminSystemRouter.post(
  '/ip-blocks',
  validate({ body: createIpBlockSchema }),
  asyncHandler(createIpBlock),
);

adminSystemRouter.delete(
  '/ip-blocks/:ip',
  validate({ params: ipBlockParamsSchema }),
  asyncHandler(removeIpBlock),
);

adminSystemRouter.get(
  '/moderation',
  validate({ query: moderationQuerySchema }),
  asyncHandler(flags),
);

adminSystemRouter.patch(
  '/moderation/:id',
  validate({ params: uuidParamSchema, body: moderationActionSchema }),
  asyncHandler(flagAction),
);

adminSystemRouter.post(
  '/moderation/:id/cleanup',
  validate({ params: uuidParamSchema }),
  asyncHandler(flagCleanup),
);

adminSystemRouter.post('/moderation/rescan', asyncHandler(rescan));
