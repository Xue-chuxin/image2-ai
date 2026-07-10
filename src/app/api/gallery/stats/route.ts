import { NextResponse } from "next/server";

import { getAppErrorMessage } from "@/lib/app-error";
import type { GalleryImageRef, GallerySourceType } from "@/lib/gallery";
import { getGalleryStats } from "@/lib/gallery-social";

const SOURCE_TYPES: GallerySourceType[] = ["generated", "curated"];

// 解析 ?refs=generated:a,curated:b，最多 120 条，忽略非法项。
function parseRefs(raw: string | null): GalleryImageRef[] {
  if (!raw) {
    return [];
  }
  const refs: GalleryImageRef[] = [];
  const seen = new Set<string>();
  for (const part of raw.split(",")) {
    const [sourceType, imageId] = part.split(":");
    const source = (sourceType || "").trim();
    const id = (imageId || "").trim();
    if (!SOURCE_TYPES.includes(source as GallerySourceType) || !id || id.length > 64) {
      continue;
    }
    const key = `${source}:${id}`;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    refs.push({ sourceType: source as GallerySourceType, imageId: id });
    if (refs.length >= 120) {
      break;
    }
  }
  return refs;
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const refs = parseRefs(searchParams.get("refs"));
    const stats = await getGalleryStats(refs);
    return NextResponse.json({ ok: true, stats });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取互动数据失败") },
      { status: 400 },
    );
  }
}
