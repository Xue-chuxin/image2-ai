"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Copy, Loader2, Sparkles } from "lucide-react";

import type { TextToolClientView, TextToolItem } from "@/lib/text-tools";

type TextToolApiResponse = {
  ok?: boolean;
  error?: string;
  source?: "deepseek" | "local";
  warning?: string;
  items?: TextToolItem[];
};

function chipClass(active: boolean) {
  return clsx(
    "rounded-lg border px-3 py-1.5 text-[13px] font-semibold transition",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-chip"
      : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
  );
}

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
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
      {copied ? "已复制" : "复制"}
    </button>
  );
}

export function TextToolStudio({ tool }: { tool: TextToolClientView }) {
  const [input, setInput] = useState("");
  const [option, setOption] = useState<string>(tool.option?.choices[0]?.value ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [source, setSource] = useState<"deepseek" | "local" | null>(null);
  const [warning, setWarning] = useState("");
  const [items, setItems] = useState<TextToolItem[]>([]);

  async function run() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError(`请先输入${tool.inputLabel}。`);
      return;
    }

    setLoading(true);
    setError("");
    setWarning("");

    try {
      const response = await fetch(`/api/text-tools/${tool.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: trimmed, option: option || undefined }),
      });
      const payload = (await response.json()) as TextToolApiResponse;

      if (!response.ok || payload.ok === false) {
        throw new Error(payload.error || "生成失败，请稍后再试。");
      }

      setItems(payload.items || []);
      setSource(payload.source || null);
      setWarning(payload.warning || "");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成失败，请稍后再试。");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {/* 输入区 */}
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label className="text-[13px] font-semibold text-ink-secondary">{tool.inputLabel}</label>
            <span className="text-xs text-ink-faint">
              {input.length}/{tool.maxInput}
            </span>
          </div>
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value.slice(0, tool.maxInput))}
            rows={6}
            placeholder={tool.placeholder}
            className="mt-2 w-full resize-none rounded-xl border border-line bg-page/60 px-3.5 py-3 text-sm leading-6 text-ink outline-none transition focus:border-brand-400 focus:bg-panel"
          />
        </div>

        {tool.option ? (
          <div>
            <p className="text-[13px] font-semibold text-ink-secondary">{tool.option.label}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {tool.option.choices.map((choice) => (
                <button key={choice.value} type="button" className={chipClass(option === choice.value)} onClick={() => setOption(choice.value)}>
                  {choice.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</div>
        ) : null}

        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
        >
          {loading ? <Loader2 className="animate-spin" size={16} /> : <Sparkles size={16} />}
          {loading ? "生成中" : "开始生成"}
        </button>
        <p className="text-xs leading-5 text-ink-faint">{tool.description}</p>
      </section>

      {/* 结果区 */}
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        {items.length > 0 ? (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-brand-500 px-2.5 py-0.5 text-xs font-bold text-white">{source === "local" ? "本地兜底" : "DeepSeek"}</span>
              <h2 className="text-[15px] font-bold text-ink">生成结果</h2>
            </div>

            {warning ? (
              <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-xs font-medium text-amber-600 dark:text-amber-300">{warning}</div>
            ) : null}

            <div className="space-y-3">
              {items.map((item, index) => (
                <div key={index} className="space-y-2 rounded-xl border border-line bg-page/60 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    {item.title ? (
                      <p className="text-[13px] font-bold text-brand-600">{item.title}</p>
                    ) : (
                      <p className="text-[13px] font-semibold text-ink-secondary">备选 {index + 1}</p>
                    )}
                    <CopyButton value={item.title ? `${item.title}\n${item.content}` : item.content} />
                  </div>
                  <p className="whitespace-pre-wrap text-[13px] leading-6 text-ink">{item.content}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Sparkles size={22} />
            </span>
            <p className="text-sm font-semibold text-ink-secondary">生成结果会显示在这里</p>
            <p className="max-w-[260px] text-xs leading-5 text-ink-faint">填写{tool.inputLabel}并点击「开始生成」，即可得到多条可直接复制使用的文案备选。</p>
          </div>
        )}
      </section>
    </div>
  );
}
