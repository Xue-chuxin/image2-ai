import { NextResponse } from "next/server";
import { createLocalPolishResult, polishPromptWithDeepSeek } from "@/lib/prompt-polish";

export const runtime = "nodejs";

type PolishPayload = {
  input?: unknown;
  mode?: unknown;
  ratio?: unknown;
};

export async function POST(request: Request) {
  let payload: PolishPayload;

  try {
    payload = (await request.json()) as PolishPayload;
  } catch {
    return NextResponse.json({ ok: false, error: "请求体不是有效 JSON。" }, { status: 400 });
  }

  const input = typeof payload.input === "string" ? payload.input.trim() : "";
  const mode = typeof payload.mode === "string" ? payload.mode.trim() : "商品";
  const ratio = typeof payload.ratio === "string" ? payload.ratio.trim() : undefined;

  if (!input) {
    return NextResponse.json({ ok: false, error: "请先输入画面描述。" }, { status: 400 });
  }

  if (input.length > 2000) {
    return NextResponse.json({ ok: false, error: "画面描述过长，请控制在 2000 字以内。" }, { status: 400 });
  }

  const requestInput = { input, mode, ratio };

  if (!process.env.DEEPSEEK_API_KEY) {
    return NextResponse.json({
      ok: true,
      source: "local",
      result: createLocalPolishResult(requestInput)
    });
  }

  try {
    const result = await polishPromptWithDeepSeek(requestInput);
    return NextResponse.json({ ok: true, source: "deepseek", result });
  } catch (error) {
    return NextResponse.json({
      ok: true,
      source: "local",
      warning: error instanceof Error ? `DeepSeek 调用失败，已使用本地兜底：${error.message}` : "DeepSeek 调用失败，已使用本地兜底。",
      result: createLocalPolishResult(requestInput)
    });
  }
}
