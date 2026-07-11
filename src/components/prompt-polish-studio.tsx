"use client";

import { useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check, Copy, Loader2, Sparkles, WandSparkles } from "lucide-react";

import { IMAGE_STYLE_CATEGORIES } from "@/lib/image-categories";
import { buildPolishGenerateHref } from "@/lib/prompt-polish-link";

type PolishResult = {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  styleTags: string[];
  recommendedRatio: string;
  qualityHint: string;
};

type PolishApiResponse = {
  ok?: boolean;
  error?: string;
  source?: "deepseek" | "local";
  warning?: string;
  result?: PolishResult;
  data?: PolishResult;
};

const ratios = ["自动", "1:1", "3:4", "16:9", "9:16"] as const;
const MAX_INPUT = 2000;

function chipClass(active: boolean) {
  return clsx(
    "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-chip"
      : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
  );
}

function CopyButton({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) {
    return null;
  }
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          setCopied(false);
        }
      }}
      className="inline-flex items-center gap-1 rounded-lg border border-line bg-panel px-2.5 py-1 text-xs font-semibold text-ink-secondary transition hover:bg-page"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
      {copied ? "已复制" : label}
    </button>
  );
}

export function PromptPolishStudio() {
  const [input, setInput] = useState("");
  const [mode, setMode] = useState<string>(IMAGE_STYLE_CATEGORIES[0]);
  const [ratio, setRatio] = useState<(typeof ratios)[number]>("自动");
  const [isPolishing, setIsPolishing] = useState(false);
  const [error, setError] = useState("");
  const [needLogin, setNeedLogin] = useState(false);
  const [source, setSource] = useState<"deepseek" | "local" | null>(null);
  const [warning, setWarning] = useState("");
  const [result, setResult] = useState<PolishResult | null>(null);

  async function runPolish() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("请先输入一段画面描述。");
      return;
    }

    setIsPolishing(true);
    setError("");
    setNeedLogin(false);
    setWarning("");

    try {
      const response = await fetch("/api/prompts/polish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: trimmed,
          mode,
          ratio: ratio === "自动" ? undefined : ratio,
        }),
      });
      const payload = (await response.json()) as PolishApiResponse;

      if (response.status === 401) {
        setNeedLogin(true);
        throw new Error(payload.error || "请先登录后再使用提示词润色。");
      }

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "润色失败，请稍后再试。");
      }

      const data = payload.data || payload.result;
      if (!data) {
        throw new Error("润色服务未返回结果。");
      }

      setResult(data);
      setSource(payload.source || null);
      setWarning(payload.warning || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "润色失败，请稍后再试。");
    } finally {
      setIsPolishing(false);
    }
  }

  const generateHref = result
    ? buildPolishGenerateHref({
        promptZh: result.promptZh,
        promptEn: result.promptEn,
        negativePrompt: result.negativePrompt,
        recommendedRatio: result.recommendedRatio,
      })
    : "/generate";

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* 输入区 */}
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[13px] font-semibold text-ink-secondary">画面描述</label>
            <span className="text-xs text-ink-faint">
              {input.length}/{MAX_INPUT}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, MAX_INPUT))}
            rows={6}
            placeholder="用一句话描述你想要的画面，例如：夕阳下城市天台上的少女，回头微笑，暖色逆光。"
            className="mt-2 w-full resize-none rounded-xl border border-line bg-page/60 px-3.5 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand-400 focus:bg-panel"
          />
        </div>

        <div>
          <p className="text-[13px] font-semibold text-ink-secondary">风格方向</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {IMAGE_STYLE_CATEGORIES.map((item) => (
              <button key={item} type="button" className={chipClass(mode === item)} onClick={() => setMode(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-ink-secondary">画幅比例</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {ratios.map((item) => (
              <button key={item} type="button" className={chipClass(ratio === item)} onClick={() => setRatio(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">
            <span>{error}</span>
            {needLogin ? (
              <Link href="/signin?next=/prompts/polish" className="font-bold underline underline-offset-2 hover:text-rose-600">
                去登录
              </Link>
            ) : null}
          </div>
        ) : null}

        <button
          type="button"
          onClick={runPolish}
          disabled={isPolishing}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
        >
          {isPolishing ? <Loader2 className="animate-spin" size={16} /> : <WandSparkles size={16} />}
          {isPolishing ? "润色中" : "开始润色"}
        </button>
        <p className="text-xs leading-5 text-ink-faint">润色会把你的描述扩写为可直接生图的中/英文提示词与负向词，并给出风格标签与建议比例。</p>
      </section>

      {/* 结果区 */}
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        {result ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">{source === "local" ? "本地整理" : "DeepSeek"}</span>
              <h2 className="text-[15px] font-bold text-ink">{result.title}</h2>
            </div>

            {warning ? (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-300">{warning}</div>
            ) : null}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[13px] font-semibold text-ink-secondary">中文提示词</p>
                <CopyButton label="复制" value={result.promptZh} />
              </div>
              <p className="rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-[13px] leading-6 text-ink">{result.promptZh}</p>
            </div>

            {result.promptEn ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink-secondary">英文提示词</p>
                  <CopyButton label="复制" value={result.promptEn} />
                </div>
                <p className="rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-[13px] leading-6 text-ink-secondary">{result.promptEn}</p>
              </div>
            ) : null}

            {result.negativePrompt ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[13px] font-semibold text-ink-secondary">负向词</p>
                  <CopyButton label="复制" value={result.negativePrompt} />
                </div>
                <p className="rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-xs leading-5 text-ink-faint">{result.negativePrompt}</p>
              </div>
            ) : null}

            {result.styleTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {result.styleTags.map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-600">
                    <Sparkles size={11} />
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2 text-xs text-ink-faint">
              <span className="rounded-lg border border-line px-2.5 py-1 font-semibold text-ink-secondary">建议比例 {result.recommendedRatio}</span>
            </div>

            {result.qualityHint ? <p className="text-xs leading-5 text-ink-faint">{result.qualityHint}</p> : null}

            <Link
              href={generateHref}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              带入创作页生成
              <ArrowRight size={15} />
            </Link>
          </>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <WandSparkles size={22} />
            </span>
            <p className="text-sm font-semibold text-ink-secondary">润色结果会显示在这里</p>
            <p className="max-w-[260px] text-xs leading-5 text-ink-faint">输入描述并点击「开始润色」，即可获得结构化的提示词方案，一键带入创作页出图。</p>
          </div>
        )}
      </section>
    </div>
  );
}
