import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getAdminSession } from "@/lib/auth";
import { retryFailedGenerationJobByAdmin } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const job = await retryFailedGenerationJobByAdmin(id);
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return jsonError(error, "重新执行任务失败。");
  }
}
