"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Download, Search, X } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";
import type { GalleryImageView } from "@/lib/gallery";
import type { PromptCardData } from "@/lib/mock-data";
import { hasChineseText, toPublicChineseTags, toPublicChineseText } from "@/lib/public-display";

type ShowcaseItem = {
  id: string;
  sourceType: "generated" | "curated" | "sample";
  title: string;
  summary: string;
  category: string;
  tags: string[];
  ratio: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  gradient: string;
  aspectClass: string;
  promptZh: string;
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
  写真: "from-slate-200 via-slate-100 to-white",
  商品: "from-brand-100 via-brand-50 to-white",
  角色: "from-violet-100 via-violet-50 to-white",
  界面: "from-cyan-100 via-cyan-50 to-white",
  建筑: "from-stone-200 via-stone-100 to-white",
  插画: "from-rose-100 via-rose-50 to-white",
  国风: "from-emerald-100 via-emerald-50 to-white",
  其他: "from-slate-100 via-white to-brand-50",
};

const ratioAspect: Record<string, string> = {
  "1:1": "aspect-square",
  "2:3": "aspect-[2/3]",
  "3:4": "aspect-[3/4]",
  "3:2": "aspect-[3/2]",
  "4:3": "aspect-[4/3]",
  "9:16": "aspect-[9/16]",
  "16:9": "aspect-[16/9]",
};

const DEFAULT_ASPECT = "aspect-[3/4]";

function normalizeCategory(value: string) {
  if (value === "鍐欑湡") return "写真";
  if (value === "鍟嗗搧") return "商品";
  if (value === "瑙掕壊") return "角色";
  if (value === "鐣岄潰") return "界面";
  if (value === "寤虹瓚") return "建筑";
  if (value === "鎻掔敾") return "插画";
  if (value === "鍥介") return "国风";
  if (value === "鍏ㄩ儴") return "全部";
  return hasChineseText(value) ? value : "其他";
}

function workToItem(work: GalleryImageView): ShowcaseItem {
  const category = normalizeCategory(work.category);
  const displayPrompt = toPublicChineseText([work.promptZh, work.summary, work.title], "暂无中文描述");
  return {
    id: work.id,
    sourceType: work.sourceType,
    title: toPublicChineseText([work.title, work.summary, work.promptZh], "生成作品", 18),
    summary: toPublicChineseText([work.summary, work.promptZh, work.title], "暂无中文描述", 72),
    category,
    tags: toPublicChineseTags(work.tags || [], [category]),
    ratio: work.ratio,
    imageUrl: work.url,
    thumbnailUrl: work.thumbnailUrl || work.url,
    gradient: categoryGradient[category] || categoryGradient.其他,
    aspectClass: ratioAspect[work.ratio] || DEFAULT_ASPECT,
    promptZh: displayPrompt,
    authorName: toPublicChineseText([work.authorName], "创作者", 12),
    createdAt: work.publishedAt || work.createdAt,
    isFallback: false,
  };
}

function promptToItem(prompt: PromptCardData): ShowcaseItem {
  const category = normalizeCategory(prompt.category);
  const displayPrompt = toPublicChineseText([prompt.promptZh, prompt.summary, prompt.title], "暂无中文描述");
  return {
    id: prompt.slug,
    sourceType: "sample",
    title: toPublicChineseText([prompt.title, prompt.summary, prompt.promptZh], "生成作品", 18),
    summary: toPublicChineseText([prompt.summary, prompt.promptZh, prompt.title], "暂无中文描述", 72),
    category,
    tags: toPublicChineseTags(prompt.tags, [category]),
    ratio: prompt.ratio,
    gradient: categoryGradient[category] || categoryGradient.其他,
    aspectClass: ratioAspect[prompt.ratio] || DEFAULT_ASPECT,
    promptZh: displayPrompt,
    authorName: toPublicChineseText([prompt.authorName], "造图台", 12),
    isFallback: true,
  };
}

function filterItems(items: ShowcaseItem[], query: string, category: string) {
  const keyword = query.trim().toLowerCase();
  return items.filter((item) => {
    const matchesCategory = category === "全部" || item.category === category;
    const haystack = [item.title, item.summary, item.category, item.promptZh, ...item.tags]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return matchesCategory && (!keyword || haystack.includes(keyword));
  });
}

function formatDate(value?: string) {
  if (!value) {
    return "未发布";
  }

  const match = value.match(/\d{4}-(\d{2})-(\d{2})/);

  return match ? `${match[1]}/${match[2]}` : "未发布";
}

