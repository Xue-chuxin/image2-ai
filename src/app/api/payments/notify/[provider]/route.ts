import { NextResponse } from "next/server";

import { markRechargeOrderPaidByPayment } from "@/lib/billing";
import { recordPaymentEvent } from "@/lib/payment-diagnostics";
import { normalizePaymentProvider, parsePaymentNotify } from "@/lib/payments";
import type { PaymentProviderName } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

async function captureRequestPayload(request: Request) {
  const url = new URL(request.url);
  if (request.method === "GET") {
    return Object.fromEntries(url.searchParams.entries());
  }

  try {
    return await request.clone().text();
  } catch {
    return Object.fromEntries(url.searchParams.entries());
  }
}

async function handle(request: Request, context: RouteContext) {
  const url = new URL(request.url);
  let provider: PaymentProviderName | null = null;
  let requestPayload: unknown = null;

  try {
    const { provider: providerValue } = await context.params;
    provider = normalizePaymentProvider(providerValue);
    requestPayload = await captureRequestPayload(request);

    const result = await parsePaymentNotify(provider, request);
    await markRechargeOrderPaidByPayment({
      orderNo: result.orderNo,
      provider,
      providerTradeNo: result.providerTradeNo,
      amountCents: result.amountCents,
      currency: result.currency,
      rawPayload: result.rawPayload,
    });

    await recordPaymentEvent({
      provider,
      eventType: "notify",
      status: "VERIFIED",
      orderNo: result.orderNo,
      providerTradeNo: result.providerTradeNo,
      httpMethod: request.method,
      requestPath: url.pathname,
      rawPayload: result.rawPayload || requestPayload,
      message: "支付回调已验签并完成入账",
    });

    if (provider === "wechat_pay") {
      return NextResponse.json({ code: "SUCCESS", message: "成功" });
    }
    if (provider === "alipay_f2f" || provider === "epay") {
      return new Response("success", { status: 200 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "支付回调处理失败";
    if (provider) {
      await recordPaymentEvent({
        provider,
        eventType: "notify",
        status: "FAILED",
        httpMethod: request.method,
        requestPath: url.pathname,
        rawPayload: requestPayload,
        message,
      });
    }
    return new Response(`fail:${message}`, { status: 400 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
