import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminGenerationJobs } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  try {
    const jobs = await listAdminGenerationJobs(50);
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "读取生成任务失败。" },
      { status: 500 },
    );
  }
}
