import { readFile, stat } from "fs/promises";
import path from "path";
import { NextResponse } from "next/server";

import { getStorageRuntimeConfig } from "@/lib/settings";

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

function resolveStorageFile(localBaseDir: string, segments: string[]) {
  if (!segments.length || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.includes("/") || segment.includes("\\"))) {
    return null;
  }

  const baseDir = path.resolve(localBaseDir);
  const filePath = path.resolve(baseDir, ...segments);
  const insideBaseDir = filePath === baseDir || filePath.startsWith(`${baseDir}${path.sep}`);

  return insideBaseDir ? { baseDir, filePath } : null;
}

async function serveStorageFile(request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const config = await getStorageRuntimeConfig();

  if (config.provider !== "local") {
    return NextResponse.json({ ok: false, error: "当前存储不是本地存储。" }, { status: 404 });
  }

  const { path: requestedPath } = await params;
  const resolved = resolveStorageFile(config.localBaseDir, requestedPath);

  if (!resolved) {
    return NextResponse.json({ ok: false, error: "文件路径无效。" }, { status: 400 });
  }

  try {
    const fileStat = await stat(resolved.filePath);
    if (!fileStat.isFile()) {
      return NextResponse.json({ ok: false, error: "文件不存在。" }, { status: 404 });
    }

    const headers = new Headers({
      "Accept-Ranges": "bytes",
      "Cache-Control": "public, max-age=0, must-revalidate",
      "Content-Length": String(fileStat.size),
      "Content-Type": getContentType(resolved.filePath),
      "Last-Modified": fileStat.mtime.toUTCString(),
    });

    if (request.method === "HEAD") {
      return new Response(null, { headers });
    }

    const file = await readFile(resolved.filePath);
    return new Response(new Uint8Array(file), { headers });
  } catch {
    return NextResponse.json({ ok: false, error: "文件不存在。" }, { status: 404 });
  }
}

export async function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serveStorageFile(request, context);
}

export async function HEAD(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return serveStorageFile(request, context);
}
