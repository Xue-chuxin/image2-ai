import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  listPromptCategories,
  listPrompts,
  listUserPromptFavoriteIds,
  togglePromptFavorite,
} from "@/lib/prompts";

import { createPrompt, createPromptCategory, createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("prompts DB 集成", () => {
  describe("listPrompts", () => {
    it("返回卡片视图（含分类名与标签），按权重倒序", async () => {
      const cat = await createPromptCategory({ name: "写实" });
      await createPrompt({ title: "低权重", categoryId: cat.id, weight: 1, tags: ["人像"] });
      await createPrompt({ title: "高权重", categoryId: cat.id, weight: 9, tags: ["风景", "电影"] });

      const list = await listPrompts();
      expect(list.map((p) => p.title)).toEqual(["高权重", "低权重"]);
      expect(list[0].categoryName).toBe("写实");
      expect(list[0].tags).toEqual(["风景", "电影"]);
    });

    it("按分类 slug 过滤", async () => {
      const a = await createPromptCategory({ name: "商品", slug: "goods" });
      const b = await createPromptCategory({ name: "角色", slug: "role" });
      await createPrompt({ title: "商品图", categoryId: a.id });
      await createPrompt({ title: "角色图", categoryId: b.id });

      const list = await listPrompts({ categorySlug: "goods" });
      expect(list.map((p) => p.title)).toEqual(["商品图"]);
    });

    it("按关键词过滤标题/摘要（大小写不敏感）", async () => {
      await createPrompt({ title: "Cyberpunk City", summary: "霓虹夜景" });
      await createPrompt({ title: "田园风光", summary: "清晨薄雾" });

      const list = await listPrompts({ q: "cyberpunk" });
      expect(list.map((p) => p.title)).toEqual(["Cyberpunk City"]);
    });
  });

  describe("listPromptCategories", () => {
    it("按 sortOrder 返回并统计每类模板数", async () => {
      const first = await createPromptCategory({ name: "先", slug: "first", sortOrder: 0 });
      const second = await createPromptCategory({ name: "后", slug: "second", sortOrder: 1 });
      await createPrompt({ categoryId: first.id });
      await createPrompt({ categoryId: first.id });
      await createPrompt({ categoryId: second.id });

      const cats = await listPromptCategories();
      expect(cats.map((c) => c.slug)).toEqual(["first", "second"]);
      expect(cats[0].count).toBe(2);
      expect(cats[1].count).toBe(1);
    });
  });

  describe("togglePromptFavorite", () => {
    it("收藏写入并维护 favoriteCount，取消后回落且不为负", async () => {
      const user = await createUser();
      const prompt = await createPrompt();

      const first = await togglePromptFavorite(user.id, prompt.id);
      expect(first.favorited).toBe(true);
      expect(await listUserPromptFavoriteIds(user.id)).toEqual([prompt.id]);
      expect((await prisma.prompt.findUnique({ where: { id: prompt.id } }))?.favoriteCount).toBe(1);

      const second = await togglePromptFavorite(user.id, prompt.id);
      expect(second.favorited).toBe(false);
      expect(await listUserPromptFavoriteIds(user.id)).toHaveLength(0);
      expect((await prisma.prompt.findUnique({ where: { id: prompt.id } }))?.favoriteCount).toBe(0);
    });

    it("提示词不存在抛 NOT_FOUND(404)", async () => {
      const user = await createUser();
      await expect(togglePromptFavorite(user.id, "nope")).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });

    it("空标识抛 BAD_REQUEST(400)", async () => {
      const user = await createUser();
      await expect(togglePromptFavorite(user.id, "  ")).rejects.toMatchObject({
        code: "BAD_REQUEST",
        status: 400,
      });
    });
  });
});
