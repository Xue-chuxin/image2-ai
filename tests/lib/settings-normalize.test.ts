import { describe, expect, it } from "vitest";

import {
  normalizeBoolean,
  normalizeMembershipDiscount,
  normalizeNonNegativeInt,
  normalizeRetentionDays,
  normalizeTimeoutSeconds,
} from "@/lib/settings";

describe("normalizeBoolean", () => {
  it("识别布尔与常见字符串真值", () => {
    expect(normalizeBoolean(true, false)).toBe(true);
    expect(normalizeBoolean("true", false)).toBe(true);
    expect(normalizeBoolean("1", false)).toBe(true);
    expect(normalizeBoolean("ON", false)).toBe(true);
  });

  it("识别常见字符串假值", () => {
    expect(normalizeBoolean("false", true)).toBe(false);
    expect(normalizeBoolean("0", true)).toBe(false);
    expect(normalizeBoolean("off", true)).toBe(false);
  });

  it("无法识别时返回 fallback", () => {
    expect(normalizeBoolean(undefined, true)).toBe(true);
    expect(normalizeBoolean("maybe", false)).toBe(false);
    expect(normalizeBoolean(null, true)).toBe(true);
  });
});

describe("normalizeNonNegativeInt", () => {
  it("负数夹到 0", () => {
    expect(normalizeNonNegativeInt(-5, 10, 100)).toBe(0);
  });

  it("超过 max 截断", () => {
    expect(normalizeNonNegativeInt(500, 10, 100)).toBe(100);
  });

  it("正常值向下取整", () => {
    expect(normalizeNonNegativeInt(42.9, 10, 100)).toBe(42);
  });

  it("非数字返回 fallback", () => {
    expect(normalizeNonNegativeInt("abc", 10, 100)).toBe(10);
    expect(normalizeNonNegativeInt(undefined, 7, 100)).toBe(7);
  });
});

describe("normalizeMembershipDiscount", () => {
  it("夹取到 0-90 区间", () => {
    expect(normalizeMembershipDiscount(-10, 0)).toBe(0);
    expect(normalizeMembershipDiscount(120, 0)).toBe(90);
    expect(normalizeMembershipDiscount(45, 0)).toBe(45);
  });

  it("非数字返回 fallback", () => {
    expect(normalizeMembershipDiscount("x", 20)).toBe(20);
  });
});

describe("normalizeRetentionDays", () => {
  it("夹取到 1-3650 区间", () => {
    expect(normalizeRetentionDays(0, 30)).toBe(1);
    expect(normalizeRetentionDays(99999, 30)).toBe(3650);
    expect(normalizeRetentionDays(45, 30)).toBe(45);
  });

  it("非数字返回 fallback", () => {
    expect(normalizeRetentionDays("x", 30)).toBe(30);
  });
});

describe("normalizeTimeoutSeconds", () => {
  it("夹取到 30-900 区间", () => {
    expect(normalizeTimeoutSeconds(5, 60)).toBe(30);
    expect(normalizeTimeoutSeconds(5000, 60)).toBe(900);
    expect(normalizeTimeoutSeconds(120, 60)).toBe(120);
  });

  it("非数字返回 fallback", () => {
    expect(normalizeTimeoutSeconds("x", 60)).toBe(60);
  });
});
