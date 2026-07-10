import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listModerationLogs } from "@/lib/moderation";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") || 120);

  try {
    const logs = await listModerationLogs({ q, limit });
    return NextResponse.json({ ok: true, logs });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取审核日志失败"),
      },
      { status: 500 },
    );
  }
}
