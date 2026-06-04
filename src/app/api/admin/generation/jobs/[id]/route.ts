import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { findAdminGenerationJobById } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  const { id } = await params;
  const job = await findAdminGenerationJobById(id);

  if (!job) {
    return NextResponse.json({ ok: false, error: "任务不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
