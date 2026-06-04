import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminRechargeOrders } from "@/lib/billing";

export async function GET(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const q = searchParams.get("q");
  const limit = Number(searchParams.get("limit") || 80);

  try {
    const orders = await listAdminRechargeOrders({
      status,
      q,
      limit,
    });

    return NextResponse.json({
      ok: true,
      orders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取充值订单失败",
      },
      {
        status: 500,
      },
    );
  }
}
