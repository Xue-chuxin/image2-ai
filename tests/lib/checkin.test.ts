import { describe, expect, it } from "vitest";

import { computeCheckInReward } from "@/lib/checkin";
import type { CheckinRuntimeConfig } from "@/lib/settings";

const config: CheckinRuntimeConfig = {
  enabled: true,
  baseCredits: 5,
  streakBonus: 1,
  maxStreakBonusDays: 6,
};

describe("computeCheckInReward", () => {
  it("连续第 1 天发放基础积分", () => {
    expect(computeCheckInReward(1, config)).toBe(5);
  });

  it("连续天数越多奖励越高（每天 +streakBonus）", () => {
    expect(computeCheckInReward(2, config)).toBe(6);
    expect(computeCheckInReward(3, config)).toBe(7);
    expect(computeCheckInReward(7, config)).toBe(11);
  });

  it("加成天数封顶后奖励不再增长", () => {
    // maxStreakBonusDays=6 → 第 7 天封顶（base + 6*bonus = 11）
    expect(computeCheckInReward(7, config)).toBe(11);
    expect(computeCheckInReward(8, config)).toBe(11);
    expect(computeCheckInReward(100, config)).toBe(11);
  });

  it("streak<=0 视为第 1 天（兜底）", () => {
    expect(computeCheckInReward(0, config)).toBe(5);
    expect(computeCheckInReward(-3, config)).toBe(5);
  });

  it("streakBonus=0 时每天固定发放基础积分", () => {
    const flat: CheckinRuntimeConfig = { ...config, streakBonus: 0 };
    expect(computeCheckInReward(1, flat)).toBe(5);
    expect(computeCheckInReward(10, flat)).toBe(5);
  });

  it("maxStreakBonusDays=0 时始终只发基础积分", () => {
    const noBonus: CheckinRuntimeConfig = { ...config, maxStreakBonusDays: 0 };
    expect(computeCheckInReward(1, noBonus)).toBe(5);
    expect(computeCheckInReward(5, noBonus)).toBe(5);
  });
});
