import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { findGenerationJob } from "@/lib/generation-jobs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号。" }, { status: 401 });
  }

  const { id } = await params;
  const job = await findGenerationJob(session.userId, id);

  if (!job) {
    return NextResponse.json({ ok: false, error: "任务不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
