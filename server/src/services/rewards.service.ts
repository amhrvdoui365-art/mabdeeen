import { claimPointsMilestone, getRewardsSnapshot, redeemPointsReward, redeemServiceFeaturedReward } from '../models/delivery.model';
import { getSetting } from '../models/system.model';
import { AppError } from '../utils/app-error';

export const REWARDS = [
  { code: 'premium_badge', title: 'شارة مبدع متميز', description: 'تظهر في لوحة مكافآتك لمدة 30 يوماً.', cost: 100, durationDays: 30, benefitColumn: 'premium_badge_until' as const },
  { code: 'featured_week', title: 'تمييز خدمة لمدة أسبوع', description: 'اختر خدمة نشطة لتظهر بتمييز خاص لمدة 7 أيام.', cost: 200, durationDays: 7, benefitColumn: 'featured_until' as const },
  { code: 'verified_week', title: 'شارة موثوق لمدة أسبوع', description: 'شارة مكافأة مؤقتة منفصلة عن توثيق الهوية الإداري.', cost: 250, durationDays: 7, benefitColumn: 'verified_until' as const },
] as const;

const configuredRewards = () => REWARDS.map((reward) => ({
  ...reward,
  cost: Number(getSetting(`reward_cost_${reward.code}`) ?? reward.cost),
}));

export const getRewardsForUser = (userId: string) => ({
  ...getRewardsSnapshot(userId),
  sellerDeliveryPoints: Number(getSetting('accepted_delivery_points') ?? 50),
  rewards: configuredRewards().map(({ code, title, description, cost, durationDays }) => ({
    code, title, description, cost, durationDays,
  })),
});

export const redeemRewardForUser = (userId: string, code: string, serviceId?: string) => {
  const reward = configuredRewards().find((item) => item.code === code);
  if (!reward) throw new AppError('المكافأة المطلوبة غير متاحة.', 404);
  if (reward.code === 'featured_week') {
    if (!serviceId) throw new AppError('اختر الخدمة التي تريد إبرازها لمدة 7 أيام.', 422);
    const featured = redeemServiceFeaturedReward(userId, serviceId, { cost: reward.cost, durationDays: 7, label: reward.title });
    if (!featured) throw new AppError('الخدمة غير نشطة أو رصيد النقاط غير كافٍ.', 409);
    return { ...featured, rewardCode: reward.code };
  }
  const result = redeemPointsReward(userId, {
    code: reward.code,
    cost: reward.cost,
    durationDays: reward.durationDays,
    label: reward.title,
    benefitColumn: reward.benefitColumn,
  });
  if (!result) throw new AppError('رصيد النقاط غير كافٍ لاستبدال هذه المكافأة.', 409);
  return { ...result, rewardCode: reward.code };
};

const MILESTONE_REWARDS = [
  { milestone: 100, code: 'premium_badge', durationDays: 7, benefitColumn: 'premium_badge_until' as const },
  { milestone: 200, code: 'featured_week', durationDays: 7, benefitColumn: 'featured_until' as const },
  { milestone: 250, code: 'verified_week', durationDays: 7, benefitColumn: 'verified_until' as const },
  { milestone: 500, code: 'premium_badge', durationDays: 30, benefitColumn: 'premium_badge_until' as const },
  { milestone: 1000, code: 'featured_week', durationDays: 30, benefitColumn: 'featured_until' as const },
  { milestone: 2500, code: 'verified_week', durationDays: 30, benefitColumn: 'verified_until' as const },
] as const;

export const claimMilestoneReward = (userId: string, milestone: number) => {
  const reward = MILESTONE_REWARDS.find((item) => item.milestone === milestone);
  if (!reward) throw new AppError('مكافأة الإنجاز غير متاحة.', 404);
  const result = claimPointsMilestone(userId, milestone, reward);
  if (!result) throw new AppError('لا يمكن استلام هذه المكافأة أو سبق استلامها.', 409);
  return { milestone, ...result };
};
