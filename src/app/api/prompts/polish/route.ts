import { NextResponse } from "next/server";

import { checkModerationText } from "@/lib/moderation";
import { polishPrompt } from "@/lib/prompt-polish";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type PolishPayload = {
  input?: unknown;
  mode?: unknown;
  ratio?: unknown;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "prompt:polish", {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let payload: PolishPayload;

  try {
    payload = (await request.json()) as PolishPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const input = typeof payload.input === "string" ? payload.input.trim() : "";
  const mode = typeof payload.mode === "string" ? payload.mode.trim() : "写实";
  const ratio = typeof payload.ratio === "string" ? payload.ratio.trim() : undefined;

  if (!input) {
    return NextResponse.json({ ok: false, error: "请先输入画面描述。" }, { status: 400 });
  }

  if (input.length > 2000) {
    return NextResponse.json({ ok: false, error: "画面描述过长，请控制在 2000 字以内。" }, { status: 400 });
  }

  const moderation = await checkModerationText([{ value: input, label: "画面描述" }]);
  if (!moderation.ok) {
    return NextResponse.json({ ok: false, error: moderation.message }, { status: 400 });
  }

  const output = await polishPrompt({
    input,
    mode,
    ratio,
  });

  return NextResponse.json({
    ok: true,
    source: output.source,
    warning: output.warning,
    result: output.result,
    data: output.result,
  });
}
