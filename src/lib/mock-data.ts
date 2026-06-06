import { IMAGE_GALLERY_CATEGORIES } from "@/lib/image-categories";

export type PromptCardData = {
  slug: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  views: string;
  likes: string;
  visual: string;
  gradient: string;
  ratio: string;
  heightClass: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  sourceName: string;
  sourceUrl: string;
  authorName: string;
  licenseNote: string;
  useCases: string[];
};

export const categories = [...IMAGE_GALLERY_CATEGORIES];

export const promptCards: PromptCardData[] = [
  {
    slug: "blue-product-poster",
    title: "蓝白产品海报",
    summary: "白底、冷光、玻璃反射，适合电商主图和品牌物料。",
    category: "商品",
    tags: ["蓝白", "产品", "留白"],
    views: "18.2k",
    likes: "1.4k",
    visual: "蓝白产品海报",
    gradient: "from-slate-50 via-blue-50 to-white",
    ratio: "1:1",
    heightClass: "h-56",
    promptZh: "一张蓝白色产品海报，主体是一台玻璃质感咖啡机，白色棚拍背景，冷蓝色边缘光，干净留白，高级商业摄影，柔和反射，产品居中，画面清爽。",
    promptEn: "A clean blue and white product poster featuring a glass-textured coffee machine, white studio background, cool blue rim light, generous negative space, premium commercial photography, soft reflections, centered product composition.",
    negativePrompt: "杂乱背景，过度霓虹，文字水印，低清晰度，变形产品，廉价塑料质感",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["电商主图", "品牌海报", "新品预热"]
  },
  {
    slug: "cinematic-portrait-rain",
    title: "雨夜人像写真",
    summary: "湿润街面、柔和侧光、浅景深，适合头像和封面。",
    category: "写真",
    tags: ["写真", "夜景", "柔光"],
    views: "12.7k",
    likes: "982",
    visual: "雨夜人像写真",
    gradient: "from-blue-50 via-slate-100 to-white",
    ratio: "3:4",
    heightClass: "h-72",
    promptZh: "雨夜街头的人像写真，湿润路面反射蓝色灯光，人物半身构图，柔和侧光，浅景深，真实皮肤质感，安静情绪，电影摄影风格。",
    promptEn: "A cinematic rainy-night street portrait, wet pavement reflecting soft blue light, half-body framing, gentle side lighting, shallow depth of field, natural skin texture, quiet mood, editorial photography style.",
    negativePrompt: "塑料皮肤，过度磨皮，夸张表情，多余手指，强烈霓虹，文字",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["头像", "社交封面", "人物写真"]
  },
  {
    slug: "ink-fantasy-character",
    title: "国风角色设定",
    summary: "冷雾、长袍、东方幻想氛围，适合角色卡和封面。",
    category: "角色",
    tags: ["国风", "角色", "设定"],
    views: "9.6k",
    likes: "733",
    visual: "国风角色设定",
    gradient: "from-sky-50 via-cyan-50 to-white",
    ratio: "9:16",
    heightClass: "h-80",
    promptZh: "国风玄幻角色设定图，冷雾背景，长袍随风，银蓝色配饰，东方幻想气质，站姿稳定，角色轮廓清晰，适合作为小说封面或游戏角色卡。",
    promptEn: "A Chinese fantasy character design sheet, cool mist background, flowing long robe, silver-blue accessories, eastern fantasy atmosphere, stable standing pose, clear character silhouette, suitable for novel cover or game character card.",
    negativePrompt: "低质量线条，复杂脏背景，现代服装，文字水印，身体比例错误",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["小说封面", "角色卡", "游戏设定"]
  },
  {
    slug: "mobile-app-concept",
    title: "移动界面样机",
    summary: "清爽卡片、浅色蓝调，适合 App 首屏和功能展示。",
    category: "界面",
    tags: ["App", "蓝白", "UI"],
    views: "8.4k",
    likes: "621",
    visual: "移动界面样机",
    gradient: "from-white via-blue-50 to-slate-50",
    ratio: "16:9",
    heightClass: "h-48",
    promptZh: "一个浅色移动应用界面样机，蓝白色调，圆角卡片，干净导航，玻璃质感面板，展示图片创作工作流，界面清晰但不出现可读文字。",
    promptEn: "A light mobile app interface mockup, blue and white palette, rounded cards, clean navigation, glass-like panels, showing an image creation workflow, clear interface layout without readable text.",
    negativePrompt: "真实品牌标志，可读文字，杂乱按钮，深色霓虹，过度科幻",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["App 首屏", "功能展示", "产品样机"]
  },
  {
    slug: "kids-book-ocean",
    title: "海洋主题绘本",
    summary: "温柔色彩、可爱角色、干净构图，适合绘本和亲子品牌。",
    category: "插画",
    tags: ["绘本", "海洋", "温柔"],
    views: "6.9k",
    likes: "488",
    visual: "海洋绘本场景",
    gradient: "from-cyan-50 via-blue-50 to-white",
    ratio: "4:3",
    heightClass: "h-64",
    promptZh: "海洋主题儿童绘本场景，温柔蓝色调，小海豚和小鲸鱼在浅海里游动，表情友好，画面干净，柔软边缘，适合亲子故事书。",
    promptEn: "A gentle ocean-themed children's storybook scene, soft blue palette, a small dolphin and whale swimming in shallow sea, friendly expressions, clean composition, soft edges, suitable for a parent-child storybook.",
    negativePrompt: "恐怖表情，杂乱背景，尖锐边缘，暗色调，文字水印",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["绘本页", "亲子品牌", "插画封面"]
  },
  {
    slug: "minimal-still-life",
    title: "极简静物摄影",
    summary: "白底、浅蓝阴影、适合美妆、饮品、包装和静物摄影。",
    category: "商品",
    tags: ["静物", "白底", "包装"],
    views: "5.8k",
    likes: "402",
    visual: "极简静物摄影",
    gradient: "from-white via-slate-50 to-blue-50",
    ratio: "1:1",
    heightClass: "h-52",
    promptZh: "极简静物摄影，一组白色包装瓶放在浅蓝阴影中，干净背景，柔和自然光，精致边缘，高级生活方式杂志风格。",
    promptEn: "Minimal still life photography, a set of white packaging bottles placed in soft pale blue shadows, clean background, gentle natural light, refined edges, premium lifestyle magazine style.",
    negativePrompt: "脏污背景，强烈反光，廉价塑料，文字水印，过度饱和",
    sourceName: "内部示例",
    sourceUrl: "",
    authorName: "造图台",
    licenseNote: "项目内部示例数据，可替换为真实授权来源。",
    useCases: ["美妆主图", "饮品包装", "生活方式摄影"]
  }
];

export function getPromptBySlug(slug: string) {
  return promptCards.find((prompt) => prompt.slug === slug);
}

export const recentJobs = [
  {
    id: "job_001",
    status: "COMPLETED",
    title: "蓝白产品海报",
    prompt: "A clean blue product poster with glass reflections, premium studio lighting, white background.",
    cost: 5
  },
  {
    id: "job_002",
    status: "GENERATING",
    title: "移动界面样机",
    prompt: "Futuristic mobile app interface, blue and white palette, soft glass cards, product mockup.",
    cost: 12
  },
  {
    id: "job_003",
    status: "FAILED",
    title: "海洋绘本场景",
    prompt: "Friendly ocean animals in a clean storybook scene, soft blue palette, warm expression.",
    cost: 0
  }
];
