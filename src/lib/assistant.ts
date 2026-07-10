import { getDeepSeekRuntimeConfig } from "@/lib/settings";

export type AssistantRole = "user" | "assistant";

export type AssistantMessage = {
  role: AssistantRole;
  content: string;
};

export type AssistantChatOutput = {
  reply: string;
  suggestedPrompt: string | null;
  source: "deepseek" | "local";
  warning?: string;
};

/** 助手在给出可直接生图的最终提示词时，使用该标记单独起一行，便于前端提取「去创作」。 */
export const ASSISTANT_PROMPT_MARKER = "【提示词】";

const MAX_MESSAGES = 20;
const MAX_CONTENT = 2000;

export function buildAssistantSystemPrompt(): string {
  return [
    "你是「造图台」的 AI 创作助手，专门帮助中文用户把模糊的想法变成可直接用于文生图的提示词。",
    "请用简洁、友好的中文对话：先理解用户想要的画面，必要时主动追问主体、风格、场景、光线、氛围或画幅等关键信息。",
    "当你已经收集到足够信息、可以给出一版可直接生图的方案时，请在回复的最后单独起一行，以" +
      `「${ASSISTANT_PROMPT_MARKER}」开头，后面紧跟一段完整的中文提示词（一行内写完，不要再分行）。`,
    "提示词要求：主体清晰、包含风格与画面细节、可直接复制使用；不要输出解释性文字在该行内。",
    "如果信息还不够，就先提问，不要强行给出" + ASSISTANT_PROMPT_MARKER + "。",
  ].join("\n");
}

/** 从助手回复中提取被标记的建议提示词；未标记或为空返回 null。 */
export function extractSuggestedPrompt(reply: string): string | null {
  if (!reply) {
    return null;
  }
  const index = reply.lastIndexOf(ASSISTANT_PROMPT_MARKER);
  if (index === -1) {
    return null;
  }
  const after = reply.slice(index + ASSISTANT_PROMPT_MARKER.length);
  // 取标记之后、到下一处空行（或结尾）之间的内容作为提示词。
  const untilBlank = after.split(/\n\s*\n/)[0] ?? "";
  const cleaned = untilBlank.replace(/\s+/g, " ").trim();
  return cleaned || null;
}

/** 清洗前端传来的会话历史：仅保留合法角色与非空内容，裁剪长度并只取最近若干条。 */
export function sanitizeAssistantMessages(raw: unknown): AssistantMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const cleaned: AssistantMessage[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") {
      continue;
    }
    if (typeof content !== "string") {
      continue;
    }
    const trimmed = content.trim().slice(0, MAX_CONTENT);
    if (!trimmed) {
      continue;
    }
    cleaned.push({ role, content: trimmed });
  }
  return cleaned.slice(-MAX_MESSAGES);
}

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function runAssistantChat(messages: AssistantMessage[]): Promise<AssistantChatOutput> {
  const config = await getDeepSeekRuntimeConfig();

  if (!config.apiKey) {
    return {
      reply: "AI 助手暂未配置（缺少 DeepSeek API Key）。你可以先到「提示词润色」整理描述，或直接到「专业绘画」开始创作。",
      suggestedPrompt: null,
      source: "local",
      warning: "未配置 DeepSeek API Key。",
    };
  }

  const baseUrl = config.baseUrl.replace(/\/$/, "");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.DEEPSEEK_TIMEOUT_MS || 30000));

  try {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.7,
        messages: [{ role: "system", content: buildAssistantSystemPrompt() }, ...messages],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `DeepSeek 请求失败：${response.status}`);
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const reply = data.choices?.[0]?.message?.content?.trim();

    if (!reply) {
      throw new Error("DeepSeek 没有返回可用内容。");
    }

    return {
      reply,
      suggestedPrompt: extractSuggestedPrompt(reply),
      source: "deepseek",
    };
  } catch (error) {
    return {
      reply: "助手暂时无法回复，请稍后再试。你也可以直接到「专业绘画」开始创作。",
      suggestedPrompt: null,
      source: "local",
      warning: error instanceof Error ? error.message : "DeepSeek 调用失败。",
    };
  } finally {
    clearTimeout(timeout);
  }
}
