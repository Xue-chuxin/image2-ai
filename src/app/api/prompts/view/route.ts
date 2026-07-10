import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { recordPromptView } from "@/lib/prompts";

export const runtime = "nodejs";

type ViewPayload = {
  promptId?: string;
};

/** 记录一次提示词使用（点击「去创作」）。无需登录，命中即自增浏览量。 */
export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as ViewPayload | null;

  try {
    const result = await recordPromptView(payload?.promptId);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return jsonError(error, "记录使用失败。");
  }
}
