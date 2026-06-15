import { NextResponse } from "next/server";

import { jsonError } from "@/lib/app-error";
import { getAdminSession } from "@/lib/auth";
import { getOpenAICompatibleRuntimeChannels } from "@/lib/settings";

export const runtime = "nodejs";

function buildModelsUrl(baseUrl: string) {
  return `${baseUrl.replace(/\/+$/, "")}/models`;
}

function sanitizeMessage(value: string) {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9._-]{8,}/g, "[redacted]")
    .replace(/key-[A-Za-z0-9._-]{8,}/g, "[redacted]")
    .replace(/authorization["']?\s*:\s*["'][^"']+["']/gi, "authorization: [redacted]")
    .slice(0, 180);
}

async function readUpstreamMessage(response: Response) {
  const text = await response.text();
  if (!text) {
    return `通道返回 ${response.status}`;
  }

  try {
    const data = JSON.parse(text) as { error?: { message?: string }; message?: string };
    return sanitizeMessage(data.error?.message || data.message || text);
  } catch {
    return sanitizeMessage(text);
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "未登录管理员账号。" }, { status: 401 });
  }

  try {
    const body = (await request.json().catch(() => null)) as { channelId?: string } | null;
    const channelId = body?.channelId?.trim();
    const channels = await getOpenAICompatibleRuntimeChannels();
    const channel = channels.find((item) => item.id === channelId);

    if (!channel) {
      return NextResponse.json({ ok: false, error: "通道不存在或未启用。", code: "NOT_FOUND" }, { status: 404 });
    }

    if (!channel.apiKey) {
      return NextResponse.json({ ok: false, error: "该通道未配置 API Key。", code: "PROVIDER_CONFIG" }, { status: 400 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Math.min(channel.timeoutSeconds, 15) * 1000);
    let response: Response;

    try {
      response = await fetch(buildModelsUrl(channel.baseUrl), {
        method: "GET",
        headers: {
          Authorization: `Bearer ${channel.apiKey}`,
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }

    if (!response.ok) {
      return NextResponse.json(
        {
          ok: false,
          error: `${channel.name} 连通性检查失败：${await readUpstreamMessage(response)}`,
        },
        {
          status: response.status >= 500 ? 502 : 400,
        },
      );
    }

    return NextResponse.json({
      ok: true,
      status: {
        channelId: channel.id,
        channelName: channel.name,
        checkedUrl: buildModelsUrl(channel.baseUrl),
        message: `${channel.name} /models 连通性正常。`,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return NextResponse.json({ ok: false, error: "通道连通性检查超时。", code: "PROVIDER_CONFIG" }, { status: 504 });
    }

    return jsonError(error, "通道连通性检查失败。");
  }
}
