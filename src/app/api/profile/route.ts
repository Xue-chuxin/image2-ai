import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { getUserProfile, updateDisplayName } from "@/lib/profile";

export const runtime = "nodejs";

type UpdateProfilePayload = {
  displayName?: string | null;
};

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  try {
    const profile = await getUserProfile(session.userId);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return jsonError(error, "读取资料失败。");
  }
}

export async function PATCH(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as UpdateProfilePayload | null;

  try {
    const profile = await updateDisplayName(session.userId, payload?.displayName);
    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return jsonError(error, "更新资料失败。");
  }
}
