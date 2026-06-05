"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Download, ImageIcon, Search, X } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import type { GalleryImageView } from "@/lib/gallery";
import type { PromptCardData } from "@/lib/mock-data";

type ShowcaseItem = {
  id: string;
  title: string;
  summary: string;
  category: string;
  tags: string[];
  ratio: string;
  provider: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  gradient: string;
  heightClass: string;
  promptZh: string;
  promptEn?: string | null;
  negativePrompt?: string | null;
  authorName: string;
  createdAt?: string;
  isFallback: boolean;
};

type GalleryResponse = {
  ok: boolean;
  images?: GalleryImageView[];
  error?: string;
};

const categoryGradient: Record<string, string> = {
  写真: "from-slate-100 via-white to-slate-50",
  商品: "from-blue-50 via-white to-slate-50",
  角色: "from-slate-50 via-blue-50 to-white",
  界面: "from-white via-slate-50 to-blue-50",
  建筑: "from-slate-100 via-white to-blue-50",
  插画: "from-blue-50 via-slate-50 to-white",
  国风: "from-slate-50 via-white to-blue-50",
  其他: "from-white via-slate-50 to-blue-50",
};

const ratioHeight: Record<string, string> = {
  "1:1": "h-64",
  "3:4": "h-80",
  "4:3": "h-60",
  "9:16": "h-96",
  "16:9": "h-56",
};

function shortTitle(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) {
    return "生成作品";
  }

  return clean.length > 18 ? `${clean.slice(0, 18)}...` : clean;
}

function normalizeCategory(value: string) {
  if (value === "鍐欑湡") return "写真";
  if (value === "鍟嗗搧") return "商品";
  if (value === "瑙掕壊") return "角色";
  if (value === "鐣岄潰") return "界面";
  if (value === "寤虹瓚") return "建筑";
  if (value === "鎻掔敾") return "插画";
  if (value === "鍥介") return "国风";
  if (value === "鍏ㄩ儴") return "全部";
  return value || "其他";
}

function workToItem(work: GalleryImageView): ShowcaseItem {
  const category = normalizeCategory(work.category);
  return {
    id: work.id,
    title: shortTitle(work.promptZh),
    summary: work.promptZh,
    category,
    tags: [category, work.ratio, work.provider],
    ratio: work.ratio,
    provider: work.provider,
    imageUrl: work.url,
    thumbnailUrl: work.thumbnailUrl || work.url,
    gradient: categoryGradient[category] || categoryGradient.其他,
    heightClass: ratioHeight[work.ratio] || "h-64",
    promptZh: work.promptZh,
    promptEn: work.promptEn,
    negativePrompt: work.negativePrompt,
    authorName: work.authorName,
    createdAt: work.publishedAt || work.createdAt,
    isFallback: false,
  };
}

function promptToItem(prompt: PromptCardData): ShowcaseItem {
  const category = normalizeCategory(prompt.category);
  return {
    id: prompt.slug,
    title: prompt.title,
    summary: prompt.summary,
    category,
    tags: prompt.tags.map(normalizeCategory),
    ratio: prompt.ratio,
    provider: "sample",
    gradient: categoryGradient[category] || prompt.gradient,
    heightClass: prompt.heightClass,
    promptZh: prompt.promptZh,
    promptEn: prompt.promptEn,
    negativePrompt: prompt.negativePrompt,
    authorName: prompt.authorName,
    isFallback: true,
  };
}

function filterItems(items: ShowcaseItem[], query: string, category: string) {
  const keyword = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory = category === "全部" || item.category === category;
    const haystack = [item.title, item.summary, item.category, item.promptZh, item.promptEn, item.negativePrompt, ...item.tags]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesCategory && (!keyword || haystack.includes(keyword));
  });
}

