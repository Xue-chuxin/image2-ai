import { NextResponse } from "next/server";
import { createAndRunGenerationJob, listRecentGenerationJobs } from "@/lib/generation-jobs";
import type { GenerationProviderName } from "@/lib/settings";

export const runtime = "nodejs";

function normalizeProvider(value: unknown): GenerationProviderName | undefined {
  if (value === "openai" || value === "chatgpt_web") {
    return value;
  }
  return undefined;
}

export async function GET() {
  try {
    return NextResponse.json({ ok: true, jobs: await listRecentGenerationJobs() });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "读取生成历史失败。" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => null)) as {
    promptZh?: string;
    promptEn?: string;
    negativePrompt?: string;
    ratio?: string;
    quality?: string;
    imageCount?: number;
    provider?: string;
  } | null;

  const promptZh = payload?.promptZh?.trim();
  if (!promptZh) {
    return NextResponse.json({ ok: false, error: "请先输入或整理画面描述。" }, { status: 400 });
  }

  try {
    const job = await createAndRunGenerationJob({
      promptZh,
      promptEn: payload?.promptEn?.trim() || undefined,
      negativePrompt: payload?.negativePrompt?.trim() || undefined,
      ratio: payload?.ratio || "1:1",
      quality: payload?.quality || "standard",
      imageCount: payload?.imageCount || 1,
      provider: normalizeProvider(payload?.provider)
    });

    return NextResponse.json({ ok: job.status !== "FAILED", job, error: job.errorMessage || undefined }, { status: job.status === "FAILED" ? 500 : 200 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "创建生图任务失败。" },
      { status: 500 }
    );
  }
}
