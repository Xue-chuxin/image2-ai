import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { loginOrCreateUser, setUserSessionCookie } from "@/lib/auth";
import { getUserCreditBalance } from "@/lib/credits";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceLoginTwoFactor } from "@/lib/two-factor";

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

  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string; verificationCode?: string; twoFactorCode?: string; intent?: string } | null;
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";
  const intent = payload?.intent === "login" || payload?.intent === "register" ? payload.intent : "auto";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请输入邮箱和密码。" }, { status: 400 });
  }

  try {
    const user = await loginOrCreateUser(email, password, payload?.verificationCode, intent);

    // 密码校验通过后进入二步验证闸门：已开启则需邮箱验证码，未开启直接放行。
    const gate = await enforceLoginTwoFactor({
      email: user.email || email,
      enabled: user.twoFactorEnabled,
      code: payload?.twoFactorCode,
    });
    if (gate.required) {
      return NextResponse.json({ ok: false, twoFactorRequired: true, message: "验证码已发送至你的邮箱，请输入验证码完成登录。" });
    }

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
    return jsonError(error, intent === "register" ? "注册失败，请检查邮箱验证码。" : "登录失败，请检查邮箱和密码。");
  }
}
