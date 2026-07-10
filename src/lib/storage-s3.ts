import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type S3ClientConfig,
} from "@aws-sdk/client-s3";

import { AppError } from "@/lib/app-error";
import type { StorageRuntimeConfig } from "@/lib/settings";

export type S3ObjectData = {
  body: Buffer;
  contentType?: string;
  contentLength?: number;
  etag?: string;
  lastModified?: Date;
};

// 单进程内按配置指纹缓存 S3 客户端，配置变化时自动重建。
let cachedClient: { fingerprint: string; client: S3Client } | null = null;

function assertObjectStorageConfig(config: StorageRuntimeConfig) {
  if (!config.bucket) {
    throw new AppError("PROVIDER_CONFIG", "未配置对象存储 Bucket，无法使用对象存储。", 500);
  }
  if (!config.accessKeyId || !config.secretAccessKey) {
    throw new AppError("PROVIDER_CONFIG", "未配置对象存储 AccessKey / SecretKey，无法使用对象存储。", 500);
  }
}

function configFingerprint(config: StorageRuntimeConfig) {
  return [config.endpoint, config.region, config.bucket, config.accessKeyId, config.secretAccessKey, config.forcePathStyle].join("|");
}

export function getS3Client(config: StorageRuntimeConfig): S3Client {
  assertObjectStorageConfig(config);

  const fingerprint = configFingerprint(config);
  if (cachedClient && cachedClient.fingerprint === fingerprint) {
    return cachedClient.client;
  }

  const clientConfig: S3ClientConfig = {
    region: config.region || "us-east-1",
    credentials: {
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
    },
    // 自定义 endpoint（OSS/COS/MinIO 等）通常需要路径风格寻址；显式开关优先。
    forcePathStyle: config.forcePathStyle || Boolean(config.endpoint),
  };
  if (config.endpoint) {
    clientConfig.endpoint = config.endpoint;
  }

  const client = new S3Client(clientConfig);
  cachedClient = { fingerprint, client };
  return client;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/+$/, "");
}

/**
 * 构造对象的公开访问 URL（用于 generated / reference 这类可公开直链的命名空间）。
 * 优先使用配置的公开访问域名（CDN / 自定义域名）；否则按 endpoint / AWS 默认域名兜底。
 */
export function buildS3PublicUrl(config: StorageRuntimeConfig, key: string): string {
  if (config.publicBaseUrl) {
    return `${trimTrailingSlash(config.publicBaseUrl)}/${key}`;
  }

  if (config.endpoint) {
    const host = trimTrailingSlash(config.endpoint);
    if (config.forcePathStyle) {
      return `${host}/${config.bucket}/${key}`;
    }
    // 虚拟主机风格：把 bucket 拼到 host 前缀。
    const schemeMatch = host.match(/^(https?:\/\/)(.*)$/i);
    if (schemeMatch) {
      return `${schemeMatch[1]}${config.bucket}.${schemeMatch[2]}/${key}`;
    }
    return `${host}/${config.bucket}/${key}`;
  }

  const region = config.region || "us-east-1";
  return `https://${config.bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function putS3Object(
  config: StorageRuntimeConfig,
  key: string,
  body: Buffer,
  contentType: string | undefined,
  cacheControl: string | undefined,
): Promise<void> {
  await getS3Client(config).send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
      CacheControl: cacheControl,
    }),
  );
}

function isNotFoundError(error: unknown): boolean {
  const meta = (error as { $metadata?: { httpStatusCode?: number }; name?: string }) || {};
  return meta.$metadata?.httpStatusCode === 404 || meta.name === "NoSuchKey" || meta.name === "NotFound";
}

export async function getS3Object(config: StorageRuntimeConfig, key: string): Promise<S3ObjectData | null> {
  try {
    const response = await getS3Client(config).send(
      new GetObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );

    const bytes = await response.Body?.transformToByteArray();
    if (!bytes) {
      return null;
    }

    return {
      body: Buffer.from(bytes),
      contentType: response.ContentType,
      contentLength: response.ContentLength,
      etag: response.ETag,
      lastModified: response.LastModified,
    };
  } catch (error) {
    if (isNotFoundError(error)) {
      return null;
    }
    throw error;
  }
}

/** 删除对象，忽略「不存在」错误（清理场景幂等）。 */
export async function deleteS3Object(config: StorageRuntimeConfig, key: string): Promise<void> {
  try {
    await getS3Client(config).send(
      new DeleteObjectCommand({
        Bucket: config.bucket,
        Key: key,
      }),
    );
  } catch (error) {
    if (isNotFoundError(error)) {
      return;
    }
    throw error;
  }
}
