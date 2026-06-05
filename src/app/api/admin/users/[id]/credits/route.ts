import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { adjustUserCreditsByAdmin } from "@/lib/admin-users";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(request: Request, context: RouteContext) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { id } = await context.params;
  const payload = await request.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  try {
    const user = await adjustUserCreditsByAdmin({
      userId: id,
      amount: Number((payload as { amount?: unknown }).amount),
      reason: typeof (payload as { reason?: unknown }).reason === "string" ? (payload as { reason: string }).reason : "",
      adminEmail: session.email,
    });

    return NextResponse.json({
      ok: true,
      user,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "调整积分失败。",
      },
      {
        status: 400,
      },
    );
  }
}
