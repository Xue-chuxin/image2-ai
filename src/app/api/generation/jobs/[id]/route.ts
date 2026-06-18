import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { findGenerationJob } from "@/lib/generation-jobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  const { id } = await params;
  const job = await findGenerationJob(session.userId, id);

  if (!job) {
    return NextResponse.json({ ok: false, error: "任务不存在。" }, { status: 404, headers: NO_STORE_HEADERS });
  }

  return NextResponse.json({ ok: true, job }, { headers: NO_STORE_HEADERS });
}
