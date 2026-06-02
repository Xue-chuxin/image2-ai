import { NextResponse } from "next/server";
import { findGenerationJob } from "@/lib/generation-jobs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await findGenerationJob(id);

  if (!job) {
    return NextResponse.json({ ok: false, error: "任务不存在。" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, job });
}
