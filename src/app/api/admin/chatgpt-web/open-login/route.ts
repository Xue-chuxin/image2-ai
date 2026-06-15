import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { openChatGPTWebLoginBrowser } from "@/lib/chatgpt-web";
import { getChatGPTWebQueueRuntimeState } from "@/lib/generation-jobs";

export const runtime = "nodejs";

export async function POST() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  try {
    const queueState = getChatGPTWebQueueRuntimeState();
    if (queueState.busy) {
      return NextResponse.json(
        {
          ok: false,
          error: `ChatGPT Web 正在执行 ${queueState.activeJobCount} 个任务 (${queueState.activeJobIds.join(", ")}），请任务完成后再打开登录浏览器。`,
        },
        { status: 409 },
      );
    }

    const status = await openChatGPTWebLoginBrowser();
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "打开 ChatGPT 登录浏览器失败。" },
      { status: 500 },
    );
  }
}
