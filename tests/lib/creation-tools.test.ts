import { describe, expect, it } from "vitest";

import { CREATION_TOOLS, buildToolGenerateHref, type CreationTool } from "@/lib/creation-tools";

function findTool(slug: string): CreationTool {
  const tool = CREATION_TOOLS.find((item) => item.slug === slug);
  if (!tool) {
    throw new Error(`missing tool: ${slug}`);
  }
  return tool;
}

describe("CREATION_TOOLS 数据完整性", () => {
  it("slug 唯一", () => {
    const slugs = CREATION_TOOLS.map((tool) => tool.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
  });

  it("可用工具要么带提示词、要么以参考图为主", () => {
    for (const tool of CREATION_TOOLS.filter((item) => item.available)) {
      expect(Boolean(tool.promptTemplate) || Boolean(tool.needsReference)).toBe(true);
    }
  });

  it("不可用工具必须给出原因", () => {
    for (const tool of CREATION_TOOLS.filter((item) => !item.available)) {
      expect(tool.unavailableReason).toBeTruthy();
    }
  });
});

describe("buildToolGenerateHref", () => {
  it("带提示词工具生成含 prompt 与合法 ratio 的链接", () => {
    const href = buildToolGenerateHref(findTool("ecommerce-main"));
    const url = new URL(href, "https://x.test");
    expect(url.pathname).toBe("/generate");
    expect(url.searchParams.get("prompt")).toContain("电商产品主图");
    expect(url.searchParams.get("ratio")).toBe("1:1");
  });

  it("以参考图为主的工具直接进创作页，不带 prompt", () => {
    const href = buildToolGenerateHref(findTool("image-replicate"));
    expect(href).toBe("/generate");
  });

  it("不可用工具返回空字符串", () => {
    expect(buildToolGenerateHref(findTool("cutout"))).toBe("");
  });

  it("非法比例被丢弃", () => {
    const href = buildToolGenerateHref({
      slug: "x",
      name: "x",
      tagline: "x",
      description: "x",
      category: "电商设计",
      gradient: "",
      accent: "",
      available: true,
      promptTemplate: "测试",
      ratio: "21:9",
    });
    const url = new URL(href, "https://x.test");
    expect(url.searchParams.has("ratio")).toBe(false);
    expect(url.searchParams.get("prompt")).toBe("测试");
  });
});
