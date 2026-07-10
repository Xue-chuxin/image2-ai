import { getDeepSeekRuntimeConfig } from "@/lib/settings";

export type TextToolSlug = "xhs-copy" | "reply" | "wechat-title" | "writing";

export type TextToolOption = {
  value: string;
  label: string;
};

export type TextToolOptionGroup = {
  key: string;
  label: string;
  choices: TextToolOption[];
};

export type TextToolDef = {
  slug: TextToolSlug;
  name: string;
  tagline: string;
  description: string;
  inputLabel: string;
  placeholder: string;
  /** 是否带小标题（如小红书标题、公众号标题）。用于前端展示与本地兜底。 */
  withTitle: boolean;
  option?: TextToolOptionGroup;
  maxInput: number;
  /** 传给 DeepSeek 的系统提示词，要求只返回 JSON。 */
  systemPrompt: string;
};

/** 前端安全视图：不含 systemPrompt 等服务端字段。 */
export type TextToolClientView = Pick<
  TextToolDef,
  "slug" | "name" | "tagline" | "description" | "inputLabel" | "placeholder" | "withTitle" | "option" | "maxInput"
>;

export type TextToolItem = {
  title?: string;
  content: string;
};

export type TextToolOutput = {
  source: "deepseek" | "local";
  items: TextToolItem[];
  warning?: string;
};

const JSON_FORMAT_HINT =
  '只返回 JSON，格式为 {"items":[{"title":"可选小标题","content":"正文"}]}，不要输出多余解释或代码块围栏。';

export const TEXT_TOOLS: TextToolDef[] = [
  {
    slug: "xhs-copy",
    name: "小红书爆款文案",
    tagline: "标题 + 正文 + 话题",
    description: "输入产品/主题，生成带表情、话题标签的小红书笔记，可挑选风格方向。",
    inputLabel: "笔记主题",
    placeholder: "例如：平价油皮适用的控油散粉，闷热夏天也不脱妆。",
    withTitle: true,
    maxInput: 800,
    option: {
      key: "style",
      label: "笔记风格",
      choices: [
        { value: "种草", label: "种草安利" },
        { value: "测评", label: "真实测评" },
        { value: "教程", label: "干货教程" },
        { value: "情绪", label: "情绪共鸣" },
      ],
    },
    systemPrompt: [
      "你是资深小红书爆款文案写手，擅长写吸引点击、真诚不夸大的中文笔记。",
      "请根据用户给的主题与风格，生成 3 条不同角度的小红书笔记备选。",
      "每条包含：title（12 字内、带 1-2 个 emoji 的爆款标题）、content（正文，含分点、适度 emoji，结尾附 3-5 个 #话题标签）。",
      "语气真实亲切，避免虚假承诺与违禁词。" + JSON_FORMAT_HINT,
    ].join("\n"),
  },
  {
    slug: "reply",
    name: "高情商回复",
    tagline: "得体 · 分寸 · 多版本",
    description: "把想表达的意思变成得体回复，适配领导、客户、同事等不同对象。",
    inputLabel: "对方消息 / 你想表达的意思",
    placeholder: "例如：领导临时让我周末加班，但我已有家庭安排，想婉拒。",
    withTitle: true,
    maxInput: 800,
    option: {
      key: "scene",
      label: "沟通对象",
      choices: [
        { value: "领导", label: "对领导" },
        { value: "客户", label: "对客户" },
        { value: "同事", label: "对同事" },
        { value: "朋友", label: "对朋友" },
      ],
    },
    systemPrompt: [
      "你是高情商沟通顾问，擅长把生硬或情绪化的表达改写为得体、有分寸的中文回复。",
      "请根据用户的情境与沟通对象，给出 3 条语气不同（如：诚恳、委婉、专业）的回复备选。",
      "每条包含：title（该版本的语气标签，如「诚恳版」）、content（可直接发送的完整回复）。",
      "保持真诚、尊重、边界清晰，不卑不亢。" + JSON_FORMAT_HINT,
    ].join("\n"),
  },
  {
    slug: "wechat-title",
    name: "公众号标题生成器",
    tagline: "一段摘要 · 多条标题",
    description: "输入文章摘要或主题，生成多条风格各异、吸引点击的公众号标题。",
    inputLabel: "文章摘要 / 主题",
    placeholder: "例如：一篇讲职场新人如何快速建立信任、拿到关键项目的文章。",
    withTitle: false,
    maxInput: 800,
    option: {
      key: "style",
      label: "标题风格",
      choices: [
        { value: "干货", label: "干货实用" },
        { value: "悬念", label: "悬念好奇" },
        { value: "情绪", label: "情绪共鸣" },
        { value: "数字", label: "数字盘点" },
      ],
    },
    systemPrompt: [
      "你是公众号爆款标题策划，熟悉不同风格标题的点击心理。",
      "请根据用户的文章摘要与风格偏好，生成 6 条 30 字内、可直接使用的中文标题。",
      "每条只需 content（标题本身），不要 title。标题真实不做标题党式虚假承诺。" + JSON_FORMAT_HINT,
    ].join("\n"),
  },
  {
    slug: "writing",
    name: "全能写作助手",
    tagline: "朋友圈 · 周报 · 大纲",
    description: "文案、周报、方案大纲等长短文写作辅助，选好体裁一键成稿。",
    inputLabel: "写作需求",
    placeholder: "例如：帮我写一条产品上新的朋友圈文案，突出限时优惠与稀缺感。",
    withTitle: false,
    maxInput: 1200,
    option: {
      key: "type",
      label: "体裁",
      choices: [
        { value: "朋友圈", label: "朋友圈文案" },
        { value: "周报", label: "工作周报" },
        { value: "方案大纲", label: "方案大纲" },
        { value: "活动文案", label: "活动文案" },
      ],
    },
    systemPrompt: [
      "你是全能中文写作助手，能按不同体裁产出结构清晰、可直接使用的文字。",
      "请根据用户的写作需求与体裁，产出 1-2 版成稿备选。",
      "每版包含：content（完整内容，可含分点/小标题）。可用 title 标注版本名（如「简洁版」）。",
      "语言自然流畅，符合中文表达习惯。" + JSON_FORMAT_HINT,
    ].join("\n"),
  },
];

