import {
  Bot,
  Flame,
  Heart,
  Layers,
  MessagesSquare,
  Newspaper,
  PenLine,
  Sparkles,
  Star,
  Trophy,
  Wand2,
  WandSparkles,
  Wrench,
  type LucideIcon,
} from "lucide-react";

export type AppEntry = {
  name: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  /** 内部路由；为 null 表示尚未上线（展示为「敬请期待」）。 */
  href: string | null;
};

export const APP_DIRECTORY: AppEntry[] = [
  {
    name: "创意图片生成",
    description: "输入提示词或上传参考图，生成商业级创意图片。",
    icon: Wand2,
    iconClass: "bg-brand-50 text-brand-600",
    href: "/generate",
  },
  {
    name: "智能助手",
    description: "对话式创作助手，聊着天就把提示词理清楚。",
    icon: Bot,
    iconClass: "bg-violet-50 text-violet-600",
    href: "/assistant",
  },
  {
    name: "提示词润色",
    description: "把一句话扩写成可直接生图的中/英文提示词与负向词。",
    icon: WandSparkles,
    iconClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    href: "/prompts/polish",
  },
  {
    name: "提示词库",
    description: "浏览可复用的提示词模板，一键带入创作台。",
    icon: Sparkles,
    iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    href: "/prompts",
  },
  {
    name: "批量多风格生成",
    description: "一段描述套用多个风格，一次性出多版对比。",
    icon: Layers,
    iconClass: "bg-cyan-50 text-cyan-600",
    href: "/generate/batch",
  },
  {
    name: "创作工具箱",
    description: "电商主图、模特商拍等场景化工具，带定制提示词出图。",
    icon: Wrench,
    iconClass: "bg-indigo-50 text-indigo-600",
    href: "/tools",
  },
  {
    name: "官方精选",
    description: "运营精选高质量作品，附带可复用提示词。",
    icon: Star,
    iconClass: "bg-orange-50 text-orange-500",
    href: "/curated",
  },
  {
    name: "作品排行榜",
    description: "看热门作品与活跃创作者，找灵感也找同款。",
    icon: Trophy,
    iconClass: "bg-yellow-50 text-yellow-600",
    href: "/leaderboard",
  },
  {
    name: "我的收藏",
    description: "收藏喜欢的作品与精选，随时回看复用。",
    icon: Heart,
    iconClass: "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300",
    href: "/favorites",
  },
  {
    name: "小红书爆款文案",
    description: "按笔记风格生成标题与正文，自带表情与话题标签。",
    icon: Flame,
    iconClass: "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300",
    href: "/apps/xhs-copy",
  },
  {
    name: "高情商回复",
    description: "工作群、客户沟通场景的得体回复建议。",
    icon: MessagesSquare,
    iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    href: "/apps/reply",
  },
  {
    name: "公众号标题生成器",
    description: "一段摘要生成多条风格各异的公众号标题备选。",
    icon: Newspaper,
    iconClass: "bg-cyan-50 text-cyan-600",
    href: "/apps/wechat-title",
  },
  {
    name: "全能写作助手",
    description: "文案、周报、方案大纲，一站式长文写作辅助。",
    icon: PenLine,
    iconClass: "bg-indigo-50 text-indigo-600",
    href: "/apps/writing",
  },
];

/** 把应用目录拆成「现在可用」与「即将上线」两组。 */
export function partitionApps(entries: AppEntry[] = APP_DIRECTORY): { available: AppEntry[]; upcoming: AppEntry[] } {
  return {
    available: entries.filter((entry) => entry.href !== null),
    upcoming: entries.filter((entry) => entry.href === null),
  };
}
