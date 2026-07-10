import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { listUserPromptFavoriteIds, togglePromptFavorite } from "@/lib/prompts";

export const runtime = "nodejs";

type TogglePayload = {
  promptId?: string;
};

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: true, ids: [] });
  }

  try {
    const ids = await listUserPromptFavoriteIds(session.userId);
    return NextResponse.json({ ok: true, ids });
  } catch (error) {
    return jsonError(error, "读取收藏失败。");
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再收藏提示词。" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as TogglePayload | null;

  try {
    const result = await togglePromptFavorite(session.userId, payload?.promptId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, "收藏操作失败。");
  }
}