export function getTextTool(slug: string): TextToolDef | null {
  return TEXT_TOOLS.find((tool) => tool.slug === slug) ?? null;
}

export function toTextToolClientView(tool: TextToolDef): TextToolClientView {
  const { slug, name, tagline, description, inputLabel, placeholder, withTitle, option, maxInput } = tool;
  return { slug, name, tagline, description, inputLabel, placeholder, withTitle, option, maxInput };
}

function compactText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

/** 清洗用户输入：折叠空白并按工具上限截断。 */
export function sanitizeTextToolInput(raw: unknown, maxInput: number): string {
  if (typeof raw !== "string") {
    return "";
  }
  return raw.trim().slice(0, maxInput);
}

/** 校验并归一化用户选择的 option 值；非法或未提供时返回该组第一个默认值（无 option 则返回空串）。 */
export function normalizeTextToolOption(tool: TextToolDef, raw: unknown): string {
  if (!tool.option) {
    return "";
  }
  const value = typeof raw === "string" ? raw.trim() : "";
  const matched = tool.option.choices.find((choice) => choice.value === value);
  return matched ? matched.value : tool.option.choices[0].value;
}

const MAX_ITEMS = 8;

/** 解析 DeepSeek 返回的 JSON，提取 items 数组；无效则抛错由调用方兜底。 */
export function parseTextToolItems(content: string): TextToolItem[] {
  const withoutFence = content
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new Error("返回内容不是有效 JSON。");
  }

  const parsed = JSON.parse(withoutFence.slice(start, end + 1)) as { items?: unknown };
  const rawItems = Array.isArray(parsed.items) ? parsed.items : [];

  const items: TextToolItem[] = [];
  for (const entry of rawItems) {
    if (!entry || typeof entry !== "object") {
      continue;
    }
    const rawTitle = (entry as { title?: unknown }).title;
    const rawContent = (entry as { content?: unknown }).content;
    const rawText = (entry as { text?: unknown }).text;
    const contentValue = compactText(String(typeof rawContent === "string" ? rawContent : typeof rawText === "string" ? rawText : ""));
    if (!contentValue) {
      continue;
    }
    const titleValue = typeof rawTitle === "string" ? compactText(rawTitle).slice(0, 40) : "";
    items.push(titleValue ? { title: titleValue, content: contentValue } : { content: contentValue });
    if (items.length >= MAX_ITEMS) {
      break;
    }
  }

  if (items.length === 0) {
    throw new Error("返回内容不包含可用结果。");
  }
  return items;
}

