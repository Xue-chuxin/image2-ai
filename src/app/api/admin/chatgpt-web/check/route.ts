import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { checkChatGPTWebStatus } from "@/lib/chatgpt-web";
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
      return NextResponse.json({
        ok: true,
        status: {
          enabled: true,
          ready: false,
          userDataDir: "",
          headless: false,
          timeoutSeconds: 0,
          message: `ChatGPT Web 正在执行 ${queueState.activeJobCount} 个任务 (${queueState.activeJobIds.join(", ")}），请任务完成后再检测登录状态。`,
        },
      });
    }

    const status = await checkChatGPTWebStatus();
    return NextResponse.json({ ok: true, status });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "检测 ChatGPT 登录状态失败。" },
      { status: 500 },
    );
  }
}
