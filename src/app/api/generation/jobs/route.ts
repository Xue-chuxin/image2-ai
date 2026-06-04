import { NextResponse } from "next/server";

import {
  createAndQueueGenerationJob,
  listRecentGenerationJobs,
  type CreateGenerationJobInput,
} from "@/lib/generation-jobs";
import { getUserSession } from "@/lib/auth";
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

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item) => normalizeString(item))
    .filter(Boolean)
    .slice(0, 4);
}

export async function GET() {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号。" }, { status: 401 });
  }

  try {
    const jobs = await listRecentGenerationJobs(session.userId, 20);
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
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号再生成图片。" }, { status: 401 });
  }

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
      referenceImageIds: normalizeStringArray(body.referenceImageIds),
    };

    const job = await createAndQueueGenerationJob(session.userId, input);
    const failed = job.status === "FAILED";

    return NextResponse.json(
      {
        ok: !failed,
        job,
        error: failed ? job.errorMessage || "生成任务失败" : undefined,
      },
      {
        status: failed ? 500 : 202,
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
