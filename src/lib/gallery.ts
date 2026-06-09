import { prisma } from "@/lib/db";
import { IMAGE_GALLERY_CATEGORIES } from "@/lib/image-categories";

export const GALLERY_CATEGORIES = [...IMAGE_GALLERY_CATEGORIES];

export type GallerySourceType = "generated" | "curated";

export type GalleryImageView = {
  id: string;
  sourceType: GallerySourceType;
  jobId: string | null;
  title: string;
  summary: string;
  url: string;
  thumbnailUrl: string;
  width: number | null;
  height: number | null;
  fileSize: number | null;
  mimeType: string | null;
  ratio: string;
  quality: string;
  provider: string;
  promptZh: string;
  promptEn: string | null;
  negativePrompt: string | null;
  category: string;
  tags: string[];
  authorName: string;
  authorEmail: string | null;
  sourceName: string | null;
  sourceUrl: string | null;
  isPublic: boolean;
  isDeleted: boolean;
  publishedAt: string | null;
  takenDownAt: string | null;
  takenDownReason: string | null;
  createdAt: string;
};

export type AdminGalleryImageView = GalleryImageView & {
  jobStatus: string;
  creditCost: number;
  userId: string;
};

export type AdminCuratedGalleryImageView = GalleryImageView & {
  sortOrder: number;
  isActive: boolean;
};

type GalleryQuery = {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  limit?: number;
};

export type UpsertCuratedGalleryImageInput = {
  id?: string;
  title?: string;
  summary?: string;
  imageUrl?: string;
  thumbnailUrl?: string | null;
  ratio?: string;
  category?: string;
  tags?: string[] | string;
  promptZh?: string;
  promptEn?: string | null;
  negativePrompt?: string | null;
  authorName?: string;
  sourceName?: string | null;
  sourceUrl?: string | null;
  sortOrder?: number | string;
  isActive?: boolean;
};

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return 48;
  }

  return Math.min(Math.max(Math.floor(Number(limit)), 1), 120);
}

function normalizeText(value?: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeOptionalText(value?: unknown, maxLength = 1000) {
  const clean = normalizeText(value).slice(0, maxLength);
  return clean || null;
}

function normalizeCategory(value?: string | null) {
  const clean = normalizeText(value);
  return GALLERY_CATEGORIES.includes(clean as (typeof GALLERY_CATEGORIES)[number]) && clean !== "全部" ? clean : "其他";
}

function normalizeRatio(value?: string | null) {
  const clean = normalizeText(value);
  return ["1:1", "3:4", "4:3", "9:16", "16:9"].includes(clean) ? clean : "1:1";
}

function normalizeTags(value?: string[] | string | null) {
  const rawTags = Array.isArray(value) ? value : normalizeText(value).split(/[,，、\s]+/);
  const tags = rawTags.map((tag) => tag.trim()).filter(Boolean).slice(0, 8);
  return Array.from(new Set(tags));
}

function serializeTags(tags: string[] | string | null | undefined) {
  return normalizeTags(tags).join(",");
}

function parseTags(value?: string | null) {
  return normalizeTags(value);
}

function shortTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "生成作品";
  }
  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function serializeDate(value?: Date | null) {
  return value ? value.toISOString() : null;
}

function inferGalleryCategory(...values: Array<string | null | undefined>) {
  const haystack = values.join(" ").toLowerCase();

  if (/(商品|产品|海报|包装|电商|poster|product|commerce|brand)/i.test(haystack)) {
    return "商品";
  }

  if (/(人像|写真|肖像|portrait|photo|photography|皮肤|镜头)/i.test(haystack)) {
    return "写真";
  }

  if (/(角色|设定|人物卡|character|game|fantasy)/i.test(haystack)) {
    return "角色";
  }

  if (/(界面|app|ui|网页|dashboard|mobile|screen|interface)/i.test(haystack)) {
    return "界面";
  }

  if (/(建筑|空间|室内|展厅|building|architecture|interior|museum)/i.test(haystack)) {
    return "建筑";
  }

  if (/(插画|绘本|漫画|illustration|storybook|comic|painting)/i.test(haystack)) {
    return "插画";
  }

  if (/(国风|水墨|东方|古风|chinese|ink|hanfu)/i.test(haystack)) {
    return "国风";
  }

  return "其他";
}

