import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import { checkModerationText } from "@/lib/moderation";

import { seedSettings } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

async function countLogs() {
  return prisma.moderationLog.count();
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
