import { getDeepSeekRuntimeConfig } from "@/lib/settings";

export type PromptPolishInput = {
  input: string;
  mode: string;
  ratio?: string;
};

export type PolishResult = {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  styleTags: string[];
  recommendedRatio: string;
  qualityHint: string;
};

export type PromptPolishOutput = {
  source: "deepseek" | "local";
  result: PolishResult;
  warning?: string;
};

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

const modeHints: Record<string, { title: string; tags: string[]; texture: string }> = {
  写实: { title: "写实摄影", tags: ["真实光影", "自然质感", "镜头语言"], texture: "真实摄影质感，主体清晰，环境细节可信" },
  商品: { title: "商品海报", tags: ["商业棚拍", "干净留白", "高级材质"], texture: "商业棚拍质感，产品边缘清晰，材质反射克制" },
  角色: { title: "角色设定", tags: ["角色轮廓", "服装细节", "氛围叙事"], texture: "角色辨识度高，服装层次完整，表情和姿态自然" },
  界面: { title: "界面概念", tags: ["拟 App", "液态玻璃", "清爽信息层级"], texture: "真实产品界面截图感，信息层级清晰，控件统一" },
  插画: { title: "插画视觉", tags: ["柔和色块", "轻量纹理", "故事感"], texture: "插画风格统一，色块干净，细节不过度堆叠" },
  建筑: { title: "建筑空间", tags: ["空间透视", "自然采光", "材质秩序"], texture: "空间透视准确，建筑材质自然，光线层次舒适" },
};

const negativeDefaults =
  "低清晰度，过度磨皮，文字乱码，多余手指，肢体错误，过曝，脏污背景，廉价塑料感，杂乱构图，明显 AI 生成痕迹";

function compactText(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function createTitle(input: string, mode: string) {
  const clean = compactText(input).replace(/[，。,.]/g, " ");
  const firstChunk = clean.split(" ").filter(Boolean).slice(0, 2).join("");
  const fallback = modeHints[mode]?.title || "画面方案";
  return firstChunk ? firstChunk.slice(0, 10) : fallback;
}

function inferRatio(input: string, ratio?: string) {
  if (ratio) {
    return ratio;
  }

  const clean = input.toLowerCase();
  if (clean.includes("手机") || clean.includes("竖版") || clean.includes("海报") || clean.includes("portrait")) {
    return "9:16";
  }
  if (clean.includes("横版") || clean.includes("banner") || clean.includes("封面") || clean.includes("桌面")) {
    return "16:9";
  }
  return "1:1";
}

function parseJsonObject(content: string) {
  const withoutFence = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("DeepSeek 返回内容不是有效 JSON。");
  }

  return JSON.parse(withoutFence.slice(start, end + 1)) as Partial<PolishResult>;
}

function normalizePolishResult(value: Partial<PolishResult>, fallback: PolishResult): PolishResult {
  return {
    title: compactText(value.title || fallback.title).slice(0, 24),
    promptZh: compactText(value.promptZh || fallback.promptZh),
    promptEn: compactText(value.promptEn || fallback.promptEn),
    negativePrompt: compactText(value.negativePrompt || fallback.negativePrompt),
    styleTags: Array.isArray(value.styleTags) && value.styleTags.length > 0 ? value.styleTags.slice(0, 6).map(String) : fallback.styleTags,
    recommendedRatio: compactText(value.recommendedRatio || fallback.recommendedRatio),
    qualityHint: compactText(value.qualityHint || fallback.qualityHint),
  };
}

export function createLocalPolishResult({ input, mode, ratio }: PromptPolishInput): PolishResult {
  const cleanInput = compactText(input);
  const hint = modeHints[mode] || modeHints.商品;
  const recommendedRatio = inferRatio(cleanInput, ratio);

  return {
    title: createTitle(cleanInput, mode),
    promptZh: `${cleanInput}。${hint.texture}，主体明确，构图留白克制，浅色自然光，背景干净，画面高级但不过度装饰，适合直接用于图片生成。`,
    promptEn: `${cleanInput}, ${hint.texture}, clear subject, restrained composition, soft natural light, clean background, premium but minimal visual style, ready for image generation.`,
    negativePrompt: negativeDefaults,
    styleTags: hint.tags,
    recommendedRatio,
    qualityHint: "建议先用标准质量生成 1-2 张候选图，再选择一张作为参考图进行高清重绘。",
  };
}

export async function polishPrompt(input: PromptPolishInput): Promise<PromptPolishOutput> {
  const config = await getDeepSeekRuntimeConfig();
  const fallback = createLocalPolishResult(input);

  if (!config.apiKey) {
    return {
      source: "local",
      result: fallback,
      warning: "未配置 DeepSeek API Key，已使用本地兜底润色。",
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
        temperature: 0.55,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: config.polishPrompt,
          },
          {
            role: "user",
            content: [
              "请根据后台系统提示词润色下面的用户输入，并只返回 JSON。",
              `用户输入：${input.input}`,
              `风格方向：${input.mode}`,
              `画幅比例：${input.ratio || "未指定"}`,
              "要求：promptZh 必须是可直接回填到输入框的中文润色结果。",
            ].join("\n"),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `DeepSeek 请求失败：${response.status}`);
    }

    const data = (await response.json()) as DeepSeekChatResponse;
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("DeepSeek 没有返回可用内容。");
    }

    return {
      source: "deepseek",
      result: normalizePolishResult(parseJsonObject(content), fallback),
    };
  } catch (error) {
    return {
      source: "local",
      result: fallback,
      warning: error instanceof Error ? `DeepSeek 调用失败，已使用本地兜底：${error.message}` : "DeepSeek 调用失败，已使用本地兜底。",
    };
  } finally {
    clearTimeout(timeout);
  }
}
