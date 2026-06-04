import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { markRechargeOrderPaidByAdmin } from "@/lib/billing";

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

  try {
    const { id } = await context.params;
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const order = await markRechargeOrderPaidByAdmin(id, typeof body.adminNote === "string" ? body.adminNote : "");

    return NextResponse.json({
      ok: true,
      order,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "确认到账失败",
      },
      {
        status: 400,
      },
    );
  }
}
