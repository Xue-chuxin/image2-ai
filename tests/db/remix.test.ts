import { describe, expect, it } from "vitest";

import { createReferenceFromGeneratedImage } from "@/lib/uploads";

import { createGeneratedImage, createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

// 说明：成功复刻路径需真实抓取图片字节并经 sharp 处理（依赖存储/网络），此处只覆盖
// 抓取之前的鉴权分支（BAD_REQUEST / NOT_FOUND / FORBIDDEN），它们在 fetch 之前抛出。
describe.skipIf(!hasDb)("图片二创鉴权（createReferenceFromGeneratedImage）", () => {
  it("空 imageId 抛 BAD_REQUEST(400)", async () => {
    const user = await createUser();
    await expect(
      createReferenceFromGeneratedImage({ userId: user.id, imageId: "  ", origin: "http://localhost" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST", status: 400 });
  });

  it("图片不存在抛 NOT_FOUND(404)", async () => {
    const user = await createUser();
    await expect(
      createReferenceFromGeneratedImage({ userId: user.id, imageId: "nope", origin: "http://localhost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("已删除的图片抛 NOT_FOUND(404)", async () => {
    const { image, job } = await createGeneratedImage({ isDeleted: true });
    await expect(
      createReferenceFromGeneratedImage({ userId: job.userId, imageId: image.id, origin: "http://localhost" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
  });

  it("他人未公开图片抛 FORBIDDEN(403)", async () => {
    const other = await createUser();
    const { image } = await createGeneratedImage({ isPublic: false });
    await expect(
      createReferenceFromGeneratedImage({ userId: other.id, imageId: image.id, origin: "http://localhost" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });

  it("他人已下架的公开图片抛 FORBIDDEN(403)", async () => {
    const other = await createUser();
    const { image } = await createGeneratedImage({ isPublic: true, takenDownAt: new Date() });
    await expect(
      createReferenceFromGeneratedImage({ userId: other.id, imageId: image.id, origin: "http://localhost" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
  });
});
