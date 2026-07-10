"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Heart, Search, Sparkles, Tag, Wand2, X } from "lucide-react";
import clsx from "clsx";

import { CopyPromptButton } from "@/components/copy-prompt-button";
import type { PromptCardView, PromptCategoryView, PromptTagView } from "@/lib/prompts";

type PromptLibraryProps = {
  prompts: PromptCardView[];
  categories: PromptCategoryView[];
  tags: PromptTagView[];
  initialFavoriteIds: string[];
  isLoggedIn: boolean;
};

function buildGenerateHref(prompt: PromptCardView) {
  const params = new URLSearchParams();
  if (prompt.promptZh) params.set("prompt", prompt.promptZh);
  if (prompt.promptEn) params.set("promptEn", prompt.promptEn);
  if (prompt.negativePrompt) params.set("negativePrompt", prompt.negativePrompt);
  return `/generate?${params.toString()}`;
}

// 点击「去创作」时以 beacon 记录一次使用，用于热门榜排序（失败不影响跳转）。
function recordPromptView(promptId: string) {
  try {
    const body = JSON.stringify({ promptId });
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/prompts/view", new Blob([body], { type: "application/json" }));
      return;
    }
    void fetch("/api/prompts/view", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    });
  } catch {
    // 忽略埋点失败
  }
}

