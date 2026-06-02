"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ImageIcon, Search, X } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import type { PromptCardData } from "@/lib/mock-data";

export function HomeWorksShowcase({
  categories,
  prompts
}: {
  categories: string[];
  prompts: PromptCardData[];
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [selectedPrompt, setSelectedPrompt] = useState<PromptCardData | null>(null);

  const visiblePrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return prompts.filter((prompt) => {
      const matchesCategory = category === "全部" || prompt.category === category;
      const haystack = [prompt.title, prompt.summary, prompt.category, ...prompt.tags, ...prompt.useCases]
        .join(" ")
        .toLowerCase();
      return matchesCategory && (!keyword || haystack.includes(keyword));
    });
  }, [category, prompts, query]);

  return (
    <>
      <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-card md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Works</p>
            <h2 className="mt-1 text-3xl font-black tracking-tight text-slate-950">作品展示</h2>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="搜索风格、场景或用途"
            />
          </label>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${category === item ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {visiblePrompts.length > 0 ? (
        <section className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {visiblePrompts.map((prompt) => (
            <div key={prompt.slug} className="break-inside-avoid">
              <button
                type="button"
                onClick={() => setSelectedPrompt(prompt)}
                className="liquid-glass group mb-4 inline-block w-full overflow-hidden rounded-[24px] text-left transition duration-300 hover:-translate-y-1"
              >
                <div className="liquid-mask" />
                <div className={`relative ${prompt.heightClass} bg-gradient-to-br ${prompt.gradient} p-4`}>
                  <div className="absolute right-4 top-4 rounded-full border border-white/80 bg-white/70 px-3 py-1 text-xs font-black text-slate-600 backdrop-blur">
                    {prompt.ratio}
                  </div>
                  <div className="flex h-full items-end rounded-[20px] border border-white/80 bg-white/38 p-4 text-slate-900 shadow-inner backdrop-blur-sm">
                    <div>
                      <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/80 text-slate-600">
                        <ImageIcon className="h-4 w-4" />
                      </div>
                      <p className="text-xl font-black leading-tight">{prompt.visual}</p>
                    </div>
                  </div>
                </div>
                <div className="relative space-y-2 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{prompt.category}</p>
                  <h3 className="text-lg font-black leading-tight text-slate-950">{prompt.title}</h3>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-500">{prompt.summary}</p>
                </div>
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-card">
          <p className="text-lg font-black text-slate-950">没有找到匹配作品</p>
          <p className="mt-2 text-sm text-slate-500">换一个关键词，或切回“全部”分类。</p>
        </section>
      )}

      {selectedPrompt ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/24 p-3 backdrop-blur-sm">
          <div className="relative grid max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-app md:grid-cols-[1.35fr_.9fr]">
            <button
              type="button"
              onClick={() => setSelectedPrompt(null)}
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex min-h-[420px] items-center justify-center bg-slate-50 p-0">
              <div className={`h-full min-h-[420px] w-full bg-gradient-to-br ${selectedPrompt.gradient} p-6`}>
                <div className="flex h-full min-h-[420px] items-end rounded-[24px] border border-white/80 bg-white/38 p-6 shadow-inner backdrop-blur-sm">
                  <div>
                    <p className="text-sm font-black uppercase tracking-[0.22em] text-slate-400">Preview</p>
                    <h3 className="mt-2 text-4xl font-black text-slate-950">{selectedPrompt.visual}</h3>
                  </div>
                </div>
              </div>
            </div>

            <aside className="max-h-[88vh] space-y-4 overflow-y-auto p-5">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-gradient-to-br from-blue-100 to-slate-50" />
                <div>
                  <p className="font-black text-slate-950">{selectedPrompt.authorName}</p>
                  <p className="text-xs font-bold text-slate-400">创作者</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Link href={`/generate?prompt=${encodeURIComponent(selectedPrompt.promptZh)}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                  一键套用
                </Link>
                <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                  作为参考图
                </button>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-black text-slate-950">提示词</p>
                  <CopyPromptButton text={selectedPrompt.promptZh} label="复制" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600" />
                </div>
                <p className="text-sm leading-7 text-slate-600">{selectedPrompt.promptZh}</p>
              </div>

              <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-black text-slate-950">过滤指令</p>
                <p className="mt-3 text-sm leading-7 text-slate-500">{selectedPrompt.negativePrompt}</p>
              </div>

              <div className="space-y-2 rounded-[20px] border border-slate-200 bg-white p-4">
                {[
                  ["类别", selectedPrompt.category],
                  ["画幅比例", selectedPrompt.ratio],
                  ["浏览", selectedPrompt.views],
                  ["收藏", selectedPrompt.likes]
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">
                    <span className="text-slate-400">{label}</span>
                    <span className="text-slate-700">{value}</span>
                  </div>
                ))}
              </div>
            </aside>
          </div>
        </div>
      ) : null}
    </>
  );
}
