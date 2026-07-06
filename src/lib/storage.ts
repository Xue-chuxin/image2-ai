import { randomBytes } from "crypto";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import sharp from "sharp";

import { AppError } from "@/lib/app-error";
import { getStorageRuntimeConfig, type StorageProviderName, type StorageRuntimeConfig } from "@/lib/settings";

export type StoredImage = {
  url: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  fileSize?: number;
  mimeType?: string;
};

export type StorageSaveInput = {
  namespace: "generated" | "reference" | "payment-proof";
  ownerId: string;
  buffer: Buffer;
  mimeType: string;
  filename?: string;
};

export interface StorageService {
  provider: StorageProviderName;
  save(input: StorageSaveInput): Promise<StoredImage>;
}

const THUMBNAIL_MAX_SIZE = 360;

function extensionFromMime(mimeType: string) {
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) {
    return "jpg";
  }
  if (mimeType.includes("webp")) {
    return "webp";
  }
  return "png";
}

function sanitizeSegment(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "");
}

function joinUrl(baseUrl: string, ...segments: string[]) {
  const pathValue = segments
    .map((segment) => segment.replace(/^\/+|\/+$/g, ""))
    .filter(Boolean)
    .join("/");

  if (!baseUrl) {
    return `/${pathValue}`;
  }

  return `${baseUrl.replace(/\/+$/, "")}/${pathValue}`;
}

function getLocalPublicUrlPrefix(config: StorageRuntimeConfig) {
  if (config.publicBaseUrl) {
    return "";
  }

  const publicDir = path.resolve(process.cwd(), "public");
  const localBaseDir = path.resolve(config.localBaseDir);
  const relativePath = path.relative(publicDir, localBaseDir).replace(/\\/g, "/");

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    return "";
  }

  return relativePath.replace(/^\/+|\/+$/g, "");
}

function getNamespacePrefix(config: StorageRuntimeConfig, namespace: StorageSaveInput["namespace"]) {
  if (namespace === "generated") {
    return config.generatedPrefix;
  }

  if (namespace === "reference") {
    return `${config.uploadsPrefix}/reference`;
  }

  return `${config.uploadsPrefix}/payments`;
}

function createGeneratedFilename(ownerId: string, requestedFilename: string | undefined, mimeType: string) {
  if (requestedFilename) {
    return requestedFilename;
  }

  return `${sanitizeSegment(ownerId)}-${Date.now()}-${randomBytes(6).toString("hex")}.${extensionFromMime(mimeType)}`;
}

function assertLocalStorage(config: StorageRuntimeConfig) {
  if (config.provider !== "local") {
    throw new AppError("PROVIDER_CONFIG", `当前版本仅实现 local 存储，${config.provider} 已预留配置但尚未接入对象存储 SDK。`, 500);
  }
}

async function inspectImage(buffer: Buffer) {
  try {
    const metadata = await sharp(buffer, { failOn: "none" }).metadata();
    return {
      width: metadata.width,
      height: metadata.height,
    };
  } catch {
    return {
      width: undefined,
      height: undefined,
    };
  }
}

async function createThumbnail(buffer: Buffer) {
  try {
    return await sharp(buffer, { failOn: "none" })
      .rotate()
      .resize({
        width: THUMBNAIL_MAX_SIZE,
        height: THUMBNAIL_MAX_SIZE,
        fit: "inside",
        withoutEnlargement: true,
      })
      .toBuffer();
  } catch {
    return buffer;
  }
}

export function createLocalStorageService(config: StorageRuntimeConfig): StorageService {
  return {
    provider: "local",
    async save(input: StorageSaveInput): Promise<StoredImage> {
      assertLocalStorage(config);

      const filename = createGeneratedFilename(input.ownerId, input.filename, input.mimeType);
      const namespacePrefix = getNamespacePrefix(config, input.namespace);
      const directory = path.join(config.localBaseDir, namespacePrefix);
      const thumbnailDirectory = path.join(directory, "thumbs");

      await mkdir(directory, { recursive: true });
      await writeFile(path.join(directory, filename), input.buffer);

      const metadata = await inspectImage(input.buffer);
      const publicUrlPrefix = getLocalPublicUrlPrefix(config);

      if (input.namespace !== "payment-proof") {
        await mkdir(thumbnailDirectory, { recursive: true });
        await writeFile(path.join(thumbnailDirectory, filename), await createThumbnail(input.buffer));
      }

      return {
        url: joinUrl(config.publicBaseUrl, publicUrlPrefix, namespacePrefix, filename),
        thumbnailUrl: input.namespace === "payment-proof" ? undefined : joinUrl(config.publicBaseUrl, publicUrlPrefix, namespacePrefix, "thumbs", filename),
        width: metadata.width,
        height: metadata.height,
        fileSize: input.buffer.byteLength,
        mimeType: input.mimeType,
      };
    },
  };
}

export function createStorageService(config: StorageRuntimeConfig): StorageService {
  if (config.provider === "local") {
    return createLocalStorageService(config);
  }

  return {
    provider: config.provider,
    async save() {
      throw new AppError("PROVIDER_CONFIG", `当前版本仅实现 local 存储，${config.provider} 已预留配置但尚未接入对象存储 SDK。`, 500);
    },
  };
}

export async function getStorageService() {
  return createStorageService(await getStorageRuntimeConfig());
}

export async function saveGeneratedImage(jobId: string, index: number, buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const service = await getStorageService();
  const extension = extensionFromMime(mimeType);

  // 文件名加随机段：任务重试不再同名覆盖旧文件，URL 变为内容不可变，可安全长缓存（见 storage 回源路由）。
  return service.save({
    namespace: "generated",
    ownerId: jobId,
    buffer,
    mimeType,
    filename: `${sanitizeSegment(jobId)}-${index + 1}-${randomBytes(4).toString("hex")}.${extension}`,
  });
}

export async function saveReferenceImage(userId: string, buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const service = await getStorageService();

  return service.save({
    namespace: "reference",
    ownerId: userId,
    buffer,
    mimeType,
  });
}

export async function savePaymentProof(userId: string, orderId: string, buffer: Buffer, mimeType: string): Promise<StoredImage> {
  const service = await getStorageService();

  return service.save({
    namespace: "payment-proof",
    ownerId: `${userId}-${orderId}`,
    buffer,
    mimeType,
  });
}
