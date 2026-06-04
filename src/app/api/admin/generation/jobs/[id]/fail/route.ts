import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { markGenerationJobFailedByAdmin } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const job = await markGenerationJobFailedByAdmin(id);
    return NextResponse.json({ ok: true, job });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "标记任务失败。" },
      { status: 500 },
    );
  }
}
