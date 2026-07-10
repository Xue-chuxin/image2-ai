import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { getAdminSession, getUserSession } from "@/lib/auth";
import { getStorageRuntimeConfig, type StorageRuntimeConfig } from "@/lib/settings";
import { getS3Object } from "@/lib/storage-s3";

const contentTypes: Record<string, string> = {
  ".avif": "image/avif",
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
};

function getContentType(filePath: string) {
  return contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream";
}

const NO_STORE = "private, no-store";

type StoragePolicy = {
  kind: "generated" | "reference-upload" | "payment-proof" | "other";
  cacheControl: string;
  sensitive: boolean;
};

/**
 * 依据存储前缀决定缓存与敏感级别。前缀取自运行时配置（可含多级），不硬编码。
 * - 支付凭证：私有、不缓存，需会话鉴权。
 * - 参考图：文件名带时间戳+随机段，永不覆盖，可长缓存 immutable。
 * - 生成图：文件名已随机化（见 storage.saveGeneratedImage），内容不可变，可长缓存 immutable。
 */
function resolveStoragePolicy(segments: string[], config: StorageRuntimeConfig): StoragePolicy {
  const joined = `${segments.join("/")}/`;
  const paymentsPrefix = `${config.uploadsPrefix}/payments/`;
  const referencePrefix = `${config.uploadsPrefix}/reference/`;
  const generatedPrefix = `${config.generatedPrefix}/`;

  if (joined.startsWith(paymentsPrefix)) {
    return { kind: "payment-proof", cacheControl: NO_STORE, sensitive: true };
  }
  if (joined.startsWith(referencePrefix)) {
    return { kind: "reference-upload", cacheControl: "public, max-age=31536000, immutable", sensitive: false };
  }
  if (joined.startsWith(generatedPrefix)) {
    return { kind: "generated", cacheControl: "public, max-age=31536000, immutable", sensitive: false };
  }
  return { kind: "other", cacheControl: "public, max-age=0, must-revalidate", sensitive: false };
}

function resolveStorageFile(localBaseDir: string, segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }

  const baseDir = path.resolve(localBaseDir);
  const filePath = path.resolve(baseDir, ...segments);
  const insideBaseDir = filePath === baseDir || filePath.startsWith(`${baseDir}${path.sep}`);

  return insideBaseDir ? { baseDir, filePath } : null;
}

/** 校验路径段并拼成对象存储 Key（拒绝空段与穿越段）。 */
function resolveObjectStorageKey(segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("\\"))) {
    return null;
  }

  return segments.join("/");
}

function jsonNoStore(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { "Cache-Control": NO_STORE } });
}

/** 支付凭证鉴权：管理员或"文件名以本人 userId 开头"的用户可读，否则视为不存在（防探测）。 */
async function canAccessPaymentProof(filename: string) {
  const [admin, user] = await Promise.all([getAdminSession(), getUserSession()]);
  if (admin) {
    return true;
  }
  if (!user) {
    return false;
  }
  const sanitizedUserId = user.userId.replace(/[^a-zA-Z0-9_-]/g, "");
  // savePaymentProof 的 ownerId = `${userId}-${orderId}`，文件名以该 ownerId 开头。
  return sanitizedUserId.length > 0 && filename.startsWith(`${sanitizedUserId}-`);
}

/** 对象存储回源：主要用于 payment-proof 等私有文件（公开文件走直链，不经此路由）。 */
async function serveObjectStorageFile(request: Request, config: StorageRuntimeConfig, segments: string[], policy: StoragePolicy) {
  const key = resolveObjectStorageKey(segments);
  if (!key) {
    return jsonNoStore({ ok: false, error: "文件路径无效。" }, 400);
  }

  let object;
  try {
    object = await getS3Object(config, key);
  } catch {
    return jsonNoStore({ ok: false, error: "文件读取失败。" }, 502);
  }

  if (!object) {
    return jsonNoStore({ ok: false, error: "文件不存在。" }, 404);
  }

  const contentLength = object.contentLength ?? object.body.byteLength;
  const lastModified = object.lastModified?.toUTCString();

  // 条件请求：非敏感文件参与协商缓存（敏感文件 no-store，不参与）。
  if (!policy.sensitive && object.etag) {
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch && ifNoneMatch === object.etag) {
      return new Response(null, {
        status: 304,
        headers: {
          "Cache-Control": policy.cacheControl,
          ETag: object.etag,
          ...(lastModified ? { "Last-Modified": lastModified } : {}),
        },
      });
    }
  }

  const headers = new Headers({
    "Cache-Control": policy.cacheControl,
    "Content-Length": String(contentLength),
    "Content-Type": object.contentType || getContentType(key),
  });
  if (lastModified) {
    headers.set("Last-Modified", lastModified);
  }
  if (!policy.sensitive && object.etag) {
    headers.set("ETag", object.etag);
  }

  if (request.method === "HEAD") {
    return new Response(null, { headers });
  }

  return new Response(new Uint8Array(object.body), { headers });
}

async function serveStorageFile(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const config = await getStorageRuntimeConfig();

  const { path: requestedPath } = await params;
  const policy = resolveStoragePolicy(requestedPath, config);

  if (policy.sensitive) {
    const filename = requestedPath[requestedPath.length - 1] || "";
    const allowed = await canAccessPaymentProof(filename);
    if (!allowed) {
      return jsonNoStore({ ok: false, error: "文件不存在。" }, 404);
    }
  }

  if (config.provider !== "local") {
    return serveObjectStorageFile(request, config, requestedPath, policy);
  }

  const resolved = resolveStorageFile(config.localBaseDir, requestedPath);

  if (!resolved) {
    return jsonNoStore({ ok: false, error: "文件路径无效。" }, 400);
  }

  try {
    const fileStat = await stat(resolved.filePath);
    if (!fileStat.isFile()) {
      return jsonNoStore({ ok: false, error: "文件不存在。" }, 404);
    }

    const mtimeSeconds = Math.floor(fileStat.mtime.getTime() / 1000);
    const etag = `W/"${fileStat.size}-${mtimeSeconds}"`;
    const lastModified = fileStat.mtime.toUTCString();

    // 条件请求：敏感文件不参与协商缓存（no-store）。
    if (!policy.sensitive) {
      const ifNoneMatch = request.headers.get("if-none-match");
      const ifModifiedSince = request.headers.get("if-modified-since");
      const notModified =
        (ifNoneMatch && ifNoneMatch === etag) ||
        (!ifNoneMatch && ifModifiedSince && Math.floor(new Date(ifModifiedSince).getTime() / 1000) >= mtimeSeconds);
      if (notModified) {
        return new Response(null, {
          status: 304,
          headers: {
            "Cache-Control": policy.cacheControl,
            ETag: etag,
            "Last-Modified": lastModified,
          },
        });
      }
    }

    const headers = new Headers({
      "Cache-Control": policy.cacheControl,
      "Content-Length": String(fileStat.size),
      "Content-Type": getContentType(resolved.filePath),
      "Last-Modified": lastModified,
    });
    if (!policy.sensitive) {
      headers.set("ETag", etag);
    }

    if (request.method === "HEAD") {
      return new Response(null, { headers });
    }

    const file = await readFile(resolved.filePath);
    return new Response(new Uint8Array(file), { headers });
  } catch {
    return jsonNoStore({ ok: false, error: "文件不存在。" }, 404);
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serveStorageFile(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serveStorageFile(request, context);
}
