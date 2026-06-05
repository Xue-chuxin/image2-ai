import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { getUserBillingOverview } from "@/lib/billing";
import { expirePendingRechargeOrders } from "@/lib/recharge-order-expiration";

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401 });
  }

  try {
    await expirePendingRechargeOrders(session.userId);
    const overview = await getUserBillingOverview(session.userId);

    return NextResponse.json({
      ok: true,
      balance: overview.balance,
      orders: overview.orders,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取账户概览失败。",
      },
      {
        status: 500,
      },
    );
  }
}
