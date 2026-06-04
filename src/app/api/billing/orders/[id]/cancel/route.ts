import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { cancelRechargeOrderForUser } from "@/lib/billing";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401 });
  }

  try {
    const { id } = await context.params;
    const order = await cancelRechargeOrderForUser(session.userId, id);

    return NextResponse.json({
      ok: true,
      order,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "取消订单失败",
      },
      {
        status: 400,
      },
    );
  }
}
