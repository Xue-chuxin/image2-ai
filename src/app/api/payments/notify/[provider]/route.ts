import { NextResponse } from "next/server";

import { markRechargeOrderPaidByPayment } from "@/lib/billing";
import { normalizePaymentProvider, parsePaymentNotify } from "@/lib/payments";

type RouteContext = {
  params: Promise<{
    provider: string;
  }>;
};

async function handle(request: Request, context: RouteContext) {
  try {
    const { provider: providerValue } = await context.params;
    const provider = normalizePaymentProvider(providerValue);
    const result = await parsePaymentNotify(provider, request);
    await markRechargeOrderPaidByPayment({
      orderNo: result.orderNo,
      provider,
      providerTradeNo: result.providerTradeNo,
      amountCents: result.amountCents,
      currency: result.currency,
      rawPayload: result.rawPayload,
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
    return new Response(`fail:${message}`, { status: 400 });
  }
}

export async function GET(request: Request, context: RouteContext) {
  return handle(request, context);
}

export async function POST(request: Request, context: RouteContext) {
  return handle(request, context);
}
