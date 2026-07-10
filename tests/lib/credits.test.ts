import { describe, expect, it } from "vitest";

import {
  estimateGenerationCreditCost,
  getCreditTransactionLabel,
  summarizeCreditTransactions,
} from "@/lib/credits";

describe("estimateGenerationCreditCost", () => {
  it("按 high 档位单价 35 计算", () => {
    expect(estimateGenerationCreditCost("high", 1)).toBe(35);
    expect(estimateGenerationCreditCost("high", 3)).toBe(105);
  });

  it("按 low 档位单价 3 计算", () => {
    expect(estimateGenerationCreditCost("low", 1)).toBe(3);
    expect(estimateGenerationCreditCost("low", 4)).toBe(12);
  });

  it("按 medium 档位（默认）单价 10 计算", () => {
    expect(estimateGenerationCreditCost("medium", 1)).toBe(10);
    expect(estimateGenerationCreditCost("medium", 2)).toBe(20);
  });

  it("未知 quality 走默认单价 10（兜底）", () => {
    expect(estimateGenerationCreditCost("unknown", 1)).toBe(10);
    expect(estimateGenerationCreditCost("", 5)).toBe(50);
  });

  it("imageCount=0 返回 0", () => {
    expect(estimateGenerationCreditCost("high", 0)).toBe(0);
  });
});

describe("getCreditTransactionLabel", () => {
  it("已知类型返回中文名", () => {
    expect(getCreditTransactionLabel("PURCHASE")).toBe("充值");
    expect(getCreditTransactionLabel("SPEND")).toBe("消费");
    expect(getCreditTransactionLabel("FREEZE")).toBe("冻结");
  });

  it("未知类型原样返回", () => {
    expect(getCreditTransactionLabel("UNKNOWN")).toBe("UNKNOWN");
  });
});

describe("summarizeCreditTransactions", () => {
  it("入账取正数之和、出账取负数绝对值之和", () => {
    const summary = summarizeCreditTransactions([
      { type: "PURCHASE", amount: 100 },
      { type: "GRANT", amount: 20 },
      { type: "SPEND", amount: -35 },
      { type: "REFUND", amount: 10 },
    ]);
    expect(summary).toEqual({ totalIn: 130, totalOut: 35, count: 4 });
  });

  it("FREEZE 不计入收支合计但计入总条数", () => {
    const summary = summarizeCreditTransactions([
      { type: "FREEZE", amount: -35 },
      { type: "SPEND", amount: -35 },
    ]);
    expect(summary).toEqual({ totalIn: 0, totalOut: 35, count: 2 });
  });

  it("负向 ADJUSTMENT 计入出账、空数组返回全 0", () => {
    expect(summarizeCreditTransactions([{ type: "ADJUSTMENT", amount: -5 }])).toEqual({
      totalIn: 0,
      totalOut: 5,
      count: 1,
    });
    expect(summarizeCreditTransactions([])).toEqual({ totalIn: 0, totalOut: 0, count: 0 });
  });
});
