import { prisma } from "@/lib/db";
import {
  resolveGalleryImages,
  type GalleryImageView,
  type GallerySourceType,
} from "@/lib/gallery";

const FAVORITE_SOURCE_TYPES: GallerySourceType[] = ["generated", "curated"];

export type FavoriteKey = `${GallerySourceType}:${string}`;

function normalizeSourceType(value: unknown): GallerySourceType {
  const clean = typeof value === "string" ? value.trim() : "";
  if (FAVORITE_SOURCE_TYPES.includes(clean as GallerySourceType)) {
    return clean as GallerySourceType;
  }
  throw new Error("不支持的收藏来源类型。");
}

function normalizeImageId(value: unknown): string {
  const clean = typeof value === "string" ? value.trim() : "";
  if (!clean || clean.length > 64) {
    throw new Error("收藏的作品标识无效。");
  }
  return clean;
}

// 目标作品必须当前仍公开可见才允许收藏，避免收藏已删除/下架内容。
async function assertImageAvailable(sourceType: GallerySourceType, imageId: string) {
  const [resolved] = await resolveGalleryImages([{ sourceType, imageId }]);
  if (!resolved) {
    throw new Error("该作品已下架或不存在，无法收藏。");
  }
}

/** 用户收藏的作品键集合（`sourceType:imageId`），用于前台高亮心形。 */
export async function listUserFavoriteKeys(userId: string): Promise<FavoriteKey[]> {
  const favorites = await prisma.imageFavorite.findMany({
    where: { userId },
    select: { sourceType: true, imageId: true },
    orderBy: { createdAt: "desc" },
  });

  return favorites.map((item) => `${item.sourceType as GallerySourceType}:${item.imageId}` as FavoriteKey);
}

/** 用户收藏的作品详情列表（按收藏时间倒序，已失效作品自动剔除）。 */
export async function listUserFavoriteImages(
  userId: string,
  { limit = 60 }: { limit?: number } = {},
): Promise<GalleryImageView[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), 120);
  const favorites = await prisma.imageFavorite.findMany({
    where: { userId },
    select: { sourceType: true, imageId: true },
    orderBy: { createdAt: "desc" },
    take: cleanLimit,
  });

  return resolveGalleryImages(
    favorites.map((item) => ({
      sourceType: item.sourceType as GallerySourceType,
      imageId: item.imageId,
    })),
  );
}

/** 收藏/取消收藏切换，返回操作后的收藏状态。 */
export async function toggleFavorite(
  userId: string,
  sourceTypeInput: unknown,
  imageIdInput: unknown,
): Promise<{ favorited: boolean }> {
  const sourceType = normalizeSourceType(sourceTypeInput);
  const imageId = normalizeImageId(imageIdInput);

  const existing = await prisma.imageFavorite.findUnique({
    where: {
      userId_sourceType_imageId: {
        userId,
        sourceType,
        imageId,
      },
    },
  });

  if (existing) {
    await prisma.imageFavorite.delete({ where: { id: existing.id } });
    return { favorited: false };
  }

  await assertImageAvailable(sourceType, imageId);
  await prisma.imageFavorite.create({
    data: { userId, sourceType, imageId },
  });

  return { favorited: true };
}
