import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit } from "@/lib/rate-limit";

function makeRequest(ip: string) {
  return new Request("http://localhost/api/test", {
    headers: { "x-forwarded-for": ip },
  });
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(0);
});

afterEach(() => {
  vi.useRealTimers();
});

describe("checkRateLimit", () => {
  it("窗口内未到 limit 时放行", () => {
    const req = makeRequest("1.1.1.1");
    const options = { limit: 3, windowMs: 60_000 };
    // 每个用例用唯一 action 名避免模块级 buckets 跨用例污染。
    expect(checkRateLimit(req, "rl-under", options).ok).toBe(true);
    expect(checkRateLimit(req, "rl-under", options).ok).toBe(true);
    expect(checkRateLimit(req, "rl-under", options).ok).toBe(true);
  });

  it("到达 limit 后返回 ok:false 且带 retryAfterSeconds", () => {
    const req = makeRequest("2.2.2.2");
    const options = { limit: 2, windowMs: 60_000 };
    expect(checkRateLimit(req, "rl-limit", options).ok).toBe(true);
    expect(checkRateLimit(req, "rl-limit", options).ok).toBe(true);

    const blocked = checkRateLimit(req, "rl-limit", options);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBe(60);
      expect(typeof blocked.message).toBe("string");
    }
  });

  it("retryAfterSeconds 随时间推进递减（向上取整）", () => {
    const req = makeRequest("3.3.3.3");
    const options = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(req, "rl-retry", options).ok).toBe(true);

    vi.advanceTimersByTime(30_000);
    const blocked = checkRateLimit(req, "rl-retry", options);
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) {
      expect(blocked.retryAfterSeconds).toBe(30);
    }
  });

  it("窗口过期后重新放行", () => {
    const req = makeRequest("4.4.4.4");
    const options = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(req, "rl-expire", options).ok).toBe(true);
    expect(checkRateLimit(req, "rl-expire", options).ok).toBe(false);

    vi.advanceTimersByTime(60_001);
    expect(checkRateLimit(req, "rl-expire", options).ok).toBe(true);
  });

  it("不同 IP 互不影响", () => {
    const options = { limit: 1, windowMs: 60_000 };
    expect(checkRateLimit(makeRequest("5.5.5.5"), "rl-ip", options).ok).toBe(true);
    // 同一 action 但不同 IP，应各自计数，不应被上一个 IP 打满。
    expect(checkRateLimit(makeRequest("6.6.6.6"), "rl-ip", options).ok).toBe(true);
    // 第一个 IP 再次请求则被限。
    expect(checkRateLimit(makeRequest("5.5.5.5"), "rl-ip", options).ok).toBe(false);
  });
});
