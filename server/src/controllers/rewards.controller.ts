import type { Request, Response } from 'express';
import { claimMilestoneReward, getRewardsForUser, redeemRewardForUser } from '../services/rewards.service';
import type { claimMilestoneSchema, redeemRewardSchema } from '../validators/delivery.validator';
import type { z } from 'zod';

export const listRewards = (req: Request, res: Response): void => {
  res.status(200).json({ success: true, data: getRewardsForUser(req.user!.id) });
};

export const redeemReward = (req: Request, res: Response): void => {
  const { rewardCode, serviceId } = req.body as z.infer<typeof redeemRewardSchema>;
  const result = redeemRewardForUser(req.user!.id, rewardCode, serviceId);
  res.status(200).json({ success: true, message: 'تم استبدال النقاط بنجاح.', data: result });
};

export const claimMilestone = (req: Request, res: Response): void => {
  const { milestone } = req.body as z.infer<typeof claimMilestoneSchema>;
  res.status(200).json({ success: true, data: claimMilestoneReward(req.user!.id, milestone) });
};
