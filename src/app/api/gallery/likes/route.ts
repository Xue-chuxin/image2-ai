import { NextResponse } from "next/server";

import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { listUserLikeKeys, toggleLike } from "@/lib/gallery-social";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再查看点赞。" }, { status: 401 });
  }

  try {
    const keys = await listUserLikeKeys(session.userId);
    return NextResponse.json({ ok: true, keys });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取点赞失败") },
      { status: 400 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再点赞。" }, { status: 401 });
  }

  try {
    const payload = (await request.json().catch(() => null)) as
      | { sourceType?: unknown; imageId?: unknown }
      | null;
    const result = await toggleLike(session.userId, payload?.sourceType, payload?.imageId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "点赞操作失败") },
      { status: getAppErrorStatus(error, 400) },
    );
  }
}
