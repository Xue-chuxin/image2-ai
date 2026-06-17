import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { sendEmailVerificationCode } from "@/lib/email-verification";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type EmailCodePayload = {
  email?: unknown;
  purpose?: unknown;
};

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as EmailCodePayload | null;
  const email = normalizeEmail(payload?.email);
  const purpose = payload?.purpose === "password_reset" ? "password_reset" : "register";
  const rateLimit = checkRateLimit(request, `auth:email-code:${email || "unknown"}`, {
    limit: 5,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  try {
    const result = await sendEmailVerificationCode(email, purpose);
    return NextResponse.json({
      ok: true,
      message: `验证码已发送至 ${result.email}，10 分钟内有效。`,
    });
  } catch (error) {
    return jsonError(error, "验证码发送失败。", 400);
  }
}
