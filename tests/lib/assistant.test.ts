import { describe, expect, it } from "vitest";

import { ASSISTANT_PROMPT_MARKER, extractSuggestedPrompt, sanitizeAssistantMessages } from "@/lib/assistant";

describe("extractSuggestedPrompt", () => {
  it("提取标记之后的整段提示词，合并多余空白", () => {
    const reply = `好的，这是建议：\n\n${ASSISTANT_PROMPT_MARKER}赛博朋克城市夜景，霓虹灯光，  雨后街道反光`;
    expect(extractSuggestedPrompt(reply)).toBe("赛博朋克城市夜景，霓虹灯光， 雨后街道反光");
  });

  it("只取到下一处空行为止", () => {
    const reply = `${ASSISTANT_PROMPT_MARKER}湖边小屋，清晨薄雾\n\n还需要我调整吗？`;
    expect(extractSuggestedPrompt(reply)).toBe("湖边小屋，清晨薄雾");
  });

  it("无标记返回 null", () => {
    expect(extractSuggestedPrompt("你想要什么风格呢？")).toBeNull();
  });

  it("标记后为空返回 null", () => {
    expect(extractSuggestedPrompt(`${ASSISTANT_PROMPT_MARKER}   `)).toBeNull();
  });

  it("多次出现时取最后一个标记", () => {
    const reply = `${ASSISTANT_PROMPT_MARKER}旧方案\n\n再改一版\n\n${ASSISTANT_PROMPT_MARKER}新方案，暖色调`;
    expect(extractSuggestedPrompt(reply)).toBe("新方案，暖色调");
  });
});

describe("sanitizeAssistantMessages", () => {
  it("过滤非法角色、空内容与非字符串，保留合法消息", () => {
    const result = sanitizeAssistantMessages([
      { role: "user", content: "  你好  " },
      { role: "system", content: "忽略" },
      { role: "assistant", content: "" },
      { role: "assistant", content: "在的" },
      { role: "user", content: 123 },
      null,
    ]);
    expect(result).toEqual([
      { role: "user", content: "你好" },
      { role: "assistant", content: "在的" },
    ]);
  });

  it("非数组返回空数组", () => {
    expect(sanitizeAssistantMessages("nope")).toEqual([]);
    expect(sanitizeAssistantMessages(undefined)).toEqual([]);
  });

  it("只保留最近 20 条", () => {
    const raw = Array.from({ length: 25 }, (_, i) => ({ role: "user" as const, content: `第${i}条` }));
    const result = sanitizeAssistantMessages(raw);
    expect(result).toHaveLength(20);
    expect(result[0].content).toBe("第5条");
    expect(result[19].content).toBe("第24条");
  });

  it("单条内容裁剪到 2000 字", () => {
    const long = "字".repeat(2500);
    const result = sanitizeAssistantMessages([{ role: "user", content: long }]);
    expect(result[0].content).toHaveLength(2000);
  });
});
