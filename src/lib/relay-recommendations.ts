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
    id: "302-ai",
    name: "302.AI",
    href: "https://302.ai/",
    logoSrc: "https://302.ai/favicon.ico",
    initials: "302",
    description: "AI 模型 API 与应用聚合入口，适合评估多模型、图像生成和按量使用场景。",
    tags: ["模型聚合", "图像接口", "按量"],
    accent: "#0052d9",
    accentSoft: "rgba(0, 82, 217, 0.1)",
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    href: "https://openrouter.ai/",
    logoSrc: "https://openrouter.ai/favicon.ico",
    initials: "OR",
    description: "统一 LLM 接口和模型路由平台，可用于对比多模型、价格和可用性。",
    tags: ["统一接口", "模型路由", "海外"],
    accent: "#111827",
    accentSoft: "rgba(17, 24, 39, 0.08)",
  },
  {
    id: "aihubmix",
    name: "AIHubMix",
    href: "https://aihubmix.com/",
    logoSrc: "https://aihubmix.com/favicon.ico",
    initials: "AI",
    description: "OpenAI 兼容 API 中转入口，适合需要快速接入和备用通道的场景。",
    tags: ["OpenAI 兼容", "备用通道", "中转"],
    accent: "#0f766e",
    accentSoft: "rgba(15, 118, 110, 0.1)",
  },
  {
    id: "api2d",
    name: "API2D",
    href: "https://api2d.com/",
    logoSrc: "https://api2d.com/favicon.ico",
    initials: "2D",
    description: "面向开发者的 API 中转服务，可作为 OpenAI 兼容通道的候选入口。",
    tags: ["开发者", "中转服务", "兼容接口"],
    accent: "#2563eb",
    accentSoft: "rgba(37, 99, 235, 0.1)",
  },
];
