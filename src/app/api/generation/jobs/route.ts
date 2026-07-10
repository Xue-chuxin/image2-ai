import { NextResponse } from "next/server";

import {
  createAndRunGenerationJob,
  listRecentGenerationJobs,
  type CreateGenerationJobInput,
} from "@/lib/generation-jobs";
import { jsonError } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { checkModerationText } from "@/lib/moderation";
import {
  getMembershipContext,
  grantDailyMembershipCreditsIfDue,
  resolveMembershipRateLimit,
} from "@/lib/membership";
import { checkRateLimit } from "@/lib/rate-limit";
import type { GenerationProviderName } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE_HEADERS = {
  "Cache-Control": "no-store, max-age=0",
};

function normalizeProvider(value: unknown): GenerationProviderName | undefined {
  if (value === "openai" || value === "chatgpt_web" || value === "stability_ai") {
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
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号。" }, { status: 401, headers: NO_STORE_HEADERS });
  }

  try {
    const jobs = await listRecentGenerationJobs(session.userId, 20);
    return NextResponse.json(
      {
        ok: true,
        jobs,
      },
      { headers: NO_STORE_HEADERS },
    );
  } catch (error) {
    return jsonError(error, "读取生成任务失败");
  }
}

export async function POST(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录普通用户账号再生成图片。" }, { status: 401 });
  }

  const membership = await getMembershipContext(session.userId);
  const rateLimit = checkRateLimit(request, `generation:create:${session.userId}`, {
    limit: resolveMembershipRateLimit(10, membership),
    windowMs: 10 * 60 * 1000,
  });
  if (!rateLimit.ok) {
    return NextResponse.json(
      { ok: false, error: rateLimit.message },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfterSeconds) } },
    );
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

    const promptEn = normalizeString(body.promptEn);
    const negativePrompt = normalizeString(body.negativePrompt);
    const referenceImageIds = normalizeStringArray(body.referenceImageIds);

    const moderation = await checkModerationText([
      { value: promptZh, label: "中文提示词" },
      { value: promptEn, label: "英文提示词" },
      { value: negativePrompt, label: "反向提示词" },
    ]);

    if (!moderation.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: moderation.message,
        },
        {
          status: 400,
        },
      );
    }

    const input: CreateGenerationJobInput = {
      promptZh,
      promptEn: promptEn || undefined,
      negativePrompt: negativePrompt || undefined,
      ratio: normalizeString(body.ratio) || "1:1",
      quality: normalizeString(body.quality) || "standard",
      imageCount: normalizeNumber(body.imageCount),
      provider: normalizeProvider(body.provider),
      referenceImageIds,
    };

    // 会员每日赠送积分：出图前惰性发放一次，让本次生成即可使用当天赠送额度。
    await grantDailyMembershipCreditsIfDue(session.userId, membership);

    const job = await createAndRunGenerationJob(session.userId, input);
    if (!job) {
      return NextResponse.json({ ok: false, error: "生成任务不存在或已被移除。" }, { status: 404, headers: NO_STORE_HEADERS });
    }

    const failed = job.status === "FAILED";
    const completed = job.status === "COMPLETED";

    return NextResponse.json(
      {
        ok: !failed,
        job,
        error: failed ? job.errorMessage || "生成任务失败" : undefined,
      },
      {
        status: failed ? 409 : completed ? 200 : 202,
        headers: NO_STORE_HEADERS,
      },
    );
  } catch (error) {
    return jsonError(error, "创建生成任务失败");
  }
}
