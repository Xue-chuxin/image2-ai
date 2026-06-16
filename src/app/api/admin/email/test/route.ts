import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getAdminSession } from "@/lib/auth";
import { sendTestEmail } from "@/lib/email";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  const payload = await request.json().catch(() => ({}));
  const to = payload && typeof payload === "object" && typeof (payload as { to?: unknown }).to === "string" ? (payload as { to: string }).to : undefined;

  try {
    const recipient = await sendTestEmail(to);
    return NextResponse.json({
      ok: true,
      recipient,
      message: `测试邮件已发送到 ${recipient}。`,
    });
  } catch (error) {
    return jsonError(error, "测试邮件发送失败。", 400);
  }
}