export function HomeWorksShowcase({
  categories,
  initialWorks,
  fallbackPrompts,
}: {
  categories: string[];
  initialWorks: GalleryImageView[];
  fallbackPrompts: PromptCardData[];
}) {
  const normalizedCategories = useMemo(
    () => Array.from(new Set(["全部", ...categories.map(normalizeCategory)])),
    [categories],
  );
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("全部");
  const [works, setWorks] = useState(initialWorks);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);

  const fallbackItems = useMemo(() => fallbackPrompts.map(promptToItem), [fallbackPrompts]);
  const realItems = useMemo(() => works.map(workToItem), [works]);
  const usingFallback = initialWorks.length === 0 && works.length === 0;
  const visibleItems = usingFallback ? filterItems(fallbackItems, query, category) : filterItems(realItems, query, category);

  useEffect(() => {
    if (usingFallback) {
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    if (query.trim()) {
      params.set("q", query.trim());
    }
    setLoading(true);
    fetch(`/api/gallery/images?${params.toString()}`, {
      signal: controller.signal,
    })
      .then((response) => response.json() as Promise<GalleryResponse>)
      .then((payload) => {
        if (payload.ok && payload.images) {
          setWorks(payload.images);
        }
      })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") {
          setWorks(initialWorks);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      });

    return () => controller.abort();
  }, [category, initialWorks, query, usingFallback]);

  function openItem(event: React.MouseEvent<HTMLButtonElement>, item: ShowcaseItem) {
    event.currentTarget.blur();
    setSelectedItem(item);
  }

  return (
    <>
      <section className="rounded-[28px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur md:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Works</p>
            <h2 className="mt-1 text-3xl font-black tracking-[-0.05em] text-slate-950">作品展示</h2>
            <p className="mt-2 text-sm font-bold text-slate-500">{usingFallback ? "暂无公开作品，先展示一些可复用的方向。" : "来自真实生成任务的公开作品。"}</p>
          </div>
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 lg:max-w-md">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="搜索风格、场景或用途"
            />
            {loading ? <span className="h-2 w-2 rounded-full bg-[#254c73]" /> : null}
          </label>
        </div>
        <div className="mt-5 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {normalizedCategories.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black transition ${category === item ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600 hover:-translate-y-0.5 hover:text-slate-950"}`}
            >
              {item}
            </button>
          ))}
        </div>
      </section>

      {visibleItems.length > 0 ? (
        <section className="columns-1 gap-4 md:columns-2 xl:columns-3">
          {visibleItems.map((item) => (
            <div key={item.id} className="break-inside-avoid">
              <button
                type="button"
                onClick={(event) => openItem(event, item)}
                className="group mb-4 inline-block w-full overflow-hidden rounded-[24px] border border-slate-200 bg-white/88 text-left shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-app"
              >
                <div className={`relative ${item.heightClass} bg-gradient-to-br ${item.gradient} p-4`}>
                  <div className="absolute right-4 top-4 z-10 rounded-full border border-white/80 bg-white/82 px-3 py-1 text-xs font-black text-slate-600 backdrop-blur">
                    {item.ratio}
                  </div>
                  {item.thumbnailUrl ? (
                    <img src={item.thumbnailUrl} alt={item.title} className="h-full w-full rounded-[20px] border border-white/80 object-cover shadow-inner" />
                  ) : (
                    <div className="flex h-full items-end rounded-[20px] border border-white/80 bg-white/54 p-4 text-slate-900 shadow-inner backdrop-blur-sm">
                      <div>
                        <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-2xl bg-white/84 text-slate-600">
                          <ImageIcon className="h-4 w-4" />
                        </div>
                        <p className="text-xl font-black leading-tight">{item.title}</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2 p-4">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">{item.category}</p>
                  <h3 className="text-lg font-black leading-tight text-slate-950">{item.title}</h3>
                  <p className="line-clamp-2 text-sm leading-6 text-slate-500">{item.summary}</p>
                </div>
              </button>
            </div>
          ))}
        </section>
      ) : (
        <section className="rounded-[24px] border border-slate-200 bg-white/88 p-8 text-center shadow-card backdrop-blur">
          <p className="text-lg font-black text-slate-950">没有找到匹配作品</p>
          <p className="mt-2 text-sm text-slate-500">换一个关键词，或切回“全部”分类。</p>
        </section>
      )}

      {selectedItem
        ? createPortal(
            <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/18 p-3 backdrop-blur-[3px]" onClick={() => setSelectedItem(null)}>
              <div
                className="relative grid max-h-[calc(100dvh-24px)] w-[min(980px,calc(100vw-24px))] overflow-hidden rounded-[28px] border border-white/80 bg-white shadow-app md:grid-cols-[1.25fr_.9fr]"
                onClick={(event) => event.stopPropagation()}
              >
                <button type="button" onClick={() => setSelectedItem(null)} className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/60 text-white backdrop-blur">
                  <X className="h-4 w-4" />
                </button>

                <div className="flex min-h-[420px] items-center justify-center bg-slate-50 p-0">
                  {selectedItem.imageUrl ? (
                    <img src={selectedItem.imageUrl} alt={selectedItem.title} className="h-full max-h-[calc(100dvh-24px)] w-full object-contain bg-slate-50" />
                  ) : (
                    <div className={`h-full min-h-[420px] w-full bg-gradient-to-br ${selectedItem.gradient} p-6`}>
                      <div className="flex h-full min-h-[420px] items-end rounded-[24px] border border-white/80 bg-white/54 p-6 shadow-inner backdrop-blur-sm">
                        <div>
                          <p className="text-sm font-black uppercase tracking-[0.18em] text-slate-400">Preview</p>
                          <h3 className="mt-2 text-4xl font-black tracking-[-0.05em] text-slate-950">{selectedItem.title}</h3>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="max-h-[calc(100dvh-24px)] space-y-4 overflow-y-auto p-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-slate-100 text-sm font-black text-[#254c73]">
                      {selectedItem.authorName.slice(0, 1).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-slate-950">{selectedItem.authorName}</p>
                      <p className="text-xs font-bold text-slate-400">{selectedItem.isFallback ? "精选样例" : "公开作品"}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link href={`/generate?prompt=${encodeURIComponent(selectedItem.promptZh)}`} className="rounded-2xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white">
                      复用描述
                    </Link>
                    {selectedItem.imageUrl ? (
                      <a href={selectedItem.imageUrl} download className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                        <Download className="h-4 w-4" />
                        下载
                      </a>
                    ) : (
                      <button type="button" className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-500">
                        作为参考
                      </button>
                    )}
                  </div>

                  <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-black text-slate-950">提示词</p>
                      <CopyPromptButton text={selectedItem.promptZh} label="复制" className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-black text-slate-600" />
                    </div>
                    <p className="text-sm leading-7 text-slate-600">{selectedItem.promptZh}</p>
                  </div>

                  {selectedItem.negativePrompt ? (
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm font-black text-slate-950">过滤指令</p>
                      <p className="mt-3 text-sm leading-7 text-slate-500">{selectedItem.negativePrompt}</p>
                    </div>
                  ) : null}

                  <div className="space-y-2 rounded-[20px] border border-slate-200 bg-white p-4">
                    {[
                      ["类别", selectedItem.category],
                      ["画幅比例", selectedItem.ratio],
                      ["Provider", selectedItem.provider],
                      ["来源", selectedItem.isFallback ? "样例库" : "真实生成"],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-xs font-bold">
                        <span className="text-slate-400">{label}</span>
                        <span className="text-slate-700">{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory(selectedItem.category);
                      setSelectedItem(null);
                    }}
                    className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600"
                  >
                    查看同类作品
                  </button>
                </aside>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