export function PromptLibrary({ prompts, categories, tags, initialFavoriteIds, isLoggedIn }: PromptLibraryProps) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [activeTags, setActiveTags] = useState<Set<string>>(() => new Set());
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set(initialFavoriteIds));
  const [pendingId, setPendingId] = useState<string>("");

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    return prompts.filter((prompt) => {
      if (activeCategory && prompt.categorySlug !== activeCategory) return false;
      if (favoritesOnly && !favoriteIds.has(prompt.id)) return false;
      // 标签筛选：命中所有选中标签（AND），逐步收窄结果。
      if (activeTags.size) {
        const promptTags = new Set(prompt.tags);
        for (const tag of activeTags) {
          if (!promptTags.has(tag)) return false;
        }
      }
      if (keyword) {
        const haystack = `${prompt.title} ${prompt.summary} ${prompt.tags.join(" ")}`.toLowerCase();
        if (!haystack.includes(keyword)) return false;
      }
      return true;
    });
  }, [prompts, query, activeCategory, activeTags, favoritesOnly, favoriteIds]);

  function toggleTag(name: string) {
    setActiveTags((prev) => {
      const next = new Set(prev);
      if (next.has(name)) {
        next.delete(name);
      } else {
        next.add(name);
      }
      return next;
    });
  }

  async function toggleFavorite(prompt: PromptCardView) {
    if (!isLoggedIn) {
      window.location.href = "/signin?next=/prompts";
      return;
    }
    if (pendingId) return;

    const wasFavorited = favoriteIds.has(prompt.id);
    setPendingId(prompt.id);
    // 乐观更新
    setFavoriteIds((prev) => {
      const next = new Set(prev);
      if (wasFavorited) {
        next.delete(prompt.id);
      } else {
        next.add(prompt.id);
      }
      return next;
    });

    try {
      const response = await fetch("/api/prompts/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ promptId: prompt.id }),
      });
      if (!response.ok) throw new Error();
      const payload = (await response.json()) as { favorited?: boolean };
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (payload.favorited) {
          next.add(prompt.id);
        } else {
          next.delete(prompt.id);
        }
        return next;
      });
    } catch {
      // 回滚
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (wasFavorited) {
          next.add(prompt.id);
        } else {
          next.delete(prompt.id);
        }
        return next;
      });
    } finally {
      setPendingId("");
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-faint" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="搜索标题、简介或标签"
            className="w-full rounded-xl border border-line bg-page/60 py-2.5 pl-9 pr-3 text-sm text-ink outline-none transition focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
          />
        </div>
        <button
          type="button"
          onClick={() => setFavoritesOnly((value) => !value)}
          className={clsx(
            "inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3.5 py-2.5 text-sm font-semibold transition",
            favoritesOnly
              ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
              : "border-line bg-panel text-ink-secondary hover:bg-page",
          )}
        >
          <Heart className={clsx("h-4 w-4", favoritesOnly && "fill-current")} />
          只看收藏
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCategory("")}
          className={clsx(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
            activeCategory === "" ? "bg-brand-500 text-white shadow-chip" : "bg-panel text-ink-secondary hover:bg-brand-50 hover:text-brand-600",
          )}
        >
          全部
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => setActiveCategory(category.slug)}
            className={clsx(
              "rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition",
              activeCategory === category.slug ? "bg-brand-500 text-white shadow-chip" : "bg-panel text-ink-secondary hover:bg-brand-50 hover:text-brand-600",
            )}
          >
            {category.name}
            <span className="ml-1 text-ink-faint">{category.count}</span>
          </button>
        ))}
      </div>

      {tags.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1 text-[13px] font-semibold text-ink-faint">
            <Tag className="h-3.5 w-3.5" />
            标签
          </span>
          {tags.map((tag) => {
            const active = activeTags.has(tag.name);
            return (
              <button
                key={tag.name}
                type="button"
                onClick={() => toggleTag(tag.name)}
                className={clsx(
                  "inline-flex items-center gap-1 rounded-full px-3 py-1 text-[12px] font-semibold transition",
                  active
                    ? "bg-brand-500 text-white shadow-chip"
                    : "bg-page text-ink-secondary hover:bg-brand-50 hover:text-brand-600",
                )}
              >
                #{tag.name}
                <span className={clsx(active ? "text-white/80" : "text-ink-faint")}>{tag.count}</span>
              </button>
            );
          })}
          {activeTags.size > 0 ? (
            <button
              type="button"
              onClick={() => setActiveTags(new Set())}
              className="inline-flex items-center gap-1 rounded-full border border-line px-2.5 py-1 text-[12px] font-semibold text-ink-faint transition hover:bg-page"
            >
              <X className="h-3 w-3" />
              清除
            </button>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line bg-panel/60 px-6 py-16 text-center">
          <Sparkles className="mx-auto h-8 w-8 text-ink-faint" />
          <p className="mt-3 text-sm text-ink-secondary">
            {favoritesOnly ? "还没有收藏的提示词，点击卡片上的心形即可收藏。" : "没有匹配的提示词，换个关键词或分类试试。"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((prompt) => {
            const favorited = favoriteIds.has(prompt.id);
            return (
              <article key={prompt.id} className="flex flex-col rounded-2xl border border-line bg-panel p-5 shadow-card">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    {prompt.categoryName ? (
                      <span className="inline-block rounded-full bg-brand-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-600">
                        {prompt.categoryName}
                      </span>
                    ) : null}
                    <h3 className="mt-2 truncate text-base font-bold text-ink">{prompt.title}</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(prompt)}
                    disabled={pendingId === prompt.id}
                    aria-label={favorited ? "取消收藏" : "收藏"}
                    className={clsx(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border transition disabled:opacity-60",
                      favorited
                        ? "border-rose-200 bg-rose-50 text-rose-500 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300"
                        : "border-line bg-page/60 text-ink-faint hover:text-rose-400",
                    )}
                  >
                    <Heart className={clsx("h-4 w-4", favorited && "fill-current")} />
                  </button>
                </div>

                <p className="mt-2 line-clamp-2 text-sm leading-6 text-ink-secondary">{prompt.summary}</p>

                <div className="mt-3 flex-1">
                  <p className="line-clamp-3 rounded-xl bg-page/60 px-3 py-2.5 text-xs leading-5 text-ink-secondary">{prompt.promptZh}</p>
                </div>

                {prompt.tags.length > 0 ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {prompt.tags.slice(0, 4).map((tag) => (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={clsx(
                          "rounded-md px-2 py-0.5 text-[11px] transition",
                          activeTags.has(tag)
                            ? "bg-brand-500 text-white"
                            : "bg-page text-ink-faint hover:bg-brand-50 hover:text-brand-600",
                        )}
                      >
                        #{tag}
                      </button>
                    ))}
                  </div>
                ) : null}

                <div className="mt-4 flex items-center gap-2">
                  <Link
                    href={buildGenerateHref(prompt)}
                    onClick={() => recordPromptView(prompt.id)}
                    className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3 py-2 text-sm font-semibold text-white shadow-chip transition hover:bg-brand-600"
                  >
                    <Wand2 className="h-3.5 w-3.5" />
                    去创作
                  </Link>
                  <CopyPromptButton
                    text={prompt.promptZh}
                    className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-panel px-3 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
                  />
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
