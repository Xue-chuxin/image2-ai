import { NextResponse } from "next/server";

import {
  createAndRunGenerationJob,
  listRecentGenerationJobs,
  type CreateGenerationJobInput,
} from "@/lib/generation-jobs";
import type { GenerationProviderName } from "@/lib/settings";

function normalizeProvider(value: unknown): GenerationProviderName | undefined {
  if (value === "openai" || value === "chatgpt_web") {
    return value;
  }

  return undefined;
}

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : undefined;
}

export async function GET() {
  try {
    const jobs = await listRecentGenerationJobs(20);
    return NextResponse.json({
      ok: true,
      jobs,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "读取生成任务失败",
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const promptZh = normalizeString(body.promptZh);

    if (!promptZh) {
      return NextResponse.json(
        {
          ok: false,
          error: "请输入中文提示词",
        },
        {
          status: 400,
        },
      );
    }

    const input: CreateGenerationJobInput = {
      promptZh,
      promptEn: normalizeString(body.promptEn) || undefined,
      negativePrompt: normalizeString(body.negativePrompt) || undefined,
      ratio: normalizeString(body.ratio) || "1:1",
      quality: normalizeString(body.quality) || "standard",
      imageCount: normalizeNumber(body.imageCount),
      provider: normalizeProvider(body.provider),
    };

    const job = await createAndRunGenerationJob(input);
    const failed = job.status === "FAILED";

    return NextResponse.json(
      {
        ok: !failed,
        job,
        error: failed ? job.errorMessage || "生成任务失败" : undefined,
      },
      {
        status: failed ? 500 : 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "创建生成任务失败",
      },
      {
        status: 500,
      },
    );
  }
}
