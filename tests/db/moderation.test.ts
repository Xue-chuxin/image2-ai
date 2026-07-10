import { afterEach, describe, expect, it, vi } from "vitest";

import { prisma } from "@/lib/db";
import { checkModerationText } from "@/lib/moderation";

import { seedSettings } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

async function countLogs() {
  return prisma.moderationLog.count();
}

// 构造一个 DeepSeek（OpenAI 兼容）/chat/completions 的成功响应，content 为审核模型返回的 JSON 串。
function mockDeepSeekResponse(verdict: { allowed: boolean; category?: string }) {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      choices: [{ message: { content: JSON.stringify(verdict) } }],
    }),
  } as unknown as Response;
}

describe.skipIf(!hasDb)("checkModerationText DB 集成", () => {
  it("moderationEnabled=false：短路放行，不落日志", async () => {
    await seedSettings({ moderationEnabled: "false" });

    const result = await checkModerationText([{ value: "任意内容", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(await countLogs()).toBe(0);
  });

  it("开启 + 命中违禁词：ok:false / method keyword，且写 1 条 ModerationLog", async () => {
    await seedSettings({
      moderationEnabled: "true",
      moderationForbiddenWords: "违禁词",
      moderationSemanticEnabled: "false",
    });

    const result = await checkModerationText(
      [{ value: "这是一段包含违禁词的提示", label: "中文提示词" }],
      { userId: "u-1", email: "a@test.local" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.method).toBe("keyword");
      expect(result.category).toBe("违禁词");
    }

    const logs = await prisma.moderationLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].method).toBe("keyword");
    expect(logs[0].category).toBe("违禁词");
    expect(logs[0].prompt).toBe("这是一段包含违禁词的提示");
    expect(logs[0].userEmail).toBe("a@test.local");
  });

  it("开启 + 关键词放行 + 语义关闭：放行，不落日志", async () => {
    await seedSettings({
      moderationEnabled: "true",
      moderationForbiddenWords: "违禁词",
      moderationSemanticEnabled: "false",
    });

    const result = await checkModerationText([{ value: "完全正常的风景插画提示", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(await countLogs()).toBe(0);
  });
});

// 语义审核分支：mock DeepSeek fetch，用明文 deepseekApiKey 设置行注入 Key（绕开加密链路）。
describe.skipIf(!hasDb)("checkModerationText 语义分支", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // 开启语义审核、关键词放行（无违禁词）、注入可用 DeepSeek Key。
  async function seedSemanticEnabled() {
    await seedSettings({
      moderationEnabled: "true",
      moderationForbiddenWords: "",
      moderationSemanticEnabled: "true",
      deepseekApiKey: "sk-test-key",
    });
  }

  it("语义判定违规（allowed:false）：ok:false / method semantic，写 1 条日志", async () => {
    await seedSemanticEnabled();
    const fetchMock = vi.fn().mockResolvedValue(mockDeepSeekResponse({ allowed: false, category: "色情" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkModerationText(
      [{ value: "一段关键词放行但语义违规的提示", label: "中文提示词" }],
      { userId: "u-2", email: "b@test.local" },
    );

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.method).toBe("semantic");
      expect(result.category).toBe("色情");
    }
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // 调用 DeepSeek 兼容通道，带上注入的 Key。
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(String(fetchMock.mock.calls[0][0])).toMatch(/\/chat\/completions$/);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer sk-test-key");

    const logs = await prisma.moderationLog.findMany();
    expect(logs).toHaveLength(1);
    expect(logs[0].method).toBe("semantic");
    expect(logs[0].category).toBe("色情");
    expect(logs[0].prompt).toBe("一段关键词放行但语义违规的提示");
  });

  it("语义判定通过（allowed:true）：放行，不落日志", async () => {
    await seedSemanticEnabled();
    const fetchMock = vi.fn().mockResolvedValue(mockDeepSeekResponse({ allowed: true, category: "none" }));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkModerationText([{ value: "完全正常的风景插画提示", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await countLogs()).toBe(0);
  });

  it("模型返回非 2xx：fail-open 放行，不落日志", async () => {
    await seedSemanticEnabled();
    const fetchMock = vi.fn().mockResolvedValue({ ok: false, status: 500 } as unknown as Response);
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkModerationText([{ value: "任意提示", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await countLogs()).toBe(0);
  });

  it("fetch 抛错（超时/网络）：fail-open 放行，不落日志", async () => {
    await seedSemanticEnabled();
    const fetchMock = vi.fn().mockRejectedValue(new Error("network down"));
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkModerationText([{ value: "任意提示", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(await countLogs()).toBe(0);
  });

  it("未配置 DeepSeek Key：放行且不发起请求", async () => {
    // 开启语义但不注入 deepseekApiKey → 无法审核，放行且不调用 fetch。
    await seedSettings({
      moderationEnabled: "true",
      moderationForbiddenWords: "",
      moderationSemanticEnabled: "true",
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await checkModerationText([{ value: "任意提示", label: "中文提示词" }]);

    expect(result.ok).toBe(true);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await countLogs()).toBe(0);
  });
});
