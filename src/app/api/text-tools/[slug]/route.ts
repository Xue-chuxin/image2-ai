import { NextResponse } from "next/server";

import { checkModerationText } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";
import { getTextTool, normalizeTextToolOption, runTextTool, sanitizeTextToolInput } from "@/lib/text-tools";

export const runtime = "nodejs";

type TextToolPayload = {
  input?: unknown;
  option?: unknown;
};

export async function POST(request: Request, context: { params: Promise<{ slug: string }> }) {
  const { slug } = await context.params;
  const tool = getTextTool(slug);
  if (!tool) {
    return NextResponse.json({ ok: false, error: "该应用不存在。" }, { status: 404 });
  }

  const rateLimit = checkRateLimit(request, `text-tool:${tool.slug}`, {
    limit: 20,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let payload: TextToolPayload;
  try {
    payload = (await request.json()) as TextToolPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const input = sanitizeTextToolInput(payload.input, tool.maxInput);
  if (!input) {
    return NextResponse.json({ ok: false, error: `请先输入${tool.inputLabel}。` }, { status: 400 });
  }

  const option = normalizeTextToolOption(tool, payload.option);

  const moderation = await checkModerationText([{ value: input, label: tool.inputLabel }]);
  if (!moderation.ok) {
    return NextResponse.json({ ok: false, error: moderation.message }, { status: 400 });
  }

  const output = await runTextTool(tool, input, option);

  return NextResponse.json({
    ok: true,
    source: output.source,
    warning: output.warning,
    items: output.items,
  });
}
