import { NextResponse } from "next/server";

import { getAppErrorMessage } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import {
  listUserFavoriteImages,
  listUserFavoriteKeys,
  toggleFavorite,
} from "@/lib/favorites";

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再查看收藏。" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    // ?keys=1 只返回收藏键集合，供前台高亮心形；否则返回收藏作品详情列表。
    if (searchParams.get("keys") === "1") {
      const keys = await listUserFavoriteKeys(session.userId);
      return NextResponse.json({ ok: true, keys });
    }

    const images = await listUserFavoriteImages(session.userId, { limit: 60 });
    return NextResponse.json({ ok: true, images });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取收藏失败") },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再收藏作品。" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { sourceType?: unknown; imageId?: unknown }
      | null;
    const result = await toggleFavorite(session.userId, payload?.sourceType, payload?.imageId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "收藏操作失败") },
      { status: 400 },
    );
  }
}
