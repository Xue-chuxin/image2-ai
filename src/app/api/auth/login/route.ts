import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { loginOrCreateUser, setUserSessionCookie } from "@/lib/auth";
import { getUserCreditBalance } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:user-login", {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string; verificationCode?: string } | null;
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请输入邮箱和密码。" }, { status: 400 });
  }

  try {
    const user = await loginOrCreateUser(email, password, payload?.verificationCode);
    const credits = await getUserCreditBalance(user.id);
    const response = NextResponse.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      credits,
    });

    setUserSessionCookie(response, { id: user.id, email: user.email || email }, request);
    return response;
  } catch (error) {
    return jsonError(error, "登录失败，请检查邮箱和密码。");
  }
}
