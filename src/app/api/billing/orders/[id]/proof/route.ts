import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "付款凭证上传已关闭，请使用在线支付渠道完成充值。",
    },
    {
      status: 410,
    },
  );
}
