import { NextResponse } from "next/server";

import { getUserSession } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { syncRechargeOrderFromProviderForUser } from "@/lib/payment-sync";
import { expireRechargeOrderForUser } from "@/lib/recharge-order-expiration";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

function parseSyncMode(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("mode") === "auto" ? "auto" : "manual";
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录用户账号。" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const mode = parseSyncMode(request);
    await syncRechargeOrderFromProviderForUser(session.userId, id, { force: mode === "manual", mode });
    await expireRechargeOrderForUser(session.userId, id);

    const order = await prisma.rechargeOrder.findFirst({
      where: {
        id,
        userId: session.userId,
      },
      select: {
        id: true,
        orderNo: true,
        packageId: true,
        packageNameSnapshot: true,
        provider: true,
        status: true,
        amountCents: true,
        currency: true,
        credits: true,
        bonusCredits: true,
        paymentUrl: true,
        qrCodeUrl: true,
        providerTradeNo: true,
        paidAt: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!order) {
      return NextResponse.json({ ok: false, error: "订单不存在或无权查看。" }, { status: 404 });
    }

    return NextResponse.json({
      ok: true,
      order: {
        ...order,
        totalCredits: order.credits + order.bonusCredits,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取充值订单失败。",
      },
      {
        status: 500,
      },
    );
  }
}
