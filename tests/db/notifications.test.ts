import { describe, expect, it } from "vitest";

import { prisma } from "@/lib/db";
import {
  createNotification,
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notifyGalleryOwner,
} from "@/lib/notifications";
import { toggleLike } from "@/lib/gallery-social";

import { createCuratedImage, createUser } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("notifications DB 集成", () => {
  describe("createNotification / listNotifications", () => {
    it("写入后倒序返回，未读数正确", async () => {
      const user = await createUser();
      await createNotification({ userId: user.id, type: "gallery_like", title: "第一条" });
      await createNotification({ userId: user.id, type: "gallery_comment", title: "第二条", body: "内容" });

      const list = await listNotifications(user.id);
      expect(list.map((n) => n.title)).toEqual(["第二条", "第一条"]);
      expect(list[0].body).toBe("内容");
      expect(await getUnreadCount(user.id)).toBe(2);
    });

    it("按用户隔离，不串号", async () => {
      const [a, b] = await Promise.all([createUser(), createUser()]);
      await createNotification({ userId: a.id, type: "membership", title: "给A" });

      expect(await getUnreadCount(b.id)).toBe(0);
      expect(await listNotifications(b.id)).toHaveLength(0);
    });

    it("unreadOnly 只返回未读", async () => {
      const user = await createUser();
      await createNotification({ userId: user.id, type: "gallery_like", title: "已读的" });
      await createNotification({ userId: user.id, type: "gallery_like", title: "未读的" });
      await markAllNotificationsRead(user.id);
      await createNotification({ userId: user.id, type: "gallery_like", title: "最新未读" });

      const unread = await listNotifications(user.id, { unreadOnly: true });
      expect(unread.map((n) => n.title)).toEqual(["最新未读"]);
    });
  });

  describe("markNotificationRead", () => {
    it("标记单条已读，未读数减一", async () => {
      const user = await createUser();
      await createNotification({ userId: user.id, type: "gallery_like", title: "a" });
      const [row] = await listNotifications(user.id);

      await markNotificationRead(user.id, row.id);
      expect(await getUnreadCount(user.id)).toBe(0);
    });

    it("不能标记他人通知（NOT_FOUND 404）", async () => {
      const [owner, other] = await Promise.all([createUser(), createUser()]);
      await createNotification({ userId: owner.id, type: "gallery_like", title: "a" });
      const [row] = await listNotifications(owner.id);

      await expect(markNotificationRead(other.id, row.id)).rejects.toMatchObject({
        code: "NOT_FOUND",
        status: 404,
      });
      // owner 的仍未读
      expect(await getUnreadCount(owner.id)).toBe(1);
    });
  });

  describe("markAllNotificationsRead", () => {
    it("全部标记已读，返回影响条数", async () => {
      const user = await createUser();
      await createNotification({ userId: user.id, type: "gallery_like", title: "a" });
      await createNotification({ userId: user.id, type: "gallery_like", title: "b" });

      const count = await markAllNotificationsRead(user.id);
      expect(count).toBe(2);
      expect(await getUnreadCount(user.id)).toBe(0);
    });
  });

  describe("notifyGalleryOwner", () => {
    it("curated 运营作品无作者，不产生通知", async () => {
      const actor = await createUser();
      const image = await createCuratedImage();

      await notifyGalleryOwner({
        actorId: actor.id,
        actorName: "某人",
        sourceType: "curated",
        imageId: image.id,
        kind: "like",
      });

      expect(await prisma.notification.count()).toBe(0);
    });

    it("点赞 curated 作品不触发任何通知（经 toggleLike 全链路）", async () => {
      const actor = await createUser();
      const image = await createCuratedImage();

      const result = await toggleLike(actor.id, "curated", image.id);
      expect(result.liked).toBe(true);
      expect(await prisma.notification.count()).toBe(0);
    });
  });
});
