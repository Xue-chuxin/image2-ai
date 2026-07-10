import { NextResponse } from "next/server";

import { runAssistantChat, sanitizeAssistantMessages } from "@/lib/assistant";
import { checkModerationText } from "@/lib/moderation";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

type ChatPayload = {
  messages?: unknown;
};

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(request, "assistant:chat", {
    limit: 30,
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
  }

  let payload: ChatPayload;
  try {
    payload = (await request.json()) as ChatPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const messages = sanitizeAssistantMessages(payload.messages);
  if (messages.length === 0) {
    return NextResponse.json({ ok: false, error: "请先输入你的想法。" }, { status: 400 });
  }

  const lastMessage = messages[messages.length - 1];
  if (lastMessage.role !== "user") {
    return NextResponse.json({ ok: false, error: "最后一条消息应为用户输入。" }, { status: 400 });
  }

  const moderation = await checkModerationText([{ value: lastMessage.content, label: "对话内容" }]);
  if (!moderation.ok) {
    return NextResponse.json({ ok: false, error: moderation.message }, { status: 400 });
  }

  const output = await runAssistantChat(messages);

  return NextResponse.json({
    ok: true,
    reply: output.reply,
    suggestedPrompt: output.suggestedPrompt,
    source: output.source,
    warning: output.warning,
  });
}
