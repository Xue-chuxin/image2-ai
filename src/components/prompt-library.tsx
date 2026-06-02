"use client";

import { useMemo, useState } from "react";
import { Filter, Search, SlidersHorizontal } from "lucide-react";
import { PromptCard } from "@/components/prompt-card";
import type { PromptCardData } from "@/lib/mock-data";

const sortOptions = ["推荐", "浏览最多", "收藏最多"];

export function PromptLibrary({ categories, prompts }: { categories: string[]; prompts: PromptCardData[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [sort, setSort] = useState(sortOptions[0]);

  const visiblePrompts = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    const parseMetric = (value: string) => {
      const normalized = value.toLowerCase().replace("k", "");
      const number = Number.parseFloat(normalized);
      return value.toLowerCase().includes("k") ? number * 1000 : number;
    };

    return prompts
      .filter((prompt) => {
        const matchesCategory = category === "全部" || prompt.category === category;
        const matchesQuery = !keyword || [prompt.title, prompt.summary, prompt.category, ...prompt.tags, ...prompt.useCases]
          .join(" ")
          .toLowerCase()
          .includes(keyword);
        return matchesCategory && matchesQuery;
      })
      .sort((a, b) => {
        if (sort === "浏览最多") return parseMetric(b.views) - parseMetric(a.views);
        if (sort === "收藏最多") return parseMetric(b.likes) - parseMetric(a.likes);
        return prompts.indexOf(a) - prompts.indexOf(b);
      });
  }, [category, prompts, query, sort]);

  return (
    <>
      <section className="sticky top-[76px] z-30 rounded-[24px] border border-slate-200 bg-white/94 p-4 shadow-card backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="搜索风格、场景或用途"
            />
          </label>
          <div className="flex gap-2">
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
              <SlidersHorizontal className="h-4 w-4" />
              <select value={sort} onChange={(event) => setSort(event.target.value)} className="bg-transparent outline-none">
                {sortOptions.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </button>
            <button className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
              <Filter className="h-4 w-4" /> {visiblePrompts.length} 条
            </button>
          </div>
        </div>
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {categories.map((item) => (
            <button
              key={item}
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${category === item ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {visiblePrompts.length > 0 ? (
        <div className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {visiblePrompts.map((prompt) => (
            <div key={prompt.slug} className="break-inside-avoid">
              <PromptCard prompt={prompt} />
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-[24px] border border-slate-200 bg-white p-8 text-center shadow-card">
          <p className="text-lg font-black text-slate-950">没有找到匹配的灵感</p>
          <p className="mt-2 text-sm text-slate-500">换一个关键词，或切回“全部”分类。</p>
        </div>
      )}
    </>
  );
}