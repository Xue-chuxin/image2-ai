import { describe, expect, it } from "vitest";

import { checkForbiddenWords, parseForbiddenWords, parseSemanticVerdict } from "@/lib/moderation";
import type { ModerationRuntimeConfig } from "@/lib/settings";

function makeConfig(overrides: Partial<ModerationRuntimeConfig> = {}): ModerationRuntimeConfig {
  return {
    enabled: true,
    forbiddenWords: "",
    blockMessage: "内容包含不适合生成的词语。",
    semanticEnabled: false,
    semanticModel: "",
    ...overrides,
  };
}

describe("parseForbiddenWords", () => {
  it("按行拆分、trim、去空", () => {
    expect(parseForbiddenWords("  foo \n\n bar \n")).toEqual(["foo", "bar"]);
  });

  it("大小写不敏感去重（保留首次出现的原始大小写）", () => {
    expect(parseForbiddenWords("Foo\nfoo\nFOO\nbar")).toEqual(["Foo", "bar"]);
  });

  it("空字符串返回空数组", () => {
    expect(parseForbiddenWords("")).toEqual([]);
  });
});

describe("checkForbiddenWords", () => {
  it("命中时返回 ok:false 且带 method/category/field", () => {
    const config = makeConfig({ forbiddenWords: "违禁词" });
    const result = checkForbiddenWords([{ value: "包含违禁词的内容", label: "prompt" }], config);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.method).toBe("keyword");
      expect(result.category).toBe("违禁词");
      expect(result.field).toBe("prompt");
      expect(result.message).toBe(config.blockMessage);
    }
  });

  it("大小写不敏感命中", () => {
    const config = makeConfig({ forbiddenWords: "BadWord" });
    const result = checkForbiddenWords([{ value: "this is a badword here" }], config);
    expect(result.ok).toBe(false);
  });

  it("未命中放行", () => {
    const config = makeConfig({ forbiddenWords: "违禁词" });
    expect(checkForbiddenWords([{ value: "干净的内容" }], config).ok).toBe(true);
  });

  it("空词表放行", () => {
    const config = makeConfig({ forbiddenWords: "" });
    expect(checkForbiddenWords([{ value: "任何内容" }], config).ok).toBe(true);
  });

  it("空/缺失 value 跳过不误伤", () => {
    const config = makeConfig({ forbiddenWords: "违禁词" });
    expect(checkForbiddenWords([{ value: "" }, { value: null }, {}], config).ok).toBe(true);
  });
});

describe("parseSemanticVerdict", () => {
  it("解析纯 JSON allowed:true", () => {
    expect(parseSemanticVerdict('{"allowed": true, "category": "none"}')).toEqual({
      allowed: true,
      category: undefined,
    });
  });

  it("去除 ```json 围栏", () => {
    const content = '```json\n{"allowed": false, "category": "violence"}\n```';
    expect(parseSemanticVerdict(content)).toEqual({ allowed: false, category: "violence" });
  });

  it("截取首尾花括号之间的内容（忽略前后噪声）", () => {
    const content = 'noise {"allowed": false, "category": "porn"} trailing';
    expect(parseSemanticVerdict(content)).toEqual({ allowed: false, category: "porn" });
  });

  it("缺 allowed 字段按通过处理", () => {
    expect(parseSemanticVerdict('{"category": "none"}').allowed).toBe(true);
  });

  it("category 为 none 时归一为 undefined", () => {
    expect(parseSemanticVerdict('{"allowed": true, "category": "none"}').category).toBeUndefined();
  });

  it("非法 JSON 抛错", () => {
    expect(() => parseSemanticVerdict("这不是 JSON")).toThrow();
    expect(() => parseSemanticVerdict("{ 坏的 }")).toThrow();
  });
});
