import { prisma } from "@/lib/db";
import { getDeepSeekRuntimeConfig, getModerationRuntimeConfig, type ModerationRuntimeConfig } from "@/lib/settings";

export type ModerationTextInput = {
  value?: string | null;
  label?: string;
};

export type ModerationMethod = "keyword" | "semantic";

export type ModerationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
      field?: string;
      method: ModerationMethod;
      category?: string;
    };

export type ModerationContext = {
  userId?: string | null;
  email?: string | null;
};

function normalizeForMatch(value: string) {
  return value.trim().toLocaleLowerCase();
}

export function parseForbiddenWords(value: string) {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => {
      const key = normalizeForMatch(word);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export function checkForbiddenWords(inputs: ModerationTextInput[], config: ModerationRuntimeConfig): ModerationResult {
  const forbiddenWords = parseForbiddenWords(config.forbiddenWords);
  if (!forbiddenWords.length) {
    return { ok: true };
  }

  for (const input of inputs) {
    const value = input.value?.trim();
    if (!value) {
      continue;
    }

    const normalizedValue = normalizeForMatch(value);
    const matched = forbiddenWords.find((word) => normalizedValue.includes(normalizeForMatch(word)));

    if (matched) {
      return {
        ok: false,
        message: config.blockMessage,
        field: input.label,
        method: "keyword",
        category: matched,
      };
    }
  }

  return { ok: true };
}

const SEMANTIC_SYSTEM_PROMPT = [
  "你是图片生成平台的内容安全审核助手。",
  "判断下面的图片生成提示词是否包含违法或明显不适合生成的内容，包括：未成年人色情、真人露骨色情、极端暴力血腥、恐怖主义、制造武器/毒品的教程、仇恨歧视、以及冒充真实人物进行诽谤或误导。",
  "普通的艺术、商业、写实、插画、风景、人物肖像等正常创作应判定为通过。",
  "只返回 JSON，不要解释，不要 Markdown。",
  '格式：{"allowed": true 或 false, "category": "违规类别或 none"}。',
].join("\n");

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export function parseSemanticVerdict(content: string): { allowed: boolean; category?: string } {
  const withoutFence = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("审核模型返回内容不是有效 JSON。");
  }

  const parsed = JSON.parse(withoutFence.slice(start, end + 1)) as { allowed?: unknown; category?: unknown };
  // 缺字段时按“通过”处理，避免误伤（真正违规时模型会明确给出 allowed=false）。
  const category = typeof parsed.category === "string" && parsed.category.trim() && parsed.category.trim() !== "none"
    ? parsed.category.trim()
    : undefined;
  return { allowed: parsed.allowed !== false, category };
}

/**
 * 语义审核：调用 DeepSeek（OpenAI 兼容通道）判断内容是否违规。
 * 失败开放（fail-open）：模型不可用/超时/解析失败时放行，避免审核链路故障阻断全部生成。
 */
async function checkSemanticModeration(inputs: ModerationTextInput[], config: ModerationRuntimeConfig): Promise<ModerationResult> {
  const combined = inputs
    .map((input) => input.value?.trim())
    .filter(Boolean)
    .join("\n");

  if (!combined) {
    return { ok: true };
  }

  const deepseek = await getDeepSeekRuntimeConfig();
  if (!deepseek.apiKey) {
    // 未配置 Key 时无法做语义审核，放行（关键词层已先行拦截）。
    return { ok: true };
  }

  const baseUrl = deepseek.baseUrl.replace(/\/$/, "");
  const model = config.semanticModel || deepseek.model;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.MODERATION_TIMEOUT_MS || 15000));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${deepseek.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SEMANTIC_SYSTEM_PROMPT },
          { role: "user", content: `待审核提示词：\n${combined}` },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`审核模型请求失败：${response.status}`);
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error("审核模型没有返回可用内容。");
    }

    const verdict = parseSemanticVerdict(content);
    if (!verdict.allowed) {
      return { ok: false, message: config.blockMessage, method: "semantic", category: verdict.category };
    }

    return { ok: true };
  } catch (error) {
    console.error("语义审核调用失败，已放行：", error instanceof Error ? error.message : error);
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

const MODERATION_LOG_PROMPT_MAX = 2000;

// 记录一次被拦截的审核事件。写日志失败不应影响主流程（审核结论已生成）。
async function recordModerationBlock(
  inputs: ModerationTextInput[],
  result: Extract<ModerationResult, { ok: false }>,
  context?: ModerationContext,
): Promise<void> {
  try {
    const prompt = inputs
      .map((input) => input.value?.trim())
      .filter(Boolean)
      .join("\n")
      .slice(0, MODERATION_LOG_PROMPT_MAX);

    await prisma.moderationLog.create({
      data: {
        userId: context?.userId ?? null,
        userEmail: context?.email ?? null,
        method: result.method,
        field: result.field ?? null,
        category: result.category ?? null,
        prompt,
      },
    });
  } catch (error) {
    console.error("写入内容审核日志失败：", error instanceof Error ? error.message : error);
  }
}

export async function checkModerationText(
  inputs: ModerationTextInput[],
  context?: ModerationContext,
): Promise<ModerationResult> {
  const config = await getModerationRuntimeConfig();

  if (!config.enabled) {
    return { ok: true };
  }

  const keywordResult = checkForbiddenWords(inputs, config);
  if (!keywordResult.ok) {
    await recordModerationBlock(inputs, keywordResult, context);
    return keywordResult;
  }

  if (config.semanticEnabled) {
    const semanticResult = await checkSemanticModeration(inputs, config);
    if (!semanticResult.ok) {
      await recordModerationBlock(inputs, semanticResult, context);
    }
    return semanticResult;
  }

  return { ok: true };
}

export type ModerationLogView = {
  id: string;
  userId: string | null;
  userEmail: string | null;
  method: ModerationMethod;
  field: string | null;
  category: string | null;
  prompt: string;
  createdAt: string;
};

/** 管理端：内容审核拦截日志查询（按邮箱/类别/命中项模糊搜索，倒序） */
export async function listModerationLogs({
  q,
  limit,
}: {
  q?: string | null;
  limit?: number;
} = {}): Promise<ModerationLogView[]> {
  const cleanQuery = q?.trim();
  const cleanLimit = Math.min(Math.max(Number(limit) || 100, 1), 500);

  const logs = await prisma.moderationLog.findMany({
    where: cleanQuery
      ? {
          OR: [
            { userEmail: { contains: cleanQuery, mode: "insensitive" } },
            { category: { contains: cleanQuery, mode: "insensitive" } },
            { field: { contains: cleanQuery, mode: "insensitive" } },
            { prompt: { contains: cleanQuery, mode: "insensitive" } },
          ],
        }
      : {},
    orderBy: { createdAt: "desc" },
    take: cleanLimit,
  });

  return logs.map((log) => ({
    id: log.id,
    userId: log.userId,
    userEmail: log.userEmail,
    method: log.method as ModerationMethod,
    field: log.field,
    category: log.category,
    prompt: log.prompt,
    createdAt: log.createdAt.toISOString(),
  }));
}
