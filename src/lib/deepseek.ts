export type PolishMode = "写真" | "商品" | "角色" | "界面" | "插画" | "建筑";

export type PolishedPrompt = {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  styleTags: string[];
  recommendedRatio: string;
  qualityHint: string;
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string | null;
    };
  }>;
};

const polishSystemPrompt = [
  "你是图片创作平台的描述整理助手。",
  "你的任务不是夸张营销，而是把用户的一句话整理成清楚、可执行、适合图片生成的描述。",
  "保持中文自然、简洁、具体。",
  "不要输出解释，不要输出 Markdown，只输出 JSON。",
  "JSON 字段必须包含：title, promptZh, promptEn, negativePrompt, styleTags, recommendedRatio, qualityHint。",
  "styleTags 必须是字符串数组，recommendedRatio 可用 1:1、3:4、16:9、9:16，qualityHint 可用 standard 或 high。"
].join("\n");

function getDeepSeekConfig() {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/+$/, "");
  const model = process.env.DEEPSEEK_MODEL || "deepseek-v4-flash";

  if (!apiKey) {
    throw new Error("缺少 DEEPSEEK_API_KEY，请先在环境变量中配置 DeepSeek API Key。");
  }

  return { apiKey, baseUrl, model };
}

function parsePolishedPrompt(content: string): PolishedPrompt {
  const parsed = JSON.parse(content) as Partial<PolishedPrompt>;

  return {
    title: String(parsed.title || "未命名画面"),
    promptZh: String(parsed.promptZh || ""),
    promptEn: String(parsed.promptEn || ""),
    negativePrompt: String(parsed.negativePrompt || ""),
    styleTags: Array.isArray(parsed.styleTags) ? parsed.styleTags.map(String).slice(0, 8) : [],
    recommendedRatio: String(parsed.recommendedRatio || "1:1"),
    qualityHint: String(parsed.qualityHint || "standard")
  };
}

export async function polishPrompt(input: string, mode: PolishMode): Promise<PolishedPrompt> {
  const trimmedInput = input.trim();
  if (!trimmedInput) {
    throw new Error("请输入需要整理的画面描述。");
  }

  const { apiKey, baseUrl, model } = getDeepSeekConfig();
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "system",
          content: polishSystemPrompt
        },
        {
          role: "user",
          content: [
            `创作方向：${mode}`,
            `用户原始描述：${trimmedInput}`,
            "请整理成适合图片生成的描述。"
          ].join("\n")
        }
      ],
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      temperature: 0.4,
      max_tokens: 900,
      stream: false
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`DeepSeek 请求失败：${response.status} ${errorText.slice(0, 240)}`);
  }

  const data = (await response.json()) as DeepSeekChatResponse;
  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("DeepSeek 没有返回可用内容。");
  }

  return parsePolishedPrompt(content);
}
