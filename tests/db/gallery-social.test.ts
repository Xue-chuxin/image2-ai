import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  addComment,
  deleteOwnComment,
  getGalleryStats,
  listComments,
  listUserLikeKeys,
  toggleLike,
} from "@/lib/gallery-social";

import { createCuratedImage, createUser, seedSettings } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("gallery-social DB 集成", () => {
  describe("toggleLike", () => {
    it("首次点赞写入并幂等切换（再点取消）", async () => {
      const user = await createUser();
      const image = await createCuratedImage();

      const first = await toggleLike(user.id, "curated", image.id);
      expect(first.liked).toBe(true);

      const keys = await listUserLikeKeys(user.id);
      expect(keys).toEqual([`curated:${image.id}`]);

      const second = await toggleLike(user.id, "curated", image.id);
      expect(second.liked).toBe(false);
      expect(await listUserLikeKeys(user.id)).toHaveLength(0);
    });

    it("对已下架/不可见作品点赞抛 NOT_FOUND(404)", async () => {
      const user = await createUser();
      const image = await createCuratedImage({ isActive: false });

      await expect(toggleLike(user.id, "curated", image.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });

    it("来源类型非法抛 BAD_REQUEST(400)", async () => {
      const user = await createUser();
      await expect(toggleLike(user.id, "sample", "x")).rejects.toMatchObject({
        code: "BAD_REQUEST",
        status: 400,
      });
    });
  });

  describe("getGalleryStats", () => {
    it("批量返回点赞数与评论数，缺省计 0", async () => {
      const [u1, u2] = await Promise.all([createUser(), createUser()]);
      const image = await createCuratedImage();
      const other = await createCuratedImage();

      await toggleLike(u1.id, "curated", image.id);
      await toggleLike(u2.id, "curated", image.id);
      await seedSettings({ moderationEnabled: "false" });
      await addComment(u1.id, "curated", image.id, "很棒的作品");

      const stats = await getGalleryStats([
        { sourceType: "curated", imageId: image.id },
        { sourceType: "curated", imageId: other.id },
      ]);

      expect(stats[`curated:${image.id}`]).toEqual({ likes: 2, comments: 1 });
      expect(stats[`curated:${other.id}`]).toEqual({ likes: 0, comments: 0 });
    });
  });

  describe("addComment", () => {
    it("发表评论后可在列表中查到（倒序、含作者与归属标记）", async () => {
      await seedSettings({ moderationEnabled: "false" });
      const author = await createUser({ email: "author@test.local" });
      const image = await createCuratedImage();

      await addComment(author.id, "curated", image.id, "第一条");
      await addComment(author.id, "curated", image.id, "第二条");

      const comments = await listComments("curated", image.id, { currentUserId: author.id });
      expect(comments.map((c) => c.content)).toEqual(["第二条", "第一条"]);
      expect(comments[0].isOwn).toBe(true);
      expect(comments[0].authorName).toBe("author@test.local");
    });

    it("命中违禁词的评论被拦截，不落库", async () => {
      await seedSettings({
        moderationEnabled: "true",
        moderationForbiddenWords: "违禁词",
        moderationSemanticEnabled: "false",
      });
      const user = await createUser();
      const image = await createCuratedImage();

      await expect(addComment(user.id, "curated", image.id, "包含违禁词的评论")).rejects.toMatchObject({
        code: "FORBIDDEN",
      });

      const count = await prisma.galleryImageComment.count();
      expect(count).toBe(0);
      // 审核拦截应写审计日志
      expect(await prisma.moderationLog.count()).toBe(1);
    });

    it("空内容抛 BAD_REQUEST(400)", async () => {
      await seedSettings({ moderationEnabled: "false" });
      const user = await createUser();
      const image = await createCuratedImage();

      await expect(addComment(user.id, "curated", image.id, "   ")).rejects.toMatchObject({
        code: "BAD_REQUEST",
        status: 400,
      });
    });

    it("对不可见作品评论抛 NOT_FOUND(404)", async () => {
      await seedSettings({ moderationEnabled: "false" });
      const user = await createUser();
      const image = await createCuratedImage({ isActive: false });

      await expect(addComment(user.id, "curated", image.id, "评论内容")).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
    });
  });

  describe("deleteOwnComment", () => {
    it("软删自己的评论后列表不再返回", async () => {
      await seedSettings({ moderationEnabled: "false" });
      const user = await createUser();
      const image = await createCuratedImage();

      const created = await addComment(user.id, "curated", image.id, "待删除评论");
      await deleteOwnComment(user.id, created.id);

      const comments = await listComments("curated", image.id);
      expect(comments).toHaveLength(0);

      const row = await prisma.galleryImageComment.findUnique({ where: { id: created.id } });
      expect(row?.isDeleted).toBe(true);
    });

    it("不能删除他人评论（FORBIDDEN 403）", async () => {
      await seedSettings({ moderationEnabled: "false" });
      const [author, other] = await Promise.all([createUser(), createUser()]);
      const image = await createCuratedImage();

      const created = await addComment(author.id, "curated", image.id, "他人评论");

      await expect(deleteOwnComment(other.id, created.id)).rejects.toMatchObject({
        code: "FORBIDDEN",
        status: 403,
      });
    });
  });
});
