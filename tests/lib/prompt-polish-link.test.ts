import { describe, expect, it } from "vitest";

import { buildPolishGenerateHref } from "@/lib/prompt-polish-link";

describe("buildPolishGenerateHref", () => {
  it("带上全部非空字段，并对内容做 URL 编码", () => {
    const href = buildPolishGenerateHref({
      promptZh: "城市天台的少女",
      promptEn: "a girl on a rooftop",
      negativePrompt: "多余手指",
      recommendedRatio: "9:16",
    });
    const url = new URL(href, "https://x.test");
    expect(url.pathname).toBe("/generate");
    expect(url.searchParams.get("prompt")).toBe("城市天台的少女");
    expect(url.searchParams.get("promptEn")).toBe("a girl on a rooftop");
    expect(url.searchParams.get("negativePrompt")).toBe("多余手指");
    expect(url.searchParams.get("ratio")).toBe("9:16");
  });

  it("非法比例被丢弃，其余字段仍保留", () => {
    const href = buildPolishGenerateHref({ promptZh: "湖边小屋", recommendedRatio: "21:9" });
    const url = new URL(href, "https://x.test");
    expect(url.searchParams.get("prompt")).toBe("湖边小屋");
    expect(url.searchParams.has("ratio")).toBe(false);
  });

  it("空白字段被裁剪跳过", () => {
    const href = buildPolishGenerateHref({ promptZh: "  ", promptEn: "hello", negativePrompt: "   " });
    const url = new URL(href, "https://x.test");
    expect(url.searchParams.has("prompt")).toBe(false);
    expect(url.searchParams.get("promptEn")).toBe("hello");
    expect(url.searchParams.has("negativePrompt")).toBe(false);
  });

  it("全部为空时退化为纯 /generate", () => {
    expect(buildPolishGenerateHref({})).toBe("/generate");
  });
});
