import { NextResponse } from "next/server";

import { getAppErrorMessage } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { getInviteSummary } from "@/lib/invite";

export const runtime = "nodejs";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再查看邀请信息。" }, { status: 401 });
  }

  try {
    const summary = await getInviteSummary(session.userId);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取邀请信息失败") },
      { status: 400 },
    );
  }
}
