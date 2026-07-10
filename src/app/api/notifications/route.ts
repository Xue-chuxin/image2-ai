import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { getUnreadCount, listNotifications } from "@/lib/notifications";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const unreadOnly = searchParams.get("unreadOnly") === "1";

  try {
    const [notifications, unreadCount] = await Promise.all([
      listNotifications(session.userId, { unreadOnly }),
      getUnreadCount(session.userId),
    ]);
    return NextResponse.json({ ok: true, notifications, unreadCount });
  } catch (error) {
    return jsonError(error, "读取通知失败。");
  }
}
