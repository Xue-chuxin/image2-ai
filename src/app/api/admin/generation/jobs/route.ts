import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminGenerationJobsFiltered } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  try {
    const url = new URL(request.url);
    const jobs = await listAdminGenerationJobsFiltered({
      limit: 50,
      status: url.searchParams.get("status") || undefined,
      q: url.searchParams.get("q") || undefined,
    });
    return NextResponse.json({ ok: true, jobs });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "读取生成任务失败。" },
      { status: 500 },
    );
  }
}