function toGalleryImageView(image: any): GalleryImageView {
  const promptZh = image.job?.polishedPromptZh || image.job?.originalInput || "";
  const promptEn = image.job?.polishedPromptEn || null;
  const negativePrompt = image.job?.negativePrompt || null;
  const authorName = image.job?.user?.displayName || image.job?.user?.email || "创作者";
  const category = inferGalleryCategory(promptZh, promptEn, negativePrompt);

  return {
    id: image.id,
    sourceType: "generated",
    jobId: image.jobId,
    title: shortTitle(promptZh),
    summary: promptZh,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl || image.url,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
    mimeType: image.mimeType,
    ratio: image.job?.ratio || "1:1",
    quality: image.job?.quality || "standard",
    provider: image.job?.provider || "unknown",
    promptZh,
    promptEn,
    negativePrompt,
    category,
    tags: [category, image.job?.ratio || "1:1", image.job?.provider || "openai"],
    authorName,
    authorEmail: image.job?.user?.email || null,
    sourceName: "用户公开作品",
    sourceUrl: null,
    isPublic: Boolean(image.isPublic),
    isDeleted: Boolean(image.isDeleted),
    publishedAt: serializeDate(image.publishedAt),
    takenDownAt: serializeDate(image.takenDownAt),
    takenDownReason: image.takenDownReason || null,
    createdAt: image.createdAt.toISOString(),
  };
}

function toCuratedGalleryImageView(image: any): GalleryImageView {
  return {
    id: image.id,
    sourceType: "curated",
    jobId: null,
    title: image.title,
    summary: image.summary,
    url: image.imageUrl,
    thumbnailUrl: image.thumbnailUrl || image.imageUrl,
    width: image.width,
    height: image.height,
    fileSize: image.fileSize,
    mimeType: image.mimeType,
    ratio: image.ratio || "1:1",
    quality: "精选",
    provider: image.provider || "curated",
    promptZh: image.promptZh,
    promptEn: image.promptEn || null,
    negativePrompt: image.negativePrompt || null,
    category: image.category || "其他",
    tags: parseTags(image.tags),
    authorName: image.authorName || "造图台",
    authorEmail: null,
    sourceName: image.sourceName || "运营精选",
    sourceUrl: image.sourceUrl || null,
    isPublic: Boolean(image.isActive && !image.isDeleted && !image.takenDownAt),
    isDeleted: Boolean(image.isDeleted),
    publishedAt: serializeDate(image.publishedAt),
    takenDownAt: serializeDate(image.takenDownAt),
    takenDownReason: image.takenDownReason || null,
    createdAt: image.createdAt.toISOString(),
  };
}

function toAdminGalleryImageView(image: any): AdminGalleryImageView {
  const view = toGalleryImageView(image);

  return {
    ...view,
    jobStatus: image.job?.status || "UNKNOWN",
    creditCost: image.job?.creditCost || 0,
    userId: image.job?.userId || "",
  };
}

function toAdminCuratedGalleryImageView(image: any): AdminCuratedGalleryImageView {
  return {
    ...toCuratedGalleryImageView(image),
    sortOrder: image.sortOrder,
    isActive: Boolean(image.isActive),
  };
}

