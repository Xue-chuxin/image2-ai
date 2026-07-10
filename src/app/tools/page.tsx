"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRight, Lightbulb } from "lucide-react";
import { clsx } from "clsx";

import { CREATION_TOOLS, buildToolGenerateHref, type CreationToolCategory } from "@/lib/creation-tools";

type FilterCategory = "全部" | CreationToolCategory;

const categories: FilterCategory[] = ["全部", "图片处理", "电商设计", "模特商拍"];

export default function ToolsPage() {
  const [activeCategory, setActiveCategory] = useState<FilterCategory>("全部");
  const visibleTools = activeCategory === "全部" ? CREATION_TOOLS : CREATION_TOOLS.filter((tool) => tool.category === activeCategory);

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <div className="flex flex-col gap-3 rounded-2xl border border-line bg-panel p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 dark:bg-amber-500/10 text-amber-500">
            <Lightbulb size={19} />
          </span>
          <div>
            <p className="text-[15px] font-bold text-ink">创作工具箱</p>
            <p className="mt-0.5 text-sm text-ink-secondary">面向电商与商拍的快捷工具，点击即带着专属提示词进入创作页出图。</p>
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
                active ? "border-brand-500 bg-brand-500 text-white shadow-chip" : "border-line bg-panel text-ink-secondary hover:bg-page",
              )}
            >
              {category}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {visibleTools.map((tool) => {
          const inner = (
            <>
              <span
                className={clsx(
                  "absolute right-3 top-3 z-10 rounded-full px-2 py-0.5 text-xs font-semibold",
                  tool.available ? "bg-brand-50 text-brand-600" : "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
                )}
              >
                {tool.available ? "可用" : "敬请期待"}
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
                {tool.available ? (
                  <span className="inline-flex items-center gap-1 pt-1 text-[13px] font-semibold text-brand-600">
                    {tool.needsReference ? "进入创作页并上传参考图" : "去创作"}
                    <ArrowRight size={13} />
                  </span>
                ) : tool.unavailableReason ? (
                  <p className="pt-1 text-xs text-ink-faint">{tool.unavailableReason}</p>
                ) : null}
              </div>
            </>
          );

          const baseClass = "group relative overflow-hidden rounded-2xl border border-line bg-panel shadow-card transition duration-200";

          if (tool.available) {
            return (
              <Link key={tool.slug} href={buildToolGenerateHref(tool)} className={clsx(baseClass, "hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop")}>
                {inner}
              </Link>
            );
          }

          return (
            <div key={tool.slug} className={clsx(baseClass, "cursor-default")}>
              {inner}
            </div>
          );
        })}
      </div>
    </main>
  );
}
