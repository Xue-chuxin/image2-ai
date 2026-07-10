import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { MAX_AVATAR_BYTES, updateUserAvatar } from "@/lib/profile";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录后再上传头像。" }, { status: 401 });
  }

  const rateLimit = checkRateLimit(request, `upload:avatar:${session.userId}`, {
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "请选择要上传的头像图片。" }, { status: 400 });
    }

    if (file.size > MAX_AVATAR_BYTES) {
      return NextResponse.json({ ok: false, error: "头像不能超过 4MB。" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const profile = await updateUserAvatar(session.userId, buffer);

    return NextResponse.json({ ok: true, profile });
  } catch (error) {
    return jsonError(error, "上传头像失败。");
  }
}
