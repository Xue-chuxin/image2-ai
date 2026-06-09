import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminCuratedGalleryImages, upsertCuratedGalleryImage } from "@/lib/gallery";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const status = searchParams.get("status");
  const limit = Number(searchParams.get("limit") || 80);

  try {
    const images = await listAdminCuratedGalleryImages({
      q,
      status,
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
        error: error instanceof Error ? error.message : "读取运营精选失败",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const image = await upsertCuratedGalleryImage(body as Parameters<typeof upsertCuratedGalleryImage>[0]);

    return NextResponse.json({
      ok: true,
      image,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "保存运营精选失败",
      },
      {
        status: 400,
      },
    );
  }
}
