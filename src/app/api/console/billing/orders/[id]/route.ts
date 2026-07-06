import { consoleError, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { prisma } from "@/lib/db";
import { syncRechargeOrderFromProviderForUser } from "@/lib/payment-sync";
import { expireRechargeOrderForUser } from "@/lib/recharge-order-expiration";

type RouteContext = {
  params: Promise<{
    id: string;
  }>;
};

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function parseSyncMode(request: Request) {
  const { searchParams } = new URL(request.url);
  return searchParams.get("mode") === "auto" ? "auto" : "manual";
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("请先登录用户账号。", 401);
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
      return consoleError("订单不存在或无权查看。", 404);
    }

    return consoleOk({
      ...order,
      totalCredits: order.credits + order.bonusCredits,
    });
  } catch (error) {
    return consoleError(error instanceof Error ? error.message : "读取充值订单失败。", 500);
  }
}
