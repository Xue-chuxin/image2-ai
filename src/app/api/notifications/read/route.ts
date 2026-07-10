import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { markAllNotificationsRead, markNotificationRead } from "@/lib/notifications";

export const runtime = "nodejs";

type MarkReadPayload = {
  id?: string;
  all?: boolean;
};

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const payload = (await request.json().catch(() => null)) as MarkReadPayload | null;

  try {
    if (payload?.all) {
      const count = await markAllNotificationsRead(session.userId);
      return NextResponse.json({ ok: true, count });
    }

    if (!payload?.id) {
      return NextResponse.json({ ok: false, error: "缺少通知标识。" }, { status: 400 });
    }

    await markNotificationRead(session.userId, payload.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error, "更新通知状态失败。");
  }
}
