import { AppError } from "@/lib/app-error";
import { prisma } from "@/lib/db";

export type PromptCategoryView = {
  slug: string;
  name: string;
  count: number;
};

export type PromptCardView = {
  id: string;
  slug: string;
  title: string;
  summary: string;
  categoryName: string | null;
  categorySlug: string | null;
  tags: string[];
  promptZh: string;
  promptEn: string;
  negativePrompt: string | null;
  coverUrl: string | null;
  authorName: string | null;
  viewCount: number;
  favoriteCount: number;
};

const LIST_MAX_LIMIT = 120;

function toCardView(prompt: any): PromptCardView {
  return {
    id: prompt.id,
    slug: prompt.slug,
    title: prompt.title,
    summary: prompt.summary,
    categoryName: prompt.category?.name ?? null,
    categorySlug: prompt.category?.slug ?? null,
    tags: Array.isArray(prompt.tags) ? prompt.tags.map((tag: any) => tag.name) : [],
    promptZh: prompt.promptZh,
    promptEn: prompt.promptEn,
    negativePrompt: prompt.negativePrompt ?? null,
    coverUrl: prompt.coverUrl ?? null,
    authorName: prompt.authorName ?? null,
    viewCount: prompt.viewCount,
    favoriteCount: prompt.favoriteCount,
  };
}

/** 提示词分类列表（按 sortOrder），附带每类的模板数量。 */
export async function listPromptCategories(): Promise<PromptCategoryView[]> {
  const categories = await prisma.promptCategory.findMany({
    orderBy: { sortOrder: "asc" },
    include: { _count: { select: { prompts: true } } },
  });
  return categories.map((category) => ({
    slug: category.slug,
    name: category.name,
    count: category._count.prompts,
  }));
}

/**
 * 提示词模板列表：可按关键词（标题/摘要）、分类 slug 过滤，或仅取指定 id 集合（用于「只看收藏」）。
 * 排序：权重 → 收藏数 → 创建时间倒序。
 */
export async function listPrompts({
  q,
  categorySlug,
  ids,
  limit = LIST_MAX_LIMIT,
}: {
  q?: string | null;
  categorySlug?: string | null;
  ids?: string[];
  limit?: number;
} = {}): Promise<PromptCardView[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), LIST_MAX_LIMIT);
  const cleanQuery = typeof q === "string" ? q.trim() : "";
  const cleanCategory = typeof categorySlug === "string" ? categorySlug.trim() : "";

  const prompts = await prisma.prompt.findMany({
    where: {
      ...(ids ? { id: { in: ids } } : {}),
      ...(cleanCategory ? { category: { is: { slug: cleanCategory } } } : {}),
      ...(cleanQuery
        ? {
            OR: [
              { title: { contains: cleanQuery, mode: "insensitive" } },
              { summary: { contains: cleanQuery, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { select: { name: true } },
    },
    orderBy: [{ weight: "desc" }, { favoriteCount: "desc" }, { createdAt: "desc" }],
    take: cleanLimit,
  });

  return prompts.map(toCardView);
}

/**
 * 热门提示词榜：按「收藏数 → 浏览量 → 创建时间倒序」排序取前 N 条。
 * 仅纳入至少有一次收藏或浏览的模板，避免全 0 的新模板占据榜单。
 */
export async function listTrendingPrompts({ limit = 10 }: { limit?: number } = {}): Promise<PromptCardView[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), 50);
  const prompts = await prisma.prompt.findMany({
    where: {
      OR: [{ favoriteCount: { gt: 0 } }, { viewCount: { gt: 0 } }],
    },
    include: {
      category: { select: { name: true, slug: true } },
      tags: { select: { name: true } },
    },
    orderBy: [{ favoriteCount: "desc" }, { viewCount: "desc" }, { createdAt: "desc" }],
    take: cleanLimit,
  });
  return prompts.map(toCardView);
}

/**
 * 记录一次提示词使用（点击「去创作」时调用），原子自增 viewCount。
 * 提示词不存在时静默忽略（updateMany 影响 0 行，不抛错），返回是否命中。
 */
export async function recordPromptView(promptIdInput: unknown): Promise<{ recorded: boolean }> {
  const promptId = typeof promptIdInput === "string" ? promptIdInput.trim() : "";
  if (!promptId) {
    return { recorded: false };
  }
  const result = await prisma.prompt.updateMany({
    where: { id: promptId },
    data: { viewCount: { increment: 1 } },
  });
  return { recorded: result.count > 0 };
}

/** 用户收藏的提示词 id 集合，用于前台高亮收藏态。 */
export async function listUserPromptFavoriteIds(userId: string): Promise<string[]> {
  const favorites = await prisma.promptFavorite.findMany({
    where: { userId },
    select: { promptId: true },
  });
  return favorites.map((item) => item.promptId);
}

/**
 * 收藏/取消收藏切换，同步维护 Prompt.favoriteCount（事务内原子增减，计数不小于 0）。
 * 提示词不存在抛 NOT_FOUND(404)。
 */
export async function togglePromptFavorite(userId: string, promptIdInput: unknown): Promise<{ favorited: boolean }> {
  const promptId = typeof promptIdInput === "string" ? promptIdInput.trim() : "";
  if (!promptId) {
    throw new AppError("BAD_REQUEST", "提示词标识无效。", 400);
  }

  const existing = await prisma.promptFavorite.findUnique({
    where: { userId_promptId: { userId, promptId } },
  });

  if (existing) {
    await prisma.$transaction([
      prisma.promptFavorite.delete({ where: { id: existing.id } }),
      prisma.prompt.updateMany({
        where: { id: promptId, favoriteCount: { gt: 0 } },
        data: { favoriteCount: { decrement: 1 } },
      }),
    ]);
    return { favorited: false };
  }

  const prompt = await prisma.prompt.findUnique({ where: { id: promptId }, select: { id: true } });
  if (!prompt) {
    throw new AppError("NOT_FOUND", "提示词不存在。", 404);
  }

  await prisma.$transaction([
    prisma.promptFavorite.create({ data: { userId, promptId } }),
    prisma.prompt.update({ where: { id: promptId }, data: { favoriteCount: { increment: 1 } } }),
  ]);
  return { favorited: true };
}
