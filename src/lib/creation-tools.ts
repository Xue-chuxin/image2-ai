export type CreationToolCategory = "图片处理" | "电商设计" | "模特商拍";

export type CreationTool = {
  slug: string;
  name: string;
  tagline: string;
  description: string;
  category: CreationToolCategory;
  gradient: string;
  accent: string;
  /** 是否已可用。可用工具会跳转到创作页并预填提示词/参考图流程；未可用的保持「敬请期待」。 */
  available: boolean;
  /** 预填到创作页的中文提示词脚手架；为空表示不带提示词（例如以参考图为主的工具）。 */
  promptTemplate?: string;
  /** 建议画幅，仅当落在创作页支持取值内才会带上。 */
  ratio?: string;
  /** 是否以参考图为主（引导用户在创作页上传参考图）。 */
  needsReference?: boolean;
  /** 当前不可用的原因（用于展示，说明为何还没上线）。 */
  unavailableReason?: string;
};

const VALID_RATIOS = new Set(["1:1", "3:4", "16:9", "9:16"]);

export const CREATION_TOOLS: CreationTool[] = [
  {
    slug: "ecommerce-main",
    name: "电商主图",
    tagline: "白底图秒变场景主图",
    description: "按平台规范生成电商主图，自动搭配背景与光影。填入你的商品后即可出图。",
    category: "电商设计",
    gradient: "from-amber-50 via-white to-orange-50",
    accent: "text-amber-600 dark:text-amber-300",
    available: true,
    promptTemplate: "电商产品主图，[在此填写商品名称与卖点]，居中特写，干净背景，柔和棚拍光影，高级质感，留白构图，适合平台主图",
    ratio: "1:1",
  },
  {
    slug: "model-generate",
    name: "模特生成",
    tagline: "虚拟模特，风格随选",
    description: "生成不同风格与肤色的虚拟模特，配合服装展示使用。",
    category: "模特商拍",
    gradient: "from-fuchsia-50 via-white to-violet-50",
    accent: "text-fuchsia-600",
    available: true,
    promptTemplate: "专业时尚虚拟模特，[在此填写风格/肤色/服装/场景]，全身构图，自然光，杂志质感，清晰面部与服装细节",
    ratio: "3:4",
  },
  {
    slug: "wear-shot",
    name: "穿戴商拍",
    tagline: "饰品服配上身实拍感",
    description: "手表、首饰、包袋自动匹配模特佩戴场景，省去实拍成本。",
    category: "模特商拍",
    gradient: "from-violet-50 via-white to-purple-50",
    accent: "text-violet-600",
    available: true,
    promptTemplate: "模特佩戴商品实拍，[在此填写饰品/服配类型]，特写展示佩戴细节，真实棚拍光影，高级质感，干净背景",
    ratio: "3:4",
  },
  {
    slug: "sku-recolor",
    name: "SKU 换色",
    tagline: "一款多色，批量出图",
    description: "保持商品结构不变，一键生成不同配色的 SKU 展示图。可配合批量多风格生成叠加使用。",
    category: "电商设计",
    gradient: "from-indigo-50 via-white to-blue-50",
    accent: "text-indigo-600",
    available: true,
    promptTemplate: "同款商品不同配色展示图，[在此填写商品名称]，[在此填写目标颜色]，结构一致，干净背景，柔和光影，电商主图质感",
    ratio: "1:1",
  },
  {
    slug: "poster-text",
    name: "图文海报",
    tagline: "海报排版一体成型",
    description: "生成带主题氛围的海报底图，叠加标题与卖点方向，直接产出成品海报感。",
    category: "电商设计",
    gradient: "from-rose-50 via-white to-pink-50",
    accent: "text-rose-500 dark:text-rose-300",
    available: true,
    promptTemplate: "营销海报设计，[在此填写主题与卖点]，主视觉突出，预留标题与文案排版空间，高级配色，构图有层次",
    ratio: "3:4",
  },
  {
    slug: "image-replicate",
    name: "图片复刻",
    tagline: "一张图，还原同款风格",
    description: "上传参考图即可复刻构图与质感，产出同风格新图。进入创作页后上传参考图开始。",
    category: "图片处理",
    gradient: "from-blue-50 via-white to-brand-50",
    accent: "text-brand-600",
    available: true,
    needsReference: true,
  },
  {
    slug: "cutout",
    name: "商品抠图",
    tagline: "一键去底，边缘干净",
    description: "自动识别商品主体并抠出透明底。需要专用抠图（分割）模型，正在接入中。",
    category: "图片处理",
    gradient: "from-emerald-50 via-white to-teal-50",
    accent: "text-emerald-600 dark:text-emerald-300",
    available: false,
    unavailableReason: "需接入专用抠图（图像分割）模型",
  },
  {
    slug: "inpaint",
    name: "生图修图",
    tagline: "局部重绘，细节可控",
    description: "对生成结果进行局部擦除与重绘，修正瑕疵不改整体。需要专用局部重绘（inpainting）模型，正在接入中。",
    category: "图片处理",
    gradient: "from-cyan-50 via-white to-sky-50",
    accent: "text-cyan-600",
    available: false,
    unavailableReason: "需接入专用局部重绘（inpainting）模型",
  },
];

/** 把可用工具转成「去创作」链接：带提示词工具预填 prompt/ratio，以参考图为主的工具直接进创作页。 */
export function buildToolGenerateHref(tool: CreationTool): string {
  if (!tool.available) {
    return "";
  }
  const params = new URLSearchParams();
  const prompt = (tool.promptTemplate || "").trim();
  const ratio = (tool.ratio || "").trim();
  if (prompt) {
    params.set("prompt", prompt);
  }
  if (VALID_RATIOS.has(ratio)) {
    params.set("ratio", ratio);
  }
  const query = params.toString();
  return query ? `/generate?${query}` : "/generate";
}
