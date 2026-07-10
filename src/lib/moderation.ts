import { getDeepSeekRuntimeConfig, getModerationRuntimeConfig, type ModerationRuntimeConfig } from "@/lib/settings";

export type ModerationTextInput = {
  value?: string | null;
  label?: string;
};

export type ModerationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
      field?: string;
    };

function normalizeForMatch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseForbiddenWords(value: string) {
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

function checkForbiddenWords(inputs: ModerationTextInput[], config: ModerationRuntimeConfig): ModerationResult {
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
    const matched = forbiddenWords.some((word) => normalizedValue.includes(normalizeForMatch(word)));

    if (matched) {
      return {
        ok: false,
        message: config.blockMessage,
        field: input.label,
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

function parseSemanticVerdict(content: string): { allowed: boolean } {
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

  const parsed = JSON.parse(withoutFence.slice(start, end + 1)) as { allowed?: unknown };
  // 缺字段时按“通过”处理，避免误伤（真正违规时模型会明确给出 allowed=false）。
  return { allowed: parsed.allowed !== false };
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
      return { ok: false, message: config.blockMessage };
    }

    return { ok: true };
  } catch (error) {
    console.error("语义审核调用失败，已放行：", error instanceof Error ? error.message : error);
    return { ok: true };
  } finally {
    clearTimeout(timeout);
  }
}

export async function checkModerationText(inputs: ModerationTextInput[]): Promise<ModerationResult> {
  const config = await getModerationRuntimeConfig();

  if (!config.enabled) {
    return { ok: true };
  }

  const keywordResult = checkForbiddenWords(inputs, config);
  if (!keywordResult.ok) {
    return keywordResult;
  }

  if (config.semanticEnabled) {
    return checkSemanticModeration(inputs, config);
  }

  return { ok: true };
}
