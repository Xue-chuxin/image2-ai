import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { checkChatGPTWebStatus } from "@/lib/chatgpt-web";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  try {
    const status = await checkChatGPTWebStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "检测 ChatGPT 登录状态失败。" },
      { status: 500 },
    );
  }
}
