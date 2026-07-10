import { describe, expect, it } from "vitest";

import { estimateGenerationCreditCost } from "@/lib/credits";

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
