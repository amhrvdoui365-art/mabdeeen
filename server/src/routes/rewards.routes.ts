import { Router } from 'express';
import { claimMilestone, listRewards, redeemReward } from '../controllers/rewards.controller';
import { authenticate, authorize } from '../middlewares/auth.middleware';
import { publicActionLimiter } from '../middlewares/rate-limit.middleware';
import { validate } from '../middlewares/validate.middleware';
import { claimMilestoneSchema, redeemRewardSchema } from '../validators/delivery.validator';

export const rewardsRouter = Router();
rewardsRouter.use(authenticate, authorize('Freelancer'));
rewardsRouter.get('/', listRewards);
rewardsRouter.post('/redeem', publicActionLimiter, validate({ body: redeemRewardSchema }), redeemReward);
rewardsRouter.post('/claim', publicActionLimiter, validate({ body: claimMilestoneSchema }), claimMilestone);
