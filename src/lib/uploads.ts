import sharp from "sharp";

import { prisma } from "@/lib/db";
import { deleteReferenceImageFiles, saveReferenceImage } from "@/lib/storage";

export const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES_PER_JOB = 4;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

// sharp 探测出的真实格式 → 白名单 MIME。用于以文件内容为准，而非客户端声明的 Content-Type。
const SHARP_FORMAT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpeg: "image/jpeg",
  jpg: "image/jpeg",
  webp: "image/webp",
};

export type UploadedReferenceImageView = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  purpose: string;
  isDeleted: boolean;
  createdAt: string;
};

export type AdminUploadedImageView = UploadedReferenceImageView & {
  userId: string;
  userEmail: string | null;
  userDisplayName: string | null;
};

function serializeUploadedImage(image: any): UploadedReferenceImageView {
  return {
    id: image.id,
    url: image.url,
    thumbnailUrl: image.thumbnailUrl,
    mimeType: image.mimeType,
    fileSize: image.fileSize,
    width: image.width,
    height: image.height,
    purpose: image.purpose,
    isDeleted: Boolean(image.isDeleted),
    createdAt: image.createdAt.toISOString(),
  };
}

function serializeAdminUploadedImage(image: any): AdminUploadedImageView {
  return {
    ...serializeUploadedImage(image),
    userId: image.userId,
    userEmail: image.user?.email || null,
    userDisplayName: image.user?.displayName || null,
  };
}

function normalizeQuery(value?: string | null) {
  return value?.trim() || "";
}

function normalizeLimit(value?: number) {
  if (!Number.isFinite(value)) {
    return 80;
  }

  return Math.min(Math.max(Math.floor(Number(value)), 1), 160);
}

export function assertReferenceImageUploadAllowed(mimeType: string, fileSize: number) {
  if (!ALLOWED_REFERENCE_MIME_TYPES.has(mimeType)) {
    throw new Error("只支持 PNG、JPG、WEBP 图片。");
  }

  if (fileSize <= 0) {
    throw new Error("图片文件为空。");
  }

  if (fileSize > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("参考图不能超过 8MB。");
  }
}

/**
 * 读取 buffer 的真实图片格式（magic bytes），映射回白名单 MIME。
 * 与客户端声明的 Content-Type 无关：伪造 Content-Type 的非图片文件在此被拒。
 */
async function detectReferenceImageMimeType(buffer: Buffer): Promise<string> {
  let format: string | undefined;
  try {
    format = (await sharp(buffer).metadata()).format;
  } catch {
    throw new Error("无法识别的图片文件，请上传有效的 PNG、JPG、WEBP 图片。");
  }

  const mimeType = format ? SHARP_FORMAT_TO_MIME[format] : undefined;
  if (!mimeType) {
    throw new Error("只支持 PNG、JPG、WEBP 图片。");
  }

  return mimeType;
}

export async function createUploadedReferenceImage({
  userId,
  buffer,
}: {
  userId: string;
  buffer: Buffer;
}) {
  if (buffer.byteLength <= 0) {
    throw new Error("图片文件为空。");
  }

  if (buffer.byteLength > MAX_REFERENCE_IMAGE_BYTES) {
    throw new Error("参考图不能超过 8MB。");
  }

  // 以文件真实内容为准，忽略客户端声明的 MIME，避免伪造 Content-Type 上传非图片。
  const mimeType = await detectReferenceImageMimeType(buffer);
  assertReferenceImageUploadAllowed(mimeType, buffer.byteLength);

  const stored = await saveReferenceImage(userId, buffer, mimeType);
  const image = await prisma.uploadedImage.create({
    data: {
      userId,
      url: stored.url,
      thumbnailUrl: stored.thumbnailUrl,
      mimeType,
      fileSize: stored.fileSize || buffer.byteLength,
      width: stored.width,
      height: stored.height,
      purpose: "reference",
    },
  });

  return serializeUploadedImage(image);
}

const REFERENCE_IMAGE_PURGE_BATCH = 200;
const PURGE_THROTTLE_MS = 60 * 60 * 1000;
let lastPurgeAt = 0;

/**
 * 软删除超过 retentionDays 天、且未被任何生成任务引用的参考图，并删除其磁盘文件。
 * 被任务引用的参考图不会被清理（保留可追溯的「再次生成」回填能力）。
 */
export async function purgeExpiredReferenceImages(retentionDays: number): Promise<{ removed: number }> {
  const days = Number.isFinite(retentionDays) ? Math.max(Math.floor(retentionDays), 1) : 30;
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  const candidates = await prisma.uploadedImage.findMany({
    where: {
      purpose: "reference",
      isDeleted: false,
      createdAt: { lt: cutoff },
      jobReferences: { none: {} },
    },
    take: REFERENCE_IMAGE_PURGE_BATCH,
  });

  let removed = 0;
  for (const image of candidates) {
    await deleteReferenceImageFiles(image.url, image.thumbnailUrl);
    await prisma.uploadedImage.update({
      where: { id: image.id },
      data: { isDeleted: true },
    });
    removed += 1;
  }

  return { removed };
}

/**
 * 惰性触发一次过期参考图清理，带进程内节流（默认 1 小时最多一次），fire-and-forget。
 * 适合在上传接口成功后调用，无需额外后台进程；多实例部署可另配 cron 调用 purge。
 */
export function maybePurgeExpiredReferenceImages(retentionDays: number): void {
  const now = Date.now();
  if (now - lastPurgeAt < PURGE_THROTTLE_MS) {
    return;
  }
  lastPurgeAt = now;

  purgeExpiredReferenceImages(retentionDays).catch((error) => {
    console.error("[uploads] 清理过期参考图失败", error);
  });
}

export async function resolveReferenceImagesForJob(userId: string, imageIds?: string[]) {
  const ids = Array.from(new Set((imageIds || []).map((id) => id.trim()).filter(Boolean)));

  if (!ids.length) {
    return [];
  }

  if (ids.length > MAX_REFERENCE_IMAGES_PER_JOB) {
    throw new Error(`一次最多只能使用 ${MAX_REFERENCE_IMAGES_PER_JOB} 张参考图。`);
  }

  const images = await prisma.uploadedImage.findMany({
    where: {
      userId,
      id: {
        in: ids,
      },
      purpose: "reference",
      isDeleted: false,
    },
  });

  if (images.length !== ids.length) {
    throw new Error("部分参考图不存在，或不属于当前用户。");
  }

  const imageById = new Map(images.map((image) => [image.id, image]));
  return ids.map((id) => imageById.get(id)!);
}

export async function listAdminUploadedImages({
  q,
  limit,
}: {
  q?: string | null;
  limit?: number;
} = {}): Promise<AdminUploadedImageView[]> {
  const cleanQuery = normalizeQuery(q);
  const cleanLimit = normalizeLimit(limit);

  const images = await prisma.uploadedImage.findMany({
    where: {
      ...(cleanQuery
        ? {
            OR: [
              {
                id: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                url: {
                  contains: cleanQuery,
                  mode: "insensitive",
                },
              },
              {
                user: {
                  is: {
                    email: {
                      contains: cleanQuery,
                      mode: "insensitive",
                    },
                  },
                },
              },
            ],
          }
        : {}),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          displayName: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: cleanLimit,
  });

  return images.map(serializeAdminUploadedImage);
}
