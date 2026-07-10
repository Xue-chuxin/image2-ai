import { Prisma } from "@prisma/client";

import { prisma } from "./db";
import { AppError } from "./app-error";
import { getCheckinRuntimeConfig, type CheckinRuntimeConfig } from "./settings";

function startOfToday() {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * 连续签到奖励：首日发 baseCredits，之后每多连续一天加 streakBonus，
 * 加成天数封顶 maxStreakBonusDays（即连续第 (maxStreakBonusDays+1) 天起奖励不再增长）。
 */
export function computeCheckInReward(streak: number, config: CheckinRuntimeConfig) {
  const effectiveStreak = Math.max(1, Math.floor(streak));
  const bonusDays = Math.min(effectiveStreak - 1, Math.max(0, config.maxStreakBonusDays));
  return config.baseCredits + bonusDays * config.streakBonus;
}

export type CheckInStatus = {
  enabled: boolean;
  checkedInToday: boolean;
  streak: number;
  nextStreak: number;
  todayCredits: number;
  totalCheckIns: number;
  totalEarned: number;
  maxStreakBonusDays: number;
};

/** 用户签到概览：是否已签、当前连续天数、今日可得/已得积分与累计数据。 */
export async function getCheckInStatus(userId: string): Promise<CheckInStatus> {
  const config = await getCheckinRuntimeConfig();
  const today = startOfToday();
  const yesterday = addDays(today, -1);

  const [todayRow, yesterdayRow, totals] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: { userId_checkInDate: { userId, checkInDate: today } } }),
    prisma.dailyCheckIn.findUnique({ where: { userId_checkInDate: { userId, checkInDate: yesterday } } }),
    prisma.dailyCheckIn.aggregate({ where: { userId }, _count: { _all: true }, _sum: { credits: true } }),
  ]);

  const checkedInToday = Boolean(todayRow);
  // 已签取今日 streak；未签则沿用昨日 streak（今天签到会 +1，断签则从 1 起）。
  const streak = checkedInToday ? todayRow!.streak : yesterdayRow ? yesterdayRow.streak : 0;
  const nextStreak = checkedInToday ? todayRow!.streak : yesterdayRow ? yesterdayRow.streak + 1 : 1;
  const todayCredits = checkedInToday ? todayRow!.credits : computeCheckInReward(nextStreak, config);

  return {
    enabled: config.enabled,
    checkedInToday,
    streak,
    nextStreak,
    todayCredits,
    totalCheckIns: totals._count._all,
    totalEarned: totals._sum.credits ?? 0,
    maxStreakBonusDays: config.maxStreakBonusDays,
  };
}

export type CheckInResult = {
  credits: number;
  streak: number;
};

/**
 * 执行每日签到：事务内依据昨日记录算连续天数，写 DailyCheckIn（unique 幂等）并发放积分。
 * 未开启活动抛 FORBIDDEN；今日重复签到抛 CONFLICT，均不发放积分。
 */
export async function performCheckIn(userId: string): Promise<CheckInResult> {
  const config = await getCheckinRuntimeConfig();
  if (!config.enabled) {
    throw new AppError("FORBIDDEN", "每日签到活动未开启。", 403);
  }

  const today = startOfToday();
  const yesterday = addDays(today, -1);

  return prisma.$transaction(async (tx) => {
    const yesterdayRow = await tx.dailyCheckIn.findUnique({
      where: { userId_checkInDate: { userId, checkInDate: yesterday } },
    });
    const streak = yesterdayRow ? yesterdayRow.streak + 1 : 1;
    const credits = computeCheckInReward(streak, config);

    try {
      await tx.dailyCheckIn.create({
        data: { userId, checkInDate: today, credits, streak },
      });
    } catch (error) {
      // unique(userId, checkInDate) 冲突 → 今天已签到，幂等拒绝，不重复发分。
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new AppError("CONFLICT", "今天已经签到过了，明天再来吧。", 409);
      }
      throw error;
    }

    if (credits > 0) {
      await tx.creditAccount.upsert({
        where: { userId },
        update: { available: { increment: credits } },
        create: { userId, available: credits, frozen: 0 },
      });
      const account = await tx.creditAccount.findUniqueOrThrow({ where: { userId } });
      await tx.creditTransaction.create({
        data: {
          userId,
          type: "GRANT",
          amount: credits,
          balance: account.available,
          memo: "每日签到奖励",
        },
      });
    }

    return { credits, streak };
  });
}