export function HomeWorksShowcase({
  categories,
  initialWorks,
  fallbackPrompts,
  galleryError,
  initialQuery = "",
  eyebrow = "作品",
  title = "作品展示",
  realDescription = "来自用户发布的公开作品。",
  fallbackDescription = "暂无公开作品，先展示一些可复用的方向。",
  fallbackBadgeLabel = "样例",
  fallbackSourceLabel = "样例库",
  fallbackTypeLabel = "精选样例",
  allowFallbackSamples = false,
  emptyTitle = "没有找到匹配作品",
  emptyDescription = "换一个关键词，或切回“全部”分类。",
}: {
  categories: string[];
  initialWorks: GalleryImageView[];
  fallbackPrompts: PromptCardData[];
  galleryError?: string | null;
  initialQuery?: string;
  eyebrow?: string;
  title?: string;
  realDescription?: string;
  fallbackDescription?: string;
  fallbackBadgeLabel?: string;
  fallbackSourceLabel?: string;
  fallbackTypeLabel?: string;
  allowFallbackSamples?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
}) {
  const normalizedCategories = useMemo(
    () => Array.from(new Set(["全部", ...categories.map(normalizeCategory)])),
    [categories],
  );
  const [query, setQuery] = useState(initialQuery);
  const deferredQuery = useDeferredValue(query);
  const [requestQuery, setRequestQuery] = useState(initialQuery);
  const [category, setCategory] = useState("全部");
  const [works, setWorks] = useState(initialWorks);
  const [loading, setLoading] = useState(false);
  const [selectedItem, setSelectedItem] = useState<ShowcaseItem | null>(null);

  const fallbackItems = useMemo(() => fallbackPrompts.map(promptToItem), [fallbackPrompts]);
  const realItems = useMemo(() => works.map(workToItem), [works]);
  const hasGalleryError = Boolean(galleryError);
  const usingFallback = allowFallbackSamples && !hasGalleryError && initialWorks.length === 0 && works.length === 0 && fallbackPrompts.length > 0;
  const visibleItems = usingFallback ? filterItems(fallbackItems, deferredQuery, category) : filterItems(realItems, deferredQuery, category);
  const isLibraryEmpty = !hasGalleryError && !usingFallback && realItems.length === 0 && !query.trim() && category === "全部";

  useEffect(() => {
    setQuery(initialQuery);
    setRequestQuery(initialQuery);
  }, [initialQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => setRequestQuery(query), 220);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (usingFallback || hasGalleryError) {
      return;
    }

    const trimmedQuery = requestQuery.trim();
    if (!trimmedQuery) {
      setWorks(initialWorks);
      setLoading(false);
      return;
    }

    const controller = new AbortController();
    const params = new URLSearchParams();
    params.set("q", trimmedQuery);
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
  }, [hasGalleryError, initialWorks, requestQuery, usingFallback]);

  return (
    <>
      <section className="rounded-2xl border border-line bg-panel p-5 shadow-card" aria-label={eyebrow}>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-ink-faint">{galleryError || (usingFallback ? fallbackDescription : realDescription)}</p>
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row md:items-center">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-2 overflow-x-auto pb-0.5">
            {normalizedCategories.map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setCategory(item)}
                className={`shrink-0 rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition ${
                  category === item
                    ? "border-brand-500 bg-brand-500 text-white shadow-chip"
                    : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50 hover:text-brand-600"
                }`}
              >
                {item}
              </button>
            ))}
          </div>

          <label className="flex w-full items-center gap-2.5 rounded-xl border border-line bg-page/60 px-3.5 py-2.5 transition focus-within:border-brand-400 focus-within:bg-panel focus-within:ring-2 focus-within:ring-brand-100 md:w-64 md:shrink-0">
            <Search size={15} className="shrink-0 text-ink-faint" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
              placeholder="搜索风格、场景或用途"
            />
            {loading ? <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-brand-500" /> : null}
          </label>
        </div>
      </section>

      {visibleItems.length > 0 ? (
        <div className="columns-2 gap-4 md:columns-3 xl:columns-4">
          {visibleItems.map((item, index) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSelectedItem(item)}
              className="group relative mb-4 block w-full animate-float-in break-inside-avoid overflow-hidden rounded-2xl border border-line bg-panel text-left shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop"
              style={{ animationDelay: `${Math.min(index * 40, 320)}ms` }}
            >
              <span className={`relative block w-full overflow-hidden ${item.aspectClass}`}>
                {item.thumbnailUrl || item.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={item.thumbnailUrl || item.imageUrl}
                    alt={item.title}
                    loading="lazy"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
                  />
                ) : (
                  <span className={`flex h-full w-full items-center justify-center bg-gradient-to-br ${item.gradient} p-4 dark:bg-none dark:bg-white/[0.04]`}>
                    <span className="text-4xl font-extrabold text-ink/10">{item.title.slice(0, 1)}</span>
                  </span>
                )}
                <span className="pointer-events-none absolute inset-x-0 bottom-0 block bg-gradient-to-t from-slate-950/70 via-slate-950/25 to-transparent px-3.5 pb-3 pt-12">
                  <span className="block truncate text-sm font-bold text-white">{item.title}</span>
                  <span className="mt-0.5 block text-xs font-medium text-white/80">
                    {item.category}
                    {item.isFallback ? ` · ${fallbackBadgeLabel}` : ""}
                  </span>
                </span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-line bg-panel p-10 text-center shadow-card">
          <p className="text-[17px] font-bold text-ink">
            {galleryError ? "作品库暂时不可用" : isLibraryEmpty ? "暂无公开作品" : emptyTitle}
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-ink-faint">
            {galleryError
              ? "这里原本展示用户发布到首页广场的作品，数据库恢复后会自动显示。"
              : isLibraryEmpty
                ? "用户发布作品或后台添加运营精选后，这里会自动显示。"
                : emptyDescription}
          </p>
        </div>
      )}

      {selectedItem
        ? createPortal(
            <div
              className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/40 p-3 backdrop-blur-[2px]"
              role="dialog"
              aria-modal="true"
              aria-label={selectedItem.title}
              onClick={() => setSelectedItem(null)}
            >
              <div
                className="relative flex max-h-[calc(100dvh-24px)] w-[min(960px,calc(100vw-24px))] animate-float-in flex-col overflow-hidden rounded-2xl bg-panel shadow-pop md:grid md:grid-cols-[1.15fr_0.85fr]"
                onClick={(event) => event.stopPropagation()}
              >
                <button
                  type="button"
                  onClick={() => setSelectedItem(null)}
                  aria-label="关闭详情"
                  className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-slate-950/55 text-white backdrop-blur transition hover:bg-slate-950/70"
                >
                  <X size={16} />
                </button>

                <div className="flex h-[38dvh] shrink-0 items-center justify-center overflow-hidden bg-page md:h-auto md:max-h-[calc(100dvh-24px)] md:min-h-[460px]">
                  {selectedItem.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={selectedItem.imageUrl} alt={selectedItem.title} className="h-full w-full object-contain" />
                  ) : (
                    <div className={`flex h-full w-full items-end bg-gradient-to-br ${selectedItem.gradient} p-6`}>
                      <div>
                        <p className="text-xs font-semibold text-ink-faint">预览</p>
                        <h3 className="mt-1.5 text-2xl font-extrabold leading-tight text-ink">{selectedItem.title}</h3>
                      </div>
                    </div>
                  )}
                </div>

                <aside className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5 md:max-h-[calc(100dvh-24px)]">
                  <div className="flex items-center gap-3 pr-10">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white">
                      {selectedItem.authorName.slice(0, 1).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-ink">{selectedItem.authorName}</p>
                      <p className="mt-0.5 text-xs text-ink-faint">
                        {selectedItem.isFallback ? fallbackTypeLabel : selectedItem.sourceType === "curated" ? "运营精选" : "公开作品"}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xl font-bold leading-snug text-ink">{selectedItem.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-ink-secondary">{selectedItem.summary}</p>
                    {selectedItem.tags.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {selectedItem.tags.map((tag) => (
                          <span key={tag} className="rounded-full bg-page px-3 py-1 text-xs font-medium text-ink-secondary">
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <Link
                      href={`/generate?prompt=${encodeURIComponent(selectedItem.promptZh)}`}
                      className="rounded-xl bg-brand-500 px-4 py-2.5 text-center text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
                    >
                      复用描述
                    </Link>
                    {selectedItem.imageUrl ? (
                      <a
                        href={selectedItem.imageUrl}
                        download
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page"
                      >
                        <Download size={15} />
                        下载
                      </a>
                    ) : (
                      <span className="inline-flex cursor-default items-center justify-center rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-faint">
                        作为参考
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-line bg-page/60 p-4">
                    <div className="mb-2.5 flex items-center justify-between">
                      <p className="text-sm font-bold text-ink">提示词</p>
                      <CopyPromptButton
                        text={selectedItem.promptZh}
                        label="复制"
                        className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1.5 text-xs font-semibold text-ink-secondary transition hover:bg-page"
                      />
                    </div>
                    <p className="text-sm leading-6 text-ink-secondary">{selectedItem.promptZh}</p>
                  </div>

                  <div className="space-y-1.5">
                    {[
                      ["类别", selectedItem.category],
                      ["画幅比例", selectedItem.ratio],
                      ["来源", selectedItem.isFallback ? fallbackSourceLabel : selectedItem.sourceType === "curated" ? "运营精选" : "真实生成"],
                      ["时间", selectedItem.isFallback ? "示例数据" : formatDate(selectedItem.createdAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl bg-page px-3.5 py-2 text-xs">
                        <span className="font-medium text-ink-faint">{label}</span>
                        <span className="font-semibold text-ink-secondary">{value}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setCategory(selectedItem.category);
                      setSelectedItem(null);
                    }}
                    className="inline-flex w-full items-center justify-center rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page"
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
