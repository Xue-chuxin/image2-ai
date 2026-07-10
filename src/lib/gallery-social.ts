import { prisma } from "@/lib/db";
import { AppError } from "@/lib/app-error";
import { checkModerationText } from "@/lib/moderation";
import {
  resolveGalleryImages,
  type GalleryImageRef,
  type GallerySourceType,
} from "@/lib/gallery";

const SOCIAL_SOURCE_TYPES: GallerySourceType[] = ["generated", "curated"];

export type LikeKey = `${GallerySourceType}:${string}`;

const COMMENT_MAX_LENGTH = 500;

function normalizeSourceType(value: unknown): GallerySourceType {
  const clean = typeof value === "string" ? value.trim() : "";
  if (SOCIAL_SOURCE_TYPES.includes(clean as GallerySourceType)) {
    return clean as GallerySourceType;
  }
  throw new AppError("BAD_REQUEST", "不支持的作品来源类型。", 400);
}

function normalizeImageId(value: unknown): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean || clean.length > 64) {
    throw new AppError("BAD_REQUEST", "作品标识无效。", 400);
  }
  return clean;
}

function normalizeContent(value: unknown): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean) {
    throw new AppError("BAD_REQUEST", "评论内容不能为空。", 400);
  }
  if (clean.length > COMMENT_MAX_LENGTH) {
    throw new AppError("BAD_REQUEST", `评论内容过长，请控制在 ${COMMENT_MAX_LENGTH} 字以内。`, 400);
  }
  return clean;
}

// 目标作品必须当前仍公开可见，避免对已下架/删除内容点赞或评论。
async function assertImageAvailable(sourceType: GallerySourceType, imageId: string) {
  const [resolved] = await resolveGalleryImages([{ sourceType, imageId }]);
  if (!resolved) {
    throw new AppError("NOT_FOUND", "该作品已下架或不存在。", 404);
  }
}

/** 点赞/取消点赞切换，返回操作后的点赞状态。 */
export async function toggleLike(
  userId: string,
  sourceTypeInput: unknown,
  imageIdInput: unknown,
): Promise<{ liked: boolean }> {
  const sourceType = normalizeSourceType(sourceTypeInput);
  const imageId = normalizeImageId(imageIdInput);

  const existing = await prisma.galleryImageLike.findUnique({
    where: { userId_sourceType_imageId: { userId, sourceType, imageId } },
  });

  if (existing) {
    await prisma.galleryImageLike.delete({ where: { id: existing.id } });
    return { liked: false };
  }

  await assertImageAvailable(sourceType, imageId);
  await prisma.galleryImageLike.create({ data: { userId, sourceType, imageId } });
  return { liked: true };
}

/** 用户点赞的作品键集合（`sourceType:imageId`），用于前台高亮点赞态。 */
export async function listUserLikeKeys(userId: string): Promise<LikeKey[]> {
  const likes = await prisma.galleryImageLike.findMany({
    where: { userId },
    select: { sourceType: true, imageId: true },
  });
  return likes.map((item) => `${item.sourceType as GallerySourceType}:${item.imageId}` as LikeKey);
}

export type GalleryStat = { likes: number; comments: number };

/** 批量取回一组作品的点赞数与评论数，键为 `sourceType:imageId`（缺省计 0）。 */
export async function getGalleryStats(refs: GalleryImageRef[]): Promise<Record<string, GalleryStat>> {
  const stats: Record<string, GalleryStat> = {};
  if (refs.length === 0) {
    return stats;
  }

  const imageIds = Array.from(new Set(refs.map((ref) => ref.imageId)));
  const sourceTypes = Array.from(new Set(refs.map((ref) => ref.sourceType)));

  const [likeGroups, commentGroups] = await Promise.all([
    prisma.galleryImageLike.groupBy({
      by: ["sourceType", "imageId"],
      where: { sourceType: { in: sourceTypes }, imageId: { in: imageIds } },
      _count: { _all: true },
    }),
    prisma.galleryImageComment.groupBy({
      by: ["sourceType", "imageId"],
      where: { isDeleted: false, sourceType: { in: sourceTypes }, imageId: { in: imageIds } },
      _count: { _all: true },
    }),
  ]);

  for (const ref of refs) {
    stats[`${ref.sourceType}:${ref.imageId}`] = { likes: 0, comments: 0 };
  }
  for (const group of likeGroups) {
    const key = `${group.sourceType}:${group.imageId}`;
    if (stats[key]) {
      stats[key].likes = group._count._all;
    }
  }
  for (const group of commentGroups) {
    const key = `${group.sourceType}:${group.imageId}`;
    if (stats[key]) {
      stats[key].comments = group._count._all;
    }
  }

  return stats;
}

export type GalleryCommentView = {
  id: string;
  content: string;
  authorName: string;
  authorAvatar: string | null;
  isOwn: boolean;
  createdAt: string;
};

function toCommentView(comment: any, currentUserId: string | null): GalleryCommentView {
  return {
    id: comment.id,
    content: comment.content,
    authorName: comment.user?.displayName || comment.user?.email || "用户",
    authorAvatar: comment.user?.avatarUrl || null,
    isOwn: Boolean(currentUserId) && comment.userId === currentUserId,
    createdAt: comment.createdAt.toISOString(),
  };
}

/** 某作品的评论列表（未删除，倒序）。currentUserId 用于标记可删除的自有评论。 */
export async function listComments(
  sourceTypeInput: unknown,
  imageIdInput: unknown,
  { limit = 50, currentUserId = null }: { limit?: number; currentUserId?: string | null } = {},
): Promise<GalleryCommentView[]> {
  const sourceType = normalizeSourceType(sourceTypeInput);
  const imageId = normalizeImageId(imageIdInput);
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), 100);

  const comments = await prisma.galleryImageComment.findMany({
    where: { sourceType, imageId, isDeleted: false },
    orderBy: { createdAt: "desc" },
    take: cleanLimit,
    include: {
      user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
    },
  });

  return comments.map((comment) => toCommentView(comment, currentUserId));
}

/** 发表评论：校验作品可见、内容审核、长度限制，写库并返回新评论。 */
export async function addComment(
  userId: string,
  sourceTypeInput: unknown,
  imageIdInput: unknown,
  contentInput: unknown,
): Promise<GalleryCommentView> {
  const sourceType = normalizeSourceType(sourceTypeInput);
  const imageId = normalizeImageId(imageIdInput);
  const content = normalizeContent(contentInput);

  await assertImageAvailable(sourceType, imageId);

  const moderation = await checkModerationText([{ value: content, label: "评论内容" }], { userId });
  if (!moderation.ok) {
    throw new AppError("FORBIDDEN", moderation.message || "评论内容未通过内容安全检查。", 400);
  }

  const comment = await prisma.galleryImageComment.create({
    data: { userId, sourceType, imageId, content },
    include: {
      user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
    },
  });

  return toCommentView(comment, userId);
}

/** 软删除自己的评论；非本人或不存在则拒绝。 */
export async function deleteOwnComment(userId: string, commentIdInput: unknown): Promise<void> {
  const commentId = normalizeImageId(commentIdInput);
  const comment = await prisma.galleryImageComment.findUnique({ where: { id: commentId } });
  if (!comment || comment.isDeleted) {
    throw new AppError("NOT_FOUND", "评论不存在或已删除。", 404);
  }
  if (comment.userId !== userId) {
    throw new AppError("FORBIDDEN", "只能删除自己的评论。", 403);
  }
  await prisma.galleryImageComment.update({ where: { id: commentId }, data: { isDeleted: true } });
}
