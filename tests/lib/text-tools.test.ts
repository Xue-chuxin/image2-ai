import { describe, expect, it } from "vitest";

import {
  TEXT_TOOLS,
  createLocalTextResult,
  getTextTool,
  normalizeTextToolOption,
  parseTextToolItems,
  sanitizeTextToolInput,
  toTextToolClientView,
} from "@/lib/text-tools";

describe("TEXT_TOOLS 数据完整性", () => {
  it("slug 唯一", () => {
    const slugs = TEXT_TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("每个工具都有系统提示词、输入标签与合理上限", () => {
    for (const tool of TEXT_TOOLS) {
      expect(tool.systemPrompt.trim()).toBeTruthy();
      expect(tool.inputLabel.trim()).toBeTruthy();
      expect(tool.maxInput).toBeGreaterThan(0);
    }
  });

  it("带 option 的工具至少有两个选项", () => {
    for (const tool of TEXT_TOOLS) {
      if (!tool.option) continue;
      expect(tool.option.choices.length).toBeGreaterThanOrEqual(2);
    }
  });
});

describe("toTextToolClientView", () => {
  it("剔除 systemPrompt 等服务端字段", () => {
    const view = toTextToolClientView(TEXT_TOOLS[0]);
    expect("systemPrompt" in view).toBe(false);
    expect(view.slug).toBe(TEXT_TOOLS[0].slug);
  });
});

describe("getTextTool", () => {
  it("命中返回工具，未命中返回 null", () => {
    expect(getTextTool("xhs-copy")?.slug).toBe("xhs-copy");
    expect(getTextTool("nope")).toBeNull();
  });
});

describe("sanitizeTextToolInput", () => {
  it("非字符串返回空串", () => {
    expect(sanitizeTextToolInput(123, 100)).toBe("");
    expect(sanitizeTextToolInput(null, 100)).toBe("");
  });

  it("trim 并按上限截断", () => {
    expect(sanitizeTextToolInput("  hi  ", 100)).toBe("hi");
    expect(sanitizeTextToolInput("abcdef", 3)).toBe("abc");
  });
});

describe("normalizeTextToolOption", () => {
  const xhs = getTextTool("xhs-copy")!;

  it("合法值原样返回", () => {
    expect(normalizeTextToolOption(xhs, "测评")).toBe("测评");
  });

  it("非法/缺省值回落到首个选项", () => {
    expect(normalizeTextToolOption(xhs, "不存在")).toBe(xhs.option!.choices[0].value);
    expect(normalizeTextToolOption(xhs, undefined)).toBe(xhs.option!.choices[0].value);
  });
});

describe("parseTextToolItems", () => {
  it("解析标准 JSON 的 items", () => {
    const items = parseTextToolItems('{"items":[{"title":"A","content":"正文一"},{"content":"正文二"}]}');
    expect(items).toEqual([{ title: "A", content: "正文一" }, { content: "正文二" }]);
  });

  it("容忍代码块围栏与首尾杂质", () => {
    const items = parseTextToolItems('```json\n{"items":[{"content":"  多  空格  "}]}\n```');
    expect(items).toEqual([{ content: "多 空格" }]);
  });

  it("兼容 text 字段并跳过空内容", () => {
    const items = parseTextToolItems('{"items":[{"text":"来自text"},{"content":""},{"content":"  "}]}');
    expect(items).toEqual([{ content: "来自text" }]);
  });

  it("非 JSON 抛错", () => {
    expect(() => parseTextToolItems("这不是JSON")).toThrow();
  });

  it("items 全为空时抛错", () => {
    expect(() => parseTextToolItems('{"items":[{"content":""}]}')).toThrow();
  });
});

describe("createLocalTextResult 兜底", () => {
  it("每个工具都能产出至少一条非空结果", () => {
    for (const tool of TEXT_TOOLS) {
      const option = tool.option?.choices[0]?.value ?? "";
      const items = createLocalTextResult(tool, "测试主题", option);
      expect(items.length).toBeGreaterThan(0);
      expect(items[0].content.trim()).toBeTruthy();
    }
  });
});
