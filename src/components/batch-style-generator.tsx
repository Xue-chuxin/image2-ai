"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import { Check, ImageOff, Layers, Loader2, Palette, Send } from "lucide-react";

import { buildBatchStyleTasks, type StylePresetView } from "@/lib/style-presets";

type BatchStyleGeneratorProps = {
  stylePresets: StylePresetView[];
};

const ratios = ["1:1", "3:4", "16:9", "9:16"] as const;
const qualities = [
  { value: "standard", label: "标准" },
  { value: "high", label: "高清" },
  { value: "low", label: "省积分" },
] as const;

type RatioOption = (typeof ratios)[number];
type QualityOption = (typeof qualities)[number]["value"];

type TaskStatus = "pending" | "running" | "done" | "failed";

type TaskResult = {
  presetId: string;
  presetName: string;
  status: TaskStatus;
  imageUrl: string | null;
  error: string | null;
};

type JobResponse = {
  ok?: boolean;
  error?: string;
  job?: {
    id: string;
    status: string;
    errorMessage: string | null;
    images: Array<{ id: string; url: string; thumbnailUrl?: string | null }>;
  };
};

const MAX_BATCH = 6;

function isTerminal(status?: string) {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELED";
}

function wait(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function chipClass(active: boolean) {
  return clsx(
    "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-chip"
      : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
  );
}

export function BatchStyleGenerator({ stylePresets }: BatchStyleGeneratorProps) {
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [ratio, setRatio] = useState<RatioOption>("1:1");
  const [quality, setQuality] = useState<QualityOption>("standard");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<TaskResult[]>([]);

  const selectedCount = selectedIds.size;
  const canStart = useMemo(
    () => prompt.trim().length > 0 && selectedCount > 0 && !isRunning,
    [prompt, selectedCount, isRunning],
  );

  function toggleStyle(id: string) {
    setError("");
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (next.size >= MAX_BATCH) {
          setError(`一次最多选择 ${MAX_BATCH} 个风格。`);
          return prev;
        }
        next.add(id);
      }
      return next;
    });
  }

  // 逐个风格提交任务（复用单图接口），每个任务先 POST，再轮询到终态；串行执行避免触发频控。
  async function runOneTask(task: { presetId: string; presetName: string; promptZh: string; negativePrompt: string }): Promise<void> {
    setResults((prev) => prev.map((r) => (r.presetId === task.presetId ? { ...r, status: "running" } : r)));

    try {
      const response = await fetch("/api/generation/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          promptZh: task.promptZh,
          negativePrompt: task.negativePrompt || undefined,
          ratio,
          quality,
          imageCount: 1,
        }),
      });
      const payload = (await response.json()) as JobResponse;

      if (!payload.job) {
        throw new Error(payload.error || "生成失败");
      }

      let job = payload.job;
      // 未到终态则轮询任务详情，最多约 6 分钟。
      for (let attempt = 0; attempt < 180 && !isTerminal(job.status); attempt += 1) {
        await wait(2000);
        const pollResponse = await fetch(`/api/generation/jobs/${job.id}`, { method: "GET", cache: "no-store" });
        const pollPayload = (await pollResponse.json()) as JobResponse;
        if (pollPayload.job) {
          job = pollPayload.job;
        }
        if (!pollResponse.ok || pollPayload.ok === false) {
          throw new Error(pollPayload.error || job.errorMessage || "读取生成任务失败");
        }
      }

      if (job.status === "FAILED") {
        throw new Error(job.errorMessage || "生成失败");
      }

      const imageUrl = job.images[0]?.thumbnailUrl || job.images[0]?.url || null;
      setResults((prev) => prev.map((r) => (r.presetId === task.presetId ? { ...r, status: "done", imageUrl } : r)));
    } catch (caughtError) {
      const message = caughtError instanceof Error ? caughtError.message : "生成失败";
      setResults((prev) => prev.map((r) => (r.presetId === task.presetId ? { ...r, status: "failed", error: message } : r)));
    }
  }

  async function startBatch() {
    if (!canStart) {
      return;
    }

    const chosen = stylePresets.filter((preset) => selectedIds.has(preset.id));
    const tasks = buildBatchStyleTasks(prompt, negativePrompt, chosen);

    setIsRunning(true);
    setError("");
    setResults(tasks.map((task) => ({ presetId: task.presetId, presetName: task.presetName, status: "pending", imageUrl: null, error: null })));

    try {
      for (const task of tasks) {
        await runOneTask(task);
      }
    } finally {
      setIsRunning(false);
    }
  }

  const doneCount = results.filter((r) => r.status === "done").length;
  const failedCount = results.filter((r) => r.status === "failed").length;

  return (
    <div className="space-y-5">
      <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
        <div>
          <label htmlFor="batch-prompt" className="text-[15px] font-bold text-ink">
            基础画面描述
          </label>
          <textarea
            id="batch-prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            placeholder="例如：城市天台上的少女，逆光，电影感构图。选择多个风格后将分别出图。"
            rows={4}
            className="mt-2.5 w-full resize-y rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <label htmlFor="batch-negative" className="text-[13px] font-semibold text-ink-secondary">
            负向词（可选）
          </label>
          <input
            id="batch-negative"
            value={negativePrompt}
            onChange={(event) => setNegativePrompt(event.target.value)}
            placeholder="不希望出现的元素，如：低画质、多余手指"
            className="mt-2 w-full rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink-secondary">选择风格（多选，最多 {MAX_BATCH} 个）</p>
            <span className="text-xs text-ink-faint">已选 {selectedCount} 个</span>
          </div>
          {stylePresets.length ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {stylePresets.map((preset) => {
                const active = selectedIds.has(preset.id);
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => toggleStyle(preset.id)}
                    disabled={isRunning}
                    title={preset.description || preset.promptSuffix}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition disabled:opacity-60",
                      active
                        ? "border-brand-500 bg-brand-500 text-white shadow-chip"
                        : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
                    )}
                  >
                    {active ? <Check size={14} /> : <Palette size={14} />}
                    {preset.name}
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="mt-2 rounded-xl bg-page/60 px-3.5 py-2.5 text-sm text-ink-faint">运营暂未配置风格预设，无法批量生成。</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-[13px] font-semibold text-ink-secondary">画幅比例</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ratios.map((item) => (
                <button key={item} type="button" disabled={isRunning} className={chipClass(ratio === item)} onClick={() => setRatio(item)}>
                  {item}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-[13px] font-semibold text-ink-secondary">质量</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {qualities.map((item) => (
                <button key={item.value} type="button" disabled={isRunning} className={chipClass(quality === item.value)} onClick={() => setQuality(item.value)}>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error ? <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</div> : null}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={startBatch}
            disabled={!canStart}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
            {isRunning ? "正在批量生成…" : `批量生成（${selectedCount || 0} 张）`}
          </button>
          <span className="text-xs text-ink-faint">每个风格消耗一次生成额度，按顺序出图。</span>
        </div>
      </section>

      {results.length ? (
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-sm text-ink-secondary">
            <Layers className="h-4 w-4 text-brand-500" />
            <span className="font-semibold text-ink">批量结果</span>
            <span className="text-ink-faint">
              成功 {doneCount} · 失败 {failedCount} · 共 {results.length}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {results.map((result) => (
              <div key={result.presetId} className="overflow-hidden rounded-2xl border border-line bg-panel shadow-card">
                <div className="relative flex aspect-square items-center justify-center bg-page">
                  {result.status === "done" && result.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={result.imageUrl} alt={result.presetName} className="h-full w-full object-cover" />
                  ) : result.status === "failed" ? (
                    <div className="flex flex-col items-center gap-1.5 px-3 text-center">
                      <ImageOff className="h-5 w-5 text-rose-400" />
                      <span className="text-xs text-rose-500 dark:text-rose-300">{result.error || "生成失败"}</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-1.5 text-center">
                      <Loader2 className={clsx("h-5 w-5", result.status === "running" ? "animate-spin text-brand-400" : "text-ink-faint")} />
                      <span className="text-xs text-ink-faint">{result.status === "running" ? "生成中" : "排队中"}</span>
                    </div>
                  )}
                </div>
                <div className="px-3 py-2">
                  <p className="truncate text-sm font-semibold text-ink">{result.presetName}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-ink-faint">
            全部结果已保存到
            <Link href="/history" className="mx-1 font-semibold text-brand-600 hover:underline">
              生成历史
            </Link>
            ，可在那里查看大图或发布到画廊。
          </p>
        </section>
      ) : null}
    </div>
  );
}
