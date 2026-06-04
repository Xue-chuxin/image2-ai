import { NextResponse } from "next/server";

import { listPublicGalleryImages } from "@/lib/gallery";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const category = searchParams.get("category");
  const limit = Number(searchParams.get("limit") || 48);

  try {
    const images = await listPublicGalleryImages({
      q,
      category,
      limit,
    });

    return NextResponse.json({
      ok: true,
      images,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取作品广场失败",
      },
      {
        status: 500,
      },
    );
  }
}
