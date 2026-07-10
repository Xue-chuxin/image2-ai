import { describe, expect, it } from "vitest";

import { getCheckInStatus, performCheckIn } from "@/lib/checkin";
import { prisma } from "@/lib/db";

import { createUserWithAccount, getAccount, listTransactions, seedSettings } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

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

/** 直接插入一条历史签到记录（用于构造昨日/前日连续状态）。 */
async function seedCheckIn(userId: string, date: Date, streak: number, credits: number) {
  return prisma.dailyCheckIn.create({
    data: { userId, checkInDate: date, streak, credits },
  });
}

/** 开启签到活动，配置基础/递增/封顶。 */
async function enableCheckin(overrides?: Partial<Record<string, string>>) {
  await seedSettings({
    checkinEnabled: "true",
    checkinBaseCredits: "5",
    checkinStreakBonus: "1",
    checkinMaxStreakBonusDays: "6",
    ...overrides,
  });
}

describe.skipIf(!hasDb)("checkin DB 集成", () => {
  describe("performCheckIn", () => {
    it("首次签到：streak=1，发放基础积分并写 GRANT 流水", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });

      const result = await performCheckIn(user.id);

      expect(result.streak).toBe(1);
      expect(result.credits).toBe(5);

      const account = await getAccount(user.id);
      expect(account?.available).toBe(5);

      const txs = await listTransactions(user.id);
      expect(txs).toHaveLength(1);
      expect(txs[0].type).toBe("GRANT");
      expect(txs[0].amount).toBe(5);
      expect(txs[0].balance).toBe(5);
      expect(txs[0].memo).toBe("每日签到奖励");
    });

    it("连续签到：昨日 streak=3 → 今日 streak=4，奖励递增", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });
      await seedCheckIn(user.id, addDays(startOfToday(), -1), 3, 7);

      const result = await performCheckIn(user.id);

      expect(result.streak).toBe(4);
      // base 5 + (4-1)*1 = 8
      expect(result.credits).toBe(8);

      const account = await getAccount(user.id);
      expect(account?.available).toBe(8);
    });

    it("同日重复签到：抛 CONFLICT(409)，不重复发放积分", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });

      await performCheckIn(user.id);

      await expect(performCheckIn(user.id)).rejects.toMatchObject({
        code: "CONFLICT",
        status: 409,
      });

      const account = await getAccount(user.id);
      expect(account?.available).toBe(5);
      const txs = await listTransactions(user.id);
      expect(txs).toHaveLength(1);
    });

    it("断签重置：仅前日有记录（昨日缺）→ 今日 streak 从 1 起", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });
      // 前天签到过，昨天断签
      await seedCheckIn(user.id, addDays(startOfToday(), -2), 5, 9);

      const result = await performCheckIn(user.id);

      expect(result.streak).toBe(1);
      expect(result.credits).toBe(5);
    });

    it("加成封顶：昨日 streak=10（超封顶）→ 奖励维持封顶值", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });
      await seedCheckIn(user.id, addDays(startOfToday(), -1), 10, 11);

      const result = await performCheckIn(user.id);

      expect(result.streak).toBe(11);
      // maxStreakBonusDays=6 → base 5 + 6*1 = 11 封顶
      expect(result.credits).toBe(11);
    });

    it("活动未开启：抛 FORBIDDEN(403)，不发放积分", async () => {
      await seedSettings({ checkinEnabled: "false" });
      const { user } = await createUserWithAccount({ available: 0 });

      await expect(performCheckIn(user.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        status: 403,
      });

      const account = await getAccount(user.id);
      expect(account?.available).toBe(0);
      const txs = await listTransactions(user.id);
      expect(txs).toHaveLength(0);
    });
  });

  describe("getCheckInStatus", () => {
    it("未签到：checkedInToday=false，nextStreak 与今日可得积分正确", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });
      await seedCheckIn(user.id, addDays(startOfToday(), -1), 2, 6);

      const status = await getCheckInStatus(user.id);

      expect(status.enabled).toBe(true);
      expect(status.checkedInToday).toBe(false);
      expect(status.streak).toBe(2);
      expect(status.nextStreak).toBe(3);
      // 今日签到将得 base 5 + (3-1)*1 = 7
      expect(status.todayCredits).toBe(7);
      expect(status.maxStreakBonusDays).toBe(6);
    });

    it("已签到：checkedInToday=true，累计数据正确", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });
      await performCheckIn(user.id);

      const status = await getCheckInStatus(user.id);

      expect(status.checkedInToday).toBe(true);
      expect(status.streak).toBe(1);
      expect(status.todayCredits).toBe(5);
      expect(status.totalCheckIns).toBe(1);
      expect(status.totalEarned).toBe(5);
    });

    it("零签到记录：streak=0，nextStreak=1，累计为 0", async () => {
      await enableCheckin();
      const { user } = await createUserWithAccount({ available: 0 });

      const status = await getCheckInStatus(user.id);

      expect(status.checkedInToday).toBe(false);
      expect(status.streak).toBe(0);
      expect(status.nextStreak).toBe(1);
      expect(status.totalCheckIns).toBe(0);
      expect(status.totalEarned).toBe(0);
    });
  });
});
