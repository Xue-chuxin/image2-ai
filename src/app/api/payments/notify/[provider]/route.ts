import { NextResponse } from "next/server";

import { isAppError } from "@/lib/app-error";
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
    // 诊断事件记录真实错误（服务端、管理员可见）；返回给支付平台的文案只透传 AppError，避免泄露内部异常。
    if (!isAppError(error)) {
      console.error("[payment-notify]", error);
    }
    const diagnosticMessage = error instanceof Error ? error.message : "支付回调处理失败";
    if (provider) {
      await recordPaymentEvent({
        provider,
        eventType: "notify",
        status: "FAILED",
        httpMethod: request.method,
        requestPath: url.pathname,
        rawPayload: requestPayload,
        message: diagnosticMessage,
      });
    }
    // 只回一个固定的失败标记给支付平台，内部错误详情仅落在诊断事件里，避免向外泄露配置/状态。
    return new Response("fail", { status: 400 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
