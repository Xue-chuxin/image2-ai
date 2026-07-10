import { prisma } from "./db";
import { getMembershipRuntimeConfig, type MembershipRuntimeConfig } from "./settings";

export type MembershipContext = {
  active: boolean;
  config: MembershipRuntimeConfig;
};

/** 读取会员运行配置 + 当前用户会员是否有效 */
export async function getMembershipContext(userId: string): Promise<MembershipContext> {
  const [subscription, config] = await Promise.all([
    prisma.subscription.findUnique({ where: { userId } }),
    getMembershipRuntimeConfig(),
  ]);
  const active = Boolean(subscription && subscription.expiresAt.getTime() > Date.now());
  return { active, config };
}

/** 会员出图积分折扣：按配置的 off 百分比打折，非会员或无折扣时原价返还，且最低 1 积分不免费 */
export function computeMembershipCost(baseCost: number, context: MembershipContext) {
  if (!context.active || context.config.discountPercent <= 0 || baseCost <= 0) {
    return baseCost;
  }
  const discounted = Math.floor((baseCost * (100 - context.config.discountPercent)) / 100);
  return Math.max(discounted, 1);
}

/** 会员每 10 分钟出图上限：会员用配置值，非会员用传入的免费默认值 */
export function resolveMembershipRateLimit(freeLimit: number, context: MembershipContext) {
  if (context.active && context.config.generationRateLimit > 0) {
    return Math.max(context.config.generationRateLimit, freeLimit);
  }
  return freeLimit;
}

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/**
 * 会员每日赠送积分：当天首次触发时发放一次。
 * 借助 updateMany 的条件更新做幂等，避免并发/多次调用重复发放。
 */
export async function grantDailyMembershipCreditsIfDue(userId: string, context: MembershipContext) {
  const dailyCredits = context.config.dailyCredits;
  if (!context.active || dailyCredits <= 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    // 原子占位：仅当会员有效且今天尚未发放时，把 lastDailyGrantAt 推进到现在。
    const claimed = await tx.subscription.updateMany({
      where: {
        userId,
        expiresAt: { gt: new Date() },
        OR: [{ lastDailyGrantAt: null }, { lastDailyGrantAt: { lt: startOfToday() } }],
      },
      data: { lastDailyGrantAt: new Date() },
    });

    if (claimed.count === 0) {
      // 今天已发放或会员已失效，幂等跳过。
      return;
    }

    await tx.creditAccount.upsert({
      where: { userId },
      update: { available: { increment: dailyCredits } },
      create: { userId, available: dailyCredits, frozen: 0 },
    });

    const account = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });

    await tx.creditTransaction.create({
      data: {
        userId,
        type: "GRANT",
        amount: dailyCredits,
        balance: account.available,
        memo: "会员每日赠送积分",
      },
    });
  });
}
