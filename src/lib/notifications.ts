import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/db";
import type { GallerySourceType } from "@/lib/gallery";

export type NotificationType = "gallery_like" | "gallery_comment" | "referral_reward" | "membership";

export type NotificationView = {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: string;
};

const LIST_MAX_LIMIT = 50;

function toView(row: {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}): NotificationView {
  return {
    id: row.id,
    type: row.type,
    title: row.title,
    body: row.body,
    link: row.link,
    isRead: row.isRead,
    createdAt: row.createdAt.toISOString(),
  };
}

/** 写入一条站内通知（直接抛错，调用方决定是否吞掉）。 */
export async function createNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  await prisma.notification.create({
    data: {
      userId: input.userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
    },
  });
}

/**
 * 尽力写通知：任何异常都吞掉并记日志，绝不影响主流程（点赞/评论/返积分本身）。
 */
export async function safeCreateNotification(input: {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
}): Promise<void> {
  try {
    await createNotification(input);
  } catch (error) {
    console.error("[notifications] 写入通知失败", error);
  }
}

/**
 * 点赞/评论后通知作品作者：仅 generated（用户作品）有作者；curated 为运营内容无收件人。
 * 自己给自己的作品互动不通知。全程尽力而为，失败不影响互动本身。
 */
export async function notifyGalleryOwner(params: {
  actorId: string;
  actorName: string;
  sourceType: GallerySourceType;
  imageId: string;
  kind: "like" | "comment";
  commentExcerpt?: string;
}): Promise<void> {
  try {
    if (params.sourceType !== "generated") {
      return;
    }

    const image = await prisma.generatedImage.findUnique({
      where: { id: params.imageId },
      select: { job: { select: { userId: true } } },
    });
    const ownerId = image?.job?.userId;
    if (!ownerId || ownerId === params.actorId) {
      return;
    }

    if (params.kind === "like") {
      await createNotification({
        userId: ownerId,
        type: "gallery_like",
        title: `${params.actorName} 赞了你的作品`,
        link: "/history",
      });
    } else {
      await createNotification({
        userId: ownerId,
        type: "gallery_comment",
        title: `${params.actorName} 评论了你的作品`,
        body: params.commentExcerpt ?? null,
        link: "/history",
      });
    }
  } catch (error) {
    console.error("[notifications] 作品互动通知失败", error);
  }
}

/** 通知列表（时间倒序），可选仅未读。 */
export async function listNotifications(
  userId: string,
  { limit = LIST_MAX_LIMIT, unreadOnly = false }: { limit?: number; unreadOnly?: boolean } = {},
): Promise<NotificationView[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), LIST_MAX_LIMIT);
  const rows = await prisma.notification.findMany({
    where: { userId, ...(unreadOnly ? { isRead: false } : {}) },
    orderBy: { createdAt: "desc" },
    take: cleanLimit,
  });
  return rows.map(toView);
}

/** 未读数量。 */
export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

/** 标记单条为已读（仅限本人，越权抛 NOT_FOUND）。 */
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const clean = typeof notificationId === "string" ? notificationId.trim() : "";
  if (!clean) {
    throw new AppError("BAD_REQUEST", "通知标识无效。", 400);
  }
  const result = await prisma.notification.updateMany({
    where: { id: clean, userId },
    data: { isRead: true },
  });
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "通知不存在。", 404);
  }
}

/** 全部标记已读，返回本次影响条数。 */
export async function markAllNotificationsRead(userId: string): Promise<number> {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return result.count;
}
