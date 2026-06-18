export type RelayRecommendation = {
  id: string;
  name: string;
  href: string;
  logoSrc: string;
  initials: string;
  description: string;
  tags: string[];
  accent: string;
  accentSoft: string;
};

export const relayRecommendations: RelayRecommendation[] = [
  {
    id: "mingxin-ai",
    name: "明心AI",
    href: "https://ai.apii.cn/",
    logoSrc: "https://ai.apii.cn/logo.png",
    initials: "明心",
    description: "提供 AI 模型 API 中转能力，适合需要稳定接入 OpenAI 兼容接口、快速配置备用通道的站点。",
    tags: ["OpenAI 兼容", "中转通道", "备用接口"],
    accent: "#0052d9",
    accentSoft: "rgba(0, 82, 217, 0.1)",
  },
  {
    id: "jidog-api",
    name: "极狗中转站",
    href: "https://api.jidog.com/",
    logoSrc: "https://api.jidog.com/logox.png",
    initials: "极狗",
    description: "面向开发者的 API 中转站，适合接入多模型服务、配置中转 Key，并作为生产环境的候选通道。",
    tags: ["开发者", "多模型", "生产候选"],
    accent: "#0f766e",
    accentSoft: "rgba(15, 118, 110, 0.1)",
  },
];
