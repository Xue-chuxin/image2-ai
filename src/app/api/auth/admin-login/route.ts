import { NextResponse } from "next/server";
import { jsonError } from "@/lib/app-error";
import { ensureInitialAdmin, findAdminByEmail, markAdminLoggedIn, setAdminSessionCookie, verifyPassword } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { enforceLoginTwoFactor } from "@/lib/two-factor";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "auth:admin-login", {
    limit: 8,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  const payload = (await request.json().catch(() => null)) as { email?: string; password?: string; twoFactorCode?: string } | null;
  const email = payload?.email?.trim().toLowerCase();
  const password = payload?.password || "";

  if (!email || !password) {
    return NextResponse.json({ ok: false, error: "请输入管理员邮箱和密码。" }, { status: 400 });
  }

  try {
    await ensureInitialAdmin();
    const user = await findAdminByEmail(email);

    if (!user || !user.email || !verifyPassword(password, user.passwordHash)) {
      return NextResponse.json({ ok: false, error: "管理员账号或密码错误。" }, { status: 401 });
    }

    const gate = await enforceLoginTwoFactor({
      email: user.email,
      enabled: user.twoFactorEnabled,
      code: payload?.twoFactorCode,
    });
    if (gate.required) {
      return NextResponse.json({ ok: false, twoFactorRequired: true, message: "验证码已发送至你的邮箱，请输入验证码完成登录。" });
    }

    await markAdminLoggedIn(user.id);
    const response = NextResponse.json({ ok: true });
    setAdminSessionCookie(response, { id: user.id, email: user.email }, request);
    return response;
  } catch (error) {
    // AppError（如管理员初始化的配置提示）会透传文案，其余异常返回通用文案 + 记日志。
    return jsonError(error, "登录失败，请检查数据库和管理员配置。");
  }
}
