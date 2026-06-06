import { prisma } from "@/lib/db";
import { IMAGE_GALLERY_CATEGORIES } from "@/lib/image-categories";

export const GALLERY_CATEGORIES = [...IMAGE_GALLERY_CATEGORIES];

export type GalleryImageView = {
  id: string;
  jobId: string;
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
  authorName: string;
  authorEmail: string | null;
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

type GalleryQuery = {
  q?: string | null;
  category?: string | null;
  status?: string | null;
  limit?: number;
};

function normalizeLimit(limit?: number) {
  if (!Number.isFinite(limit)) {
    return 48;
  }

  return Math.min(Math.max(Math.floor(Number(limit)), 1), 120);
}

function normalizeText(value?: string | null) {
  return value?.trim() || "";
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

  return {
    id: image.id,
    jobId: image.jobId,
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
    category: inferGalleryCategory(promptZh, promptEn, negativePrompt),
    authorName,
    authorEmail: image.job?.user?.email || null,
    isPublic: Boolean(image.isPublic),
    isDeleted: Boolean(image.isDeleted),
    publishedAt: image.publishedAt ? image.publishedAt.toISOString() : null,
    takenDownAt: image.takenDownAt ? image.takenDownAt.toISOString() : null,
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

  const images = await prisma.generatedImage.findMany({
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
    take: cleanCategory && cleanCategory !== "全部" ? cleanLimit * 3 : cleanLimit,
  });

  const views = images.map(toGalleryImageView);
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
