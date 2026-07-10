import { NextResponse } from "next/server";

import { getAppErrorMessage, getAppErrorStatus } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { getCheckInStatus, performCheckIn } from "@/lib/checkin";

export const runtime = "nodejs";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再查看签到信息。" }, { status: 401 });
  }

  try {
    const status = await getCheckInStatus(session.userId);
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "获取签到信息失败") },
      { status: 400 },
    );
  }
}

export async function POST() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再签到。" }, { status: 401 });
  }

  try {
    const result = await performCheckIn(session.userId);
    const status = await getCheckInStatus(session.userId);
    return NextResponse.json({ ok: true, result, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: getAppErrorMessage(error, "签到失败") },
      { status: getAppErrorStatus(error, 400) },
    );
  }
}
