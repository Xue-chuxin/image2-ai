import { describe, expect, it } from "vitest";

import { createReferralCode } from "@/lib/invite";

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

describe("createReferralCode", () => {
  it("返回长度为 8 的邀请码", () => {
    expect(createReferralCode()).toHaveLength(8);
  });

  it("只使用去混淆字符集（无 0/O/1/I/L）", () => {
    for (let i = 0; i < 200; i += 1) {
      const code = createReferralCode();
      for (const ch of code) {
        expect(ALPHABET).toContain(ch);
      }
    }
  });

  it("多次调用足够随机（不恒等）", () => {
    const codes = new Set<string>();
    for (let i = 0; i < 50; i += 1) {
      codes.add(createReferralCode());
    }
    expect(codes.size).toBeGreaterThan(1);
  });
});