/** 本地兜底：未配置 DeepSeek 或调用失败时，给出可用但简单的结果。 */
export function createLocalTextResult(tool: TextToolDef, input: string, option: string): TextToolItem[] {
  const clean = compactText(input);
  const optionLabel = tool.option?.choices.find((choice) => choice.value === option)?.label ?? "";
  const prefix = optionLabel ? `【${optionLabel}】` : "";

  switch (tool.slug) {
    case "xhs-copy":
      return [
        {
          title: `${prefix}${clean.slice(0, 10)}分享`,
          content: `${clean}\n\n真实体验分享，附上我的使用感受与小建议，姐妹们可以按需参考～\n#日常分享 #好物推荐 #经验帖`,
        },
      ];
    case "reply":
      return [
        {
          title: "诚恳版",
          content: `谢谢你的信息。关于「${clean}」，我的想法是：先表达理解与感谢，再如实说明我的实际情况与考虑，最后一起商量一个双方都合适的方案。`,
        },
      ];
    case "wechat-title":
      return [
        { content: `${clean.slice(0, 20)}：这几点，很多人都做错了` },
        { content: `关于${clean.slice(0, 16)}，我总结了 5 条实用经验` },
        { content: `${clean.slice(0, 18)}，看完这篇就够了` },
      ];
    case "writing":
    default:
      return [
        {
          title: "简洁版",
          content: `围绕「${clean}」${prefix ? `（${optionLabel}）` : ""}的初稿：\n1. 开头点题，说明背景与目的；\n2. 主体分点展开关键信息；\n3. 结尾给出行动号召或总结。\n\n（当前为本地兜底草稿，配置 DeepSeek 后可获得更完整的成稿。）`,
        },
      ];
  }
}

type DeepSeekChatResponse = {
  choices?: Array<{
    message?: {
      content?: string;
    };
  }>;
};

export async function runTextTool(tool: TextToolDef, input: string, option: string): Promise<TextToolOutput> {
  const config = await getDeepSeekRuntimeConfig();
  const fallbackItems = createLocalTextResult(tool, input, option);

  if (!config.apiKey) {
    return {
      source: "local",
      items: fallbackItems,
      warning: "未配置 DeepSeek API Key，已使用本地兜底生成。",
    };
  }

  const optionLabel = tool.option?.choices.find((choice) => choice.value === option)?.label ?? "";
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
        temperature: 0.8,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: tool.systemPrompt },
          {
            role: "user",
            content: [
              `${tool.inputLabel}：${input}`,
              tool.option ? `${tool.option.label}：${optionLabel || "不限"}` : "",
              "请只返回 JSON。",
            ]
              .filter(Boolean)
              .join("\n"),
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

    return { source: "deepseek", items: parseTextToolItems(content) };
  } catch (error) {
    return {
      source: "local",
      items: fallbackItems,
      warning: error instanceof Error ? `DeepSeek 调用失败，已使用本地兜底：${error.message}` : "DeepSeek 调用失败，已使用本地兜底。",
    };
  } finally {
    clearTimeout(timeout);
  }
}
