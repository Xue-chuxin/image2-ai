import { getAppErrorMessage } from "@/lib/app-error";
import { consoleError, consoleOk, getConsoleSession } from "@/app/api/console/_lib/envelope";
import { createRechargeOrder } from "@/lib/billing";
import { scheduleRechargeOrderAutoSync } from "@/lib/payment-sync";
import { normalizePaymentProvider } from "@/lib/payments";
import { checkRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function getPublicOrigin(request: Request) {
  return (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(/\/+$/, "");
}

export async function POST(request: Request) {
  const session = await getConsoleSession();
  if (!session) {
    return consoleError("请先登录用户账号后再充值。", 401);
  }

  const rateLimit = checkRateLimit(request, `billing:create-order:${session.userId}`, {
    limit: 10,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return consoleError(rateLimit.message, 429);
  }

  try {
    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const packageId = typeof body.packageId === "string" ? body.packageId.trim() : "";
    const provider = normalizePaymentProvider(body.provider);

    if (!packageId) {
      return consoleError("请选择积分套餐。", 400);
    }

    const order = await createRechargeOrder(session.userId, packageId, provider, getPublicOrigin(request));
    if (order.provider === "alipay_f2f") {
      scheduleRechargeOrderAutoSync(session.userId, order.id);
    }
    return consoleOk(order);
  } catch (error) {
    return consoleError(getAppErrorMessage(error, "创建充值订单失败。"), 400);
  }
}
