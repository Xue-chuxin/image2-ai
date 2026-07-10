import { prisma } from "@/lib/db";

export type LeaderboardWork = {
  rank: number;
  imageId: string;
  jobId: string | null;
  url: string;
  thumbnailUrl: string;
  title: string;
  authorName: string;
  authorAvatar: string | null;
  likes: number;
  comments: number;
};

export type LeaderboardCreator = {
  rank: number;
  userId: string;
  name: string;
  avatarUrl: string | null;
  totalLikes: number;
  works: number;
};

export type CreatorLikeEntry = {
  userId: string;
  name: string;
  avatarUrl: string | null;
  likes: number;
};

/**
 * 按创作者聚合其公开作品的点赞：把每张作品的点赞累加到作者名下，
 * 统计其总赞数与上榜作品数，按「总赞数 → 作品数」降序取前 N，并赋予名次。纯函数，便于单测。
 */
export function aggregateCreators(entries: CreatorLikeEntry[], limit: number): LeaderboardCreator[] {
  const cleanLimit = Math.min(Math.max(Math.floor(limit) || 10, 1), 100);
  const byUser = new Map<string, { userId: string; name: string; avatarUrl: string | null; totalLikes: number; works: number }>();

  for (const entry of entries) {
    const current = byUser.get(entry.userId) ?? {
      userId: entry.userId,
      name: entry.name,
      avatarUrl: entry.avatarUrl,
      totalLikes: 0,
      works: 0,
    };
    current.totalLikes += entry.likes;
    current.works += 1;
    byUser.set(entry.userId, current);
  }

  return [...byUser.values()]
    .sort((a, b) => b.totalLikes - a.totalLikes || b.works - a.works)
    .slice(0, cleanLimit)
    .map((creator, index) => ({
      rank: index + 1,
      userId: creator.userId,
      name: creator.name,
      avatarUrl: creator.avatarUrl,
      totalLikes: creator.totalLikes,
      works: creator.works,
    }));
}

function resolveAuthor(image: any): { name: string; avatar: string | null } {
  const user = image.job?.user;
  const name = user?.displayName?.trim() || user?.email?.split("@")[0] || "创作者";
  return { name, avatar: user?.avatarUrl ?? null };
}

function shortTitle(text: string) {
  const clean = (text || "").replace(/\s+/g, " ").trim();
  if (!clean) {
    return "生成作品";
  }
  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

const generatedVisibleWhere = {
  isPublic: true,
  isDeleted: false,
  takenDownAt: null,
  job: { is: { status: "COMPLETED" as const } },
};

/**
 * 热门作品榜：按点赞数（其次评论数）对公开生成作品排序取前 N。
 * 候选来自「有过点赞」的作品，过滤掉已下架/取消发布的作品；全 0（无赞）的作品不上榜。
 */
export async function listTopGalleryWorks({ limit = 12 }: { limit?: number } = {}): Promise<LeaderboardWork[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit) || 12, 1), 60);

  const likeGroups = await prisma.galleryImageLike.groupBy({
    by: ["imageId"],
    where: { sourceType: "generated" },
    _count: { _all: true },
    orderBy: { _count: { imageId: "desc" } },
    take: cleanLimit * 4,
  });

  if (likeGroups.length === 0) {
    return [];
  }

  const likeByImage = new Map(likeGroups.map((group) => [group.imageId, group._count._all]));
  const imageIds = likeGroups.map((group) => group.imageId);

  const [images, commentGroups] = await Promise.all([
    prisma.generatedImage.findMany({
      where: { id: { in: imageIds }, ...generatedVisibleWhere },
      include: {
        job: {
          include: {
            user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
          },
        },
      },
    }),
    prisma.galleryImageComment.groupBy({
      by: ["imageId"],
      where: { sourceType: "generated", isDeleted: false, imageId: { in: imageIds } },
      _count: { _all: true },
    }),
  ]);

  const commentByImage = new Map(commentGroups.map((group) => [group.imageId, group._count._all]));

  const works = images.map((image) => {
    const author = resolveAuthor(image);
    return {
      imageId: image.id,
      jobId: image.jobId,
      url: image.url,
      thumbnailUrl: image.thumbnailUrl || image.url,
      title: shortTitle(image.job?.polishedPromptZh || image.job?.originalInput || ""),
      authorName: author.name,
      authorAvatar: author.avatar,
      likes: likeByImage.get(image.id) ?? 0,
      comments: commentByImage.get(image.id) ?? 0,
    };
  });

  return works
    .sort((a, b) => b.likes - a.likes || b.comments - a.comments)
    .slice(0, cleanLimit)
    .map((work, index) => ({ rank: index + 1, ...work }));
}

/**
 * 活跃创作者榜：把每张公开作品的点赞累加到作者名下，按总赞数排序取前 N。
 * 仅统计仍公开可见的生成作品；无赞创作者不上榜。
 */
export async function listTopCreators({ limit = 10 }: { limit?: number } = {}): Promise<LeaderboardCreator[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit) || 10, 1), 100);

  const likeGroups = await prisma.galleryImageLike.groupBy({
    by: ["imageId"],
    where: { sourceType: "generated" },
    _count: { _all: true },
  });

  if (likeGroups.length === 0) {
    return [];
  }

  const likeByImage = new Map(likeGroups.map((group) => [group.imageId, group._count._all]));
  const imageIds = likeGroups.map((group) => group.imageId);

  const images = await prisma.generatedImage.findMany({
    where: { id: { in: imageIds }, ...generatedVisibleWhere },
    include: {
      job: {
        include: {
          user: { select: { id: true, email: true, displayName: true, avatarUrl: true } },
        },
      },
    },
  });

  const entries: CreatorLikeEntry[] = [];
  for (const image of images) {
    const userId = image.job?.user?.id;
    if (!userId) {
      continue;
    }
    const author = resolveAuthor(image);
    entries.push({ userId, name: author.name, avatarUrl: author.avatar, likes: likeByImage.get(image.id) ?? 0 });
  }

  return aggregateCreators(entries, cleanLimit);
}
