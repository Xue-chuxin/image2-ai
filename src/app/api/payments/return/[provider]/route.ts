import { NextResponse } from "next/server";

import { markRechargeOrderPaidByPayment } from "@/lib/billing";
import { capturePayPalOrder, normalizePaymentProvider } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { provider: providerValue } = await context.params;
  const provider = normalizePaymentProvider(providerValue);
  const url = new URL(request.url);
  const orderNo = url.searchParams.get("orderNo") || "";

  try {
    if (provider === "paypal") {
      const token = url.searchParams.get("token") || "";
      if (!orderNo || !token) {
        throw new Error("缺少 PayPal 返回参数。");
      }
      const result = await capturePayPalOrder(orderNo, token);
      await markRechargeOrderPaidByPayment({
        orderNo: result.orderNo,
        provider: "paypal",
        providerTradeNo: result.providerTradeNo,
        amountCents: result.amountCents,
        currency: result.currency,
        rawPayload: result.rawPayload,
        captured: true,
      });
    }

    return NextResponse.redirect(new URL(`/account?orderNo=${encodeURIComponent(orderNo)}&payment=success`, url.origin));
  } catch (error) {
    const message = encodeURIComponent(error instanceof Error ? error.message : "支付返回处理失败");
    return NextResponse.redirect(new URL(`/account?orderNo=${encodeURIComponent(orderNo)}&payment=failed&message=${message}`, url.origin));
  }
}
