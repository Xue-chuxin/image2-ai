import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      error: "人工确认到账已关闭，请使用在线支付回调自动到账。",
    },
    {
      status: 410,
    },
  );
}
