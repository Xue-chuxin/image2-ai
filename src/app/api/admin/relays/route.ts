import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { relayRecommendations } from "@/lib/relay-recommendations";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  return NextResponse.json({
    ok: true,
    relays: relayRecommendations,
  });
}