function buildSearchWhere(query: string) {
  return [
    {
      id: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      url: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      job: {
        is: {
          id: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
    },
    {
      job: {
        is: {
          originalInput: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
    },
    {
      job: {
        is: {
          polishedPromptZh: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
    },
    {
      job: {
        is: {
          polishedPromptEn: {
            contains: query,
            mode: "insensitive" as const,
          },
        },
      },
    },
    {
      job: {
        is: {
          user: {
            is: {
              email: {
                contains: query,
                mode: "insensitive" as const,
              },
            },
          },
        },
      },
    },
  ];
}

function buildCuratedSearchWhere(query: string) {
  return [
    {
      title: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      summary: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      promptZh: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      promptEn: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      negativePrompt: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      tags: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
    {
      authorName: {
        contains: query,
        mode: "insensitive" as const,
      },
    },
  ];
}

const galleryInclude = {
  job: {
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
          avatarUrl: true,
        },
      },
    },
  },
};

export async function listPublicGalleryImages({ q, category, limit }: GalleryQuery = {}): Promise<GalleryImageView[]> {
  const cleanLimit = normalizeLimit(limit);
  const cleanQuery = normalizeText(q);
  const cleanCategory = normalizeText(category);

  const generatedTake = cleanCategory && cleanCategory !== "全部" ? cleanLimit * 3 : cleanLimit;
  const curatedTake = cleanLimit;
  const [generatedImages, curatedImages] = await Promise.all([
    prisma.generatedImage.findMany({
      where: {
        isPublic: true,
        isDeleted: false,
        takenDownAt: null,
        job: {
          is: {
            status: "COMPLETED",
          },
        },
        ...(cleanQuery ? { OR: buildSearchWhere(cleanQuery) } : {}),
      },
      include: galleryInclude,
      orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
      take: generatedTake,
    }),
    prisma.curatedGalleryImage.findMany({
      where: {
        isActive: true,
        isDeleted: false,
        takenDownAt: null,
        ...(cleanCategory && cleanCategory !== "全部" ? { category: cleanCategory } : {}),
        ...(cleanQuery ? { OR: buildCuratedSearchWhere(cleanQuery) } : {}),
      },
      orderBy: [{ sortOrder: "asc" }, { publishedAt: "desc" }, { createdAt: "desc" }],
      take: curatedTake,
    }),
  ]);

  const views = [...generatedImages.map(toGalleryImageView), ...curatedImages.map(toCuratedGalleryImageView)];
  if (!cleanCategory || cleanCategory === "全部") {
    return views.slice(0, cleanLimit);
  }

  return views.filter((image) => image.category === cleanCategory).slice(0, cleanLimit);
}

export async function listAdminGalleryImages({ q, status, limit }: GalleryQuery = {}): Promise<AdminGalleryImageView[]> {
  const cleanLimit = normalizeLimit(limit);
  const cleanQuery = normalizeText(q);
  const cleanStatus = normalizeText(status);

  const statusWhere =
    cleanStatus === "public"
      ? { isPublic: true, isDeleted: false, takenDownAt: null }
      : cleanStatus === "private"
        ? { isPublic: false, isDeleted: false, takenDownAt: null }
        : cleanStatus === "taken_down"
          ? { isDeleted: false, takenDownAt: { not: null } }
          : cleanStatus === "deleted"
            ? { isDeleted: true }
            : {};

  const images = await prisma.generatedImage.findMany({
    where: {
      ...statusWhere,
      ...(cleanQuery ? { OR: buildSearchWhere(cleanQuery) } : {}),
    },
    include: galleryInclude,
    orderBy: {
      createdAt: "desc",
    },
    take: cleanLimit,
  });

  return images.map(toAdminGalleryImageView);
}

export async function listAdminCuratedGalleryImages({ q, status, limit }: GalleryQuery = {}): Promise<AdminCuratedGalleryImageView[]> {
  const cleanLimit = normalizeLimit(limit);
  const cleanQuery = normalizeText(q);
  const cleanStatus = normalizeText(status);

  const statusWhere =
    cleanStatus === "active"
      ? { isActive: true, isDeleted: false, takenDownAt: null }
      : cleanStatus === "inactive"
        ? { isActive: false, isDeleted: false, takenDownAt: null }
        : cleanStatus === "taken_down"
          ? { isDeleted: false, takenDownAt: { not: null } }
          : cleanStatus === "deleted"
            ? { isDeleted: true }
            : {};

  const images = await prisma.curatedGalleryImage.findMany({
    where: {
      ...statusWhere,
      ...(cleanQuery ? { OR: buildCuratedSearchWhere(cleanQuery) } : {}),
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    take: cleanLimit,
  });

  return images.map(toAdminCuratedGalleryImageView);
}

export async function upsertCuratedGalleryImage(input: UpsertCuratedGalleryImageInput) {
  const title = normalizeText(input.title).slice(0, 120);
  const summary = normalizeText(input.summary).slice(0, 600);
  const imageUrl = normalizeText(input.imageUrl).slice(0, 1200);
  const promptZh = normalizeText(input.promptZh).slice(0, 4000);
  const category = normalizeCategory(input.category);
  const sortOrderValue = Number(input.sortOrder || 0);
  const sortOrder = Number.isFinite(sortOrderValue) ? Math.floor(sortOrderValue) : 0;

  if (!title) {
    throw new Error("请输入精选作品标题。");
  }
  if (!summary) {
    throw new Error("请输入精选作品简介。");
  }
  if (!imageUrl) {
    throw new Error("请输入精选作品图片地址。");
  }
  if (!promptZh) {
    throw new Error("请输入可复用的中文提示词。");
  }

  const data = {
    title,
    summary,
    imageUrl,
    thumbnailUrl: normalizeOptionalText(input.thumbnailUrl, 1200),
    ratio: normalizeRatio(input.ratio),
    category,
    tags: serializeTags(input.tags),
    promptZh,
    promptEn: normalizeOptionalText(input.promptEn, 4000),
    negativePrompt: normalizeOptionalText(input.negativePrompt, 2000),
    authorName: normalizeText(input.authorName).slice(0, 80) || "造图台",
    sourceName: normalizeOptionalText(input.sourceName, 120),
    sourceUrl: normalizeOptionalText(input.sourceUrl, 1200),
    sortOrder,
    isActive: input.isActive ?? true,
    isDeleted: false,
    takenDownAt: input.isActive === false ? new Date() : null,
    takenDownReason: input.isActive === false ? "运营暂不展示" : null,
    publishedAt: input.isActive === false ? null : new Date(),
  };

  const image = input.id
    ? await prisma.curatedGalleryImage.update({
        where: {
          id: input.id,
        },
        data,
      })
    : await prisma.curatedGalleryImage.create({
        data,
      });

  return toAdminCuratedGalleryImageView(image);
}

export async function takeDownCuratedGalleryImageByAdmin(imageId: string, reason?: string) {
  const image = await prisma.curatedGalleryImage.findUnique({
    where: {
      id: imageId,
    },
  });

  if (!image) {
    throw new Error("没有找到要下架的运营精选作品。");
  }

  const updated = await prisma.curatedGalleryImage.update({
    where: {
      id: imageId,
    },
    data: {
      isActive: false,
      takenDownAt: new Date(),
      takenDownReason: normalizeText(reason) || "管理员下架",
    },
  });

  return toAdminCuratedGalleryImageView(updated);
}

export async function deleteCuratedGalleryImageByAdmin(imageId: string) {
  const image = await prisma.curatedGalleryImage.findUnique({
    where: {
      id: imageId,
    },
  });

  if (!image) {
    throw new Error("没有找到要删除的运营精选作品。");
  }

  const updated = await prisma.curatedGalleryImage.update({
    where: {
      id: imageId,
    },
    data: {
      isDeleted: true,
      isActive: false,
      takenDownAt: new Date(),
      takenDownReason: image.takenDownReason || "管理员删除",
    },
  });

  return toAdminCuratedGalleryImageView(updated);
}

export async function publishGeneratedImage(userId: string, imageId: string) {
  const image = await prisma.generatedImage.findFirst({
    where: {
      id: imageId,
      isDeleted: false,
      job: {
        is: {
          userId,
          status: "COMPLETED",
        },
      },
    },
  });

  if (!image) {
    throw new Error("没有找到可发布的图片。");
  }

  if (image.takenDownAt) {
    throw new Error("该作品已被后台下架，不能重新发布。");
  }

  const updated = await prisma.generatedImage.update({
    where: {
      id: imageId,
    },
    data: {
      isPublic: true,
      publishedAt: image.publishedAt || new Date(),
    },
    include: galleryInclude,
  });

  return toGalleryImageView(updated);
}

export async function unpublishGeneratedImage(userId: string, imageId: string) {
  const image = await prisma.generatedImage.findFirst({
    where: {
      id: imageId,
      job: {
        is: {
          userId,
        },
      },
    },
  });

  if (!image) {
    throw new Error("没有找到可取消发布的图片。");
  }

  const updated = await prisma.generatedImage.update({
    where: {
      id: imageId,
    },
    data: {
      isPublic: false,
    },
    include: galleryInclude,
  });

  return toGalleryImageView(updated);
}

export async function softDeleteGeneratedImage(userId: string, imageId: string) {
  const image = await prisma.generatedImage.findFirst({
    where: {
      id: imageId,
      job: {
        is: {
          userId,
        },
      },
    },
  });

  if (!image) {
    throw new Error("没有找到可删除的图片。");
  }

  const updated = await prisma.generatedImage.update({
    where: {
      id: imageId,
    },
    data: {
      isDeleted: true,
      isPublic: false,
    },
    include: galleryInclude,
  });

  return toGalleryImageView(updated);
}

export async function takeDownGalleryImageByAdmin(imageId: string, reason?: string) {
  const image = await prisma.generatedImage.findUnique({
    where: {
      id: imageId,
    },
  });

  if (!image) {
    throw new Error("没有找到要下架的作品。");
  }

  const updated = await prisma.generatedImage.update({
    where: {
      id: imageId,
    },
    data: {
      isPublic: false,
      takenDownAt: new Date(),
      takenDownReason: normalizeText(reason) || "管理员下架",
    },
    include: galleryInclude,
  });

  return toAdminGalleryImageView(updated);
}
