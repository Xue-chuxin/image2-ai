"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { clsx } from "clsx";

type ToolCategory = "全部" | "图片处理" | "电商设计" | "模特商拍";

const categories: ToolCategory[] = ["全部", "图片处理", "电商设计", "模特商拍"];

type ToolCard = {
  name: string;
  tagline: string;
  description: string;
  category: Exclude<ToolCategory, "全部">;
  gradient: string;
  accent: string;
};

const tools: ToolCard[] = [
  {
    name: "图片复刻",
    tagline: "一张图，还原同款风格",
    description: "上传参考图即可复刻构图与质感，快速产出同风格新图。",
    category: "图片处理",
    gradient: "from-blue-50 via-white to-brand-50",
    accent: "text-brand-600",
  },
  {
    name: "穿戴商拍",
    tagline: "饰品服配上身实拍感",
    description: "手表、首饰、包袋自动匹配模特佩戴场景，省去实拍成本。",
    category: "模特商拍",
    gradient: "from-violet-50 via-white to-purple-50",
    accent: "text-violet-600",
  },
  {
    name: "商品抠图",
    tagline: "一键去底，边缘干净",
    description: "自动识别商品主体并抠出透明底，支持批量处理。",
    category: "图片处理",
    gradient: "from-emerald-50 via-white to-teal-50",
    accent: "text-emerald-600 dark:text-emerald-300",
  },
  {
    name: "生图修图",
    tagline: "局部重绘，细节可控",
    description: "对生成结果进行局部擦除与重绘，修正瑕疵不改整体。",
    category: "图片处理",
    gradient: "from-cyan-50 via-white to-sky-50",
    accent: "text-cyan-600",
  },
  {
    name: "电商主图",
    tagline: "白底图秒变场景主图",
    description: "按平台规范生成电商主图，自动搭配背景与光影。",
    category: "电商设计",
    gradient: "from-amber-50 via-white to-orange-50",
    accent: "text-amber-600 dark:text-amber-300",
  },
  {
    name: "图文编辑",
    tagline: "海报文案排版一体",
    description: "在生成图上叠加标题与卖点文字，直接输出成品海报。",
    category: "电商设计",
    gradient: "from-rose-50 via-white to-pink-50",
    accent: "text-rose-500 dark:text-rose-300",
  },
  {
    name: "SKU 换色",
    tagline: "一款多色，批量出图",
    description: "保持商品结构不变，一键生成全色系 SKU 展示图。",
    category: "电商设计",
    gradient: "from-indigo-50 via-white to-blue-50",
    accent: "text-indigo-600",
  },
  {
    name: "模特生成",
    tagline: "虚拟模特，风格随选",
    description: "生成不同风格与肤色的虚拟模特，配合服装展示使用。",
    category: "模特商拍",
    gradient: "from-fuchsia-50 via-white to-violet-50",
    accent: "text-fuchsia-600",
  },
];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<ToolCategory>("全部");
  const visibleTools = activeCategory === "全部" ? tools : tools.filter((tool) => tool.category === activeCategory);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <Lightbulb size={19} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">更多工具正在规划中</p>
            <p className="mt-0.5 text-sm text-ink-secondary">以下工具将陆续上线，当前可先使用「专业绘画」完成创作。</p>
          </div>
        </div>
        <Link
          href="/generate"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
        >
          去专业绘画
          <ArrowRight size={15} />
        </Link>
      </div>

      <div className="flex flex-wrap gap-2" role="tablist" aria-label="工具分类">
        {categories.map((category) => {
          const active = category === activeCategory;
          return (
            <button
              key={category}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveCategory(category)}
              className={clsx(
                "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition",
                active
                  ? "border-brand-500 bg-brand-500 text-white shadow-chip"
                  : "border-line bg-panel text-ink-secondary hover:bg-page",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {visibleTools.map((tool) => (
          <div
            key={tool.name}
            className="group relative cursor-default overflow-hidden rounded-2xl border border-line bg-panel shadow-card transition duration-200 hover:-translate-y-1 hover:shadow-pop"
          >
            <span className="absolute right-3 top-3 z-10 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-300">
              敬请期待
            </span>
            <div className={clsx("flex h-32 flex-col items-center justify-center gap-1.5 bg-gradient-to-br px-4 dark:bg-none dark:bg-white/[0.04]", tool.gradient)}>
              <p className={clsx("text-2xl font-extrabold tracking-wide dark:text-ink", tool.accent)}>{tool.name}</p>
              <p className="text-xs font-medium text-ink-faint">{tool.tagline}</p>
            </div>
            <div className="space-y-1.5 p-4">
              <div className="flex items-center gap-2">
                <h3 className="text-[15px] font-bold text-ink">{tool.name}</h3>
                <span className="rounded-md bg-page px-1.5 py-0.5 text-[11px] font-medium text-ink-faint">{tool.category}</span>
              </div>
              <p className="text-[13px] leading-5 text-ink-secondary">{tool.description}</p>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
