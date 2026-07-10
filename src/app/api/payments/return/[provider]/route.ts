import { NextResponse } from "next/server";

import { AppError, getAppErrorMessage, isAppError } from "@/lib/app-error";
import { markRechargeOrderPaidByPayment } from "@/lib/billing";
import { recordPaymentEvent } from "@/lib/payment-diagnostics";
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
  const returnPayload = Object.fromEntries(url.searchParams.entries());

  try {
    if (provider === "paypal") {
      const token = url.searchParams.get("token") || "";
      if (!orderNo || !token) {
        throw new AppError("BAD_REQUEST", "缺少 PayPal 返回参数。", 400);
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
      await recordPaymentEvent({
        provider: "paypal",
        eventType: "return_capture",
        status: "VERIFIED",
        orderNo: result.orderNo,
        providerTradeNo: result.providerTradeNo,
        httpMethod: request.method,
        requestPath: url.pathname,
        rawPayload: result.rawPayload || returnPayload,
        message: "PayPal 返回页 capture 已完成入账",
      });
    }

    return NextResponse.redirect(new URL(`/account?orderNo=${encodeURIComponent(orderNo)}&payment=success`, url.origin));
  } catch (error) {
    // 诊断记录真实错误，跳转给用户的 message 只透传 AppError。
    if (!isAppError(error)) {
      console.error("[payment-return]", error);
    }
    const diagnosticMessage = error instanceof Error ? error.message : "支付返回处理失败";
    const clientMessage = getAppErrorMessage(error, "支付返回处理失败");
    await recordPaymentEvent({
      provider,
      eventType: "return_capture",
      status: "FAILED",
      orderNo,
      httpMethod: request.method,
      requestPath: url.pathname,
      rawPayload: returnPayload,
      message: diagnosticMessage,
    });
    return NextResponse.redirect(new URL(`/account?orderNo=${encodeURIComponent(orderNo)}&payment=failed&message=${encodeURIComponent(clientMessage)}`, url.origin));
  }
}
