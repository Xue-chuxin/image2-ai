import { describe, expect, it } from "vitest";

import { listCuratedGalleryImages } from "@/lib/gallery";

import { createCuratedImage } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("listCuratedGalleryImages", () => {
  it("仅返回启用/未删除/未下架的精选，并按 sortOrder 升序在前", async () => {
    await createCuratedImage({ title: "B", sortOrder: 2 });
    await createCuratedImage({ title: "A", sortOrder: 1 });
    await createCuratedImage({ title: "停用", isActive: false });
    await createCuratedImage({ title: "已删", isDeleted: true });
    await createCuratedImage({ title: "下架", takenDownAt: new Date() });

    const images = await listCuratedGalleryImages();
    expect(images.map((image) => image.title)).toEqual(["A", "B"]);
    expect(images.every((image) => image.sourceType === "curated")).toBe(true);
  });

  it("按分类过滤，「全部」不过滤", async () => {
    await createCuratedImage({ title: "国风一", category: "国风" });
    await createCuratedImage({ title: "商品一", category: "商品" });

    const guofeng = await listCuratedGalleryImages({ category: "国风" });
    expect(guofeng.map((image) => image.title)).toEqual(["国风一"]);

    const all = await listCuratedGalleryImages({ category: "全部" });
    expect(all).toHaveLength(2);
  });

  it("limit 生效，截断为指定数量", async () => {
    await createCuratedImage({ sortOrder: 1 });
    await createCuratedImage({ sortOrder: 2 });
    await createCuratedImage({ sortOrder: 3 });

    const images = await listCuratedGalleryImages({ limit: 2 });
    expect(images).toHaveLength(2);
  });
});
