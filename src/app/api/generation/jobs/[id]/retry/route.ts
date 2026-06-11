import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { retryGenerationJobForUser } from "@/lib/generation-jobs";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号。" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(request, `generation:retry:${session.userId}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const { id } = await params;

  try {
    const job = await retryGenerationJobForUser(session.userId, id);
    return NextResponse.json({ ok: true, job }, { status: 202 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "重试任务失败。" },
      { status: 500 },
    );
  }
}
