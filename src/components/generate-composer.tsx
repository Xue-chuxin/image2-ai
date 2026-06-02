"use client";

import { useState } from "react";
import { ImageUp, Loader2, RotateCcw, Send, Wand2 } from "lucide-react";
import { clsx } from "clsx";

const styles = ["写实", "商品", "角色", "界面", "插画", "建筑"] as const;
const ratios = ["1:1", "3:4", "16:9", "9:16"] as const;

type PolishResult = {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  styleTags: string[];
  recommendedRatio: string;
  qualityHint: string;
};

type PolishResponse = {
  ok: boolean;
  result?: PolishResult;
  error?: string;
  warning?: string;
  source?: "deepseek" | "local";
};

const quickIdeas = [
  "蓝白色极简产品海报，玻璃质感咖啡机，柔和晨光，干净留白，适合电商首图",
  "雨夜街头人像写真，透明雨伞反射霓虹，电影感构图，浅景深",
  "国风角色设定，浅色丝绸服饰，水墨山景背景，克制高级的配色",
  "移动 App 首屏样机，液态玻璃卡片，白蓝色调，清爽工具型界面"
];

function isKnownRatio(value: string): value is (typeof ratios)[number] {
  return ratios.includes(value as (typeof ratios)[number]);
}

export function GenerateComposer({
  compact = false,
  initialPrompt = ""
}: {
  compact?: boolean;
  initialPrompt?: string;
}) {
  const [style, setStyle] = useState<(typeof styles)[number]>("商品");
  const [ratio, setRatio] = useState<(typeof ratios)[number]>("1:1");
  const [description, setDescription] = useState(initialPrompt);
  const [polishResult, setPolishResult] = useState<PolishResult | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [ideaIndex, setIdeaIndex] = useState(0);

  async function polishDescription() {
    const input = description.trim();

    setError("");
    setNotice("");

    if (!input) {
      setError("先写一句画面描述，再让 AI 帮你整理。");
      return;
    }

    setIsPolishing(true);

    try {
      const response = await fetch("/api/prompts/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input, mode: style, ratio })
      });
      const data = (await response.json()) as PolishResponse;

      if (!response.ok || !data.ok || !data.result) {
        throw new Error(data.error || "描述整理失败，请稍后再试。");
      }

      setPolishResult(data.result);
      setDescription(data.result.promptZh);
      if (isKnownRatio(data.result.recommendedRatio)) {
        setRatio(data.result.recommendedRatio);
      }
      if (data.warning) {
        setNotice(data.warning);
      } else if (data.source === "local") {
        setNotice("当前未配置 DeepSeek API Key，先使用本地预览结果。");
      }
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "描述整理失败，请稍后再试。");
    } finally {
      setIsPolishing(false);
    }
  }

  function useNextIdea() {
    const nextIndex = (ideaIndex + 1) % quickIdeas.length;
    setIdeaIndex(nextIndex);
    setDescription(quickIdeas[nextIndex]);
    setPolishResult(null);
    setError("");
    setNotice("");
  }

  return (
    <section className="liquid-glass relative overflow-hidden rounded-[28px] p-5 animate-float-in">
      <div className="liquid-mask" />
      <div className="relative">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Create</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">画面描述</h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
            约 1 分钟
          </div>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[22px] border border-white/60 bg-white/48 p-3 shadow-card backdrop-blur-xl">
          <div className="liquid-mask" />
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="relative min-h-32 w-full resize-none bg-transparent p-3 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="描述你想要的画面，例如：蓝白色产品海报，玻璃质感咖啡机，冷光棚拍，干净留白..."
          />
          <div className="relative flex flex-wrap items-center gap-2 border-t border-white/70 px-2 pt-3">
            <button
              type="button"
              onClick={polishDescription}
              disabled={isPolishing}
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-card transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPolishing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wand2 className="h-3.5 w-3.5" />}
              {isPolishing ? "整理中" : "整理描述"}
            </button>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-card transition hover:-translate-y-0.5"
            >
              <ImageUp className="h-3.5 w-3.5" /> 加图
            </button>
            <button
              type="button"
              onClick={useNextIdea}
              className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-card transition hover:-translate-y-0.5"
            >
              <RotateCcw className="h-3.5 w-3.5" /> 换一句
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-2xl border border-sky-100 bg-sky-50 px-4 py-3 text-sm font-bold text-sky-700">{notice}</p>
        ) : null}

        {polishResult ? (
          <div className="mt-4 rounded-[22px] border border-slate-200 bg-white/80 p-4 shadow-card">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-slate-950 px-3 py-1 text-xs font-black text-white">{polishResult.title}</span>
              {polishResult.styleTags.map((tag) => (
                <span key={tag} className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600">
                  {tag}
                </span>
              ))}
            </div>
            <p className="mt-3 text-sm leading-7 text-slate-600">{polishResult.promptEn}</p>
            <p className="mt-3 text-xs font-bold leading-6 text-slate-400">避免：{polishResult.negativePrompt}</p>
            <p className="mt-2 text-xs font-bold leading-6 text-slate-500">{polishResult.qualityHint}</p>
          </div>
        ) : null}

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {styles.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setStyle(item)}
              className={clsx(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-black transition",
                style === item ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {!compact && (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.3fr]">
            <button
              type="button"
              className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm font-black text-slate-600"
            >
              <ImageUp className="h-4 w-4" /> 上传参考图
            </button>
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 no-scrollbar">
              {ratios.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRatio(item)}
                  className={clsx(
                    "shrink-0 rounded-xl px-3 py-2 text-xs font-black",
                    ratio === item ? "bg-slate-950 text-white shadow-card" : "text-slate-500"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-[.9fr_1.1fr]">
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
            保存草稿
          </button>
          <button type="button" className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card transition hover:bg-slate-800">
            <Send className="h-4 w-4" /> 开始生成
          </button>
        </div>
      </div>
    </section>
  );
}
