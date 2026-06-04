import { prisma } from "@/lib/db";
import { saveReferenceImage } from "@/lib/storage";

export const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
export const MAX_REFERENCE_IMAGES_PER_JOB = 4;
const ALLOWED_REFERENCE_MIME_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

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

export async function createUploadedReferenceImage({
  userId,
  buffer,
  mimeType,
}: {
  userId: string;
  buffer: Buffer;
  mimeType: string;
}) {
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
