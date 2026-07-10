"use client";

import { type ChangeEvent, type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Loader2, Palette, RotateCcw, Send, UploadCloud, Wand2, X } from "lucide-react";
import { IMAGE_STYLE_CATEGORIES, type ImageStyleCategory } from "@/lib/image-categories";
import type { StylePresetView } from "@/lib/style-presets";

type ReferenceImageResult = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
};

type GenerationJobResult = {
  id: string;
  status: string;
  provider: "openai" | "chatgpt_web" | "stability_ai";
  model: string | null;
  promptZh: string;
  promptEn: string | null;
  negativePrompt: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  errorMessage: string | null;
  createdAt: string;
  referenceImages: ReferenceImageResult[];
  images: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string | null;
    width: number | null;
    height: number | null;
  }>;
};

type ApiResult<T> = {
  ok?: boolean;
  error?: string;
} & T;

type PolishResult = {
  data?: {
    promptZh?: string;
    promptEn?: string;
    negativePrompt?: string;
    provider?: string;
  };
  result?: {
    promptZh?: string;
    promptEn?: string;
    negativePrompt?: string;
    provider?: string;
  };
  source?: "deepseek" | "local";
  warning?: string;
};

type GenerationResult = {
  job?: GenerationJobResult;
};

type UploadResult = {
  image?: ReferenceImageResult;
};

type GenerateComposerProps = {
  initialPrompt?: string;
  initialPromptEn?: string;
  initialNegativePrompt?: string;
  initialRatio?: string;
  initialQuality?: string;
  initialImageCount?: number;
  initialReferenceImages?: ReferenceImageResult[];
  onJobChange?: (job: GenerationJobResult | null) => void;
  compact?: boolean;
  referenceImagesEnabled?: boolean;
  redirectOnTerminal?: string;
  stylePresets?: StylePresetView[];
};

const ratios = ["1:1", "3:4", "16:9", "9:16"] as const;
const qualities = [
  { value: "standard", label: "标准" },
  { value: "high", label: "高清" },
  { value: "low", label: "省积分" },
] as const;
const imageCounts = [1, 2, 4] as const;
const MAX_REFERENCE_IMAGES = 4;
const MAX_REFERENCE_IMAGE_BYTES = 8 * 1024 * 1024;
const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);

type RatioOption = (typeof ratios)[number];
type QualityOption = (typeof qualities)[number]["value"];
type ImageCountOption = (typeof imageCounts)[number];

function toRatioOption(value?: string): RatioOption {
  return (ratios as readonly string[]).includes(value || "") ? (value as RatioOption) : "1:1";
}

function toQualityOption(value?: string): QualityOption {
  return qualities.some((item) => item.value === value) ? (value as QualityOption) : "standard";
}

function toImageCountOption(value?: number): ImageCountOption {
  return (imageCounts as readonly number[]).includes(value ?? Number.NaN) ? (value as ImageCountOption) : 1;
}

async function readApiJson<T>(response: Response): Promise<ApiResult<T>> {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return (await response.json()) as ApiResult<T>;
  }

  const text = await response.text();
  return {
    ok: false,
    error: text ? `接口返回了非 JSON 内容：${text.slice(0, 80)}` : "接口返回了非 JSON 内容",
  } as ApiResult<T>;
}

function wait(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("aborted", "AbortError"));
      return;
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      window.clearTimeout(timer);
      reject(new DOMException("aborted", "AbortError"));
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function isTerminalStatus(status?: string) {
  return status === "COMPLETED" || status === "FAILED" || status === "CANCELED";
}

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function chipClass(active: boolean) {
  return clsx(
    "rounded-lg border px-3.5 py-2 text-[13px] font-semibold transition",
    active
      ? "border-brand-500 bg-brand-500 text-white shadow-chip"
      : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
  );
}

export function GenerateComposer({
  initialPrompt = "",
  initialPromptEn = "",
  initialNegativePrompt = "",
  initialRatio,
  initialQuality,
  initialImageCount,
  initialReferenceImages = [],
  onJobChange,
  compact = false,
  referenceImagesEnabled = false,
  redirectOnTerminal,
  stylePresets = [],
}: GenerateComposerProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyleCategory>("写真");
  const [ratio, setRatio] = useState<RatioOption>(() => toRatioOption(initialRatio));
  const [quality, setQuality] = useState<QualityOption>(() => toQualityOption(initialQuality));
  const [imageCount, setImageCount] = useState<ImageCountOption>(() => toImageCountOption(initialImageCount));
  const [polishedPromptEn, setPolishedPromptEn] = useState(initialPromptEn);
  const [negativePrompt, setNegativePrompt] = useState(initialNegativePrompt);
  const [polishProvider, setPolishProvider] = useState("DeepSeek");
  const [referenceImages, setReferenceImages] = useState<ReferenceImageResult[]>(referenceImagesEnabled ? initialReferenceImages.slice(0, MAX_REFERENCE_IMAGES) : []);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [appliedPresetIds, setAppliedPresetIds] = useState<Set<string>>(() => new Set());

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !isGenerating && !isUploadingReference, [prompt, isGenerating, isUploadingReference]);

  const abortRef = useRef<AbortController | null>(null);
  useEffect(() => {
    // 组件卸载（如切换页面）时中止进行中的轮询，避免后台持续 fetch。
    return () => abortRef.current?.abort();
  }, []);

  function updateJob(job: GenerationJobResult | null) {
    onJobChange?.(job);
  }

  // SSE 优先：服务端推送任务状态，失败/不支持时回退到 HTTP 轮询。
  function subscribeGenerationJobViaSSE(initialJob: GenerationJobResult, signal: AbortSignal) {
    return new Promise<GenerationJobResult>((resolve, reject) => {
      let settled = false;
      const source = new EventSource(`/api/generation/jobs/${initialJob.id}/events`);

      const cleanup = () => {
        signal.removeEventListener("abort", onAbort);
        source.close();
      };
      const finish = (job: GenerationJobResult) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(job);
      };
      const fail = (error: Error) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(error);
      };
      function onAbort() {
        fail(new DOMException("aborted", "AbortError"));
      }

      if (signal.aborted) {
        onAbort();
        return;
      }
      signal.addEventListener("abort", onAbort, { once: true });

      source.onmessage = (event) => {
        try {
          const job = JSON.parse(event.data) as GenerationJobResult;
          updateJob(job);
          if (isTerminalStatus(job.status)) {
            finish(job);
          }
        } catch {
          // 忽略无法解析的消息，等待下一条。
        }
      };
      // 连接错误或服务端超时：交由外层回退到轮询。
      source.addEventListener("error", () => fail(new DOMException("sse-error", "SseError")));
      source.addEventListener("timeout", () => fail(new DOMException("sse-timeout", "SseTimeout")));
    });
  }

  async function watchGenerationJob(initialJob: GenerationJobResult, signal: AbortSignal) {
    if (isTerminalStatus(initialJob.status)) {
      return initialJob;
    }

    if (typeof window !== "undefined" && "EventSource" in window) {
      try {
        return await subscribeGenerationJobViaSSE(initialJob, signal);
      } catch (error) {
        // 用户主动取消不回退；其余错误回退到轮询兜底。
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error;
        }
      }
    }

    return pollGenerationJob(initialJob, signal);
  }

  async function pollGenerationJob(initialJob: GenerationJobResult, signal: AbortSignal) {
    let latestJob = initialJob;

    for (let attempt = 0; attempt < 180; attempt += 1) {
      await wait(2000, signal);
      const pollResponse = await fetch(`/api/generation/jobs/${latestJob.id}`, {
        method: "GET",
        cache: "no-store",
        signal,
      });
      const pollResult = await readApiJson<GenerationResult>(pollResponse);

      if (pollResult.job) {
        latestJob = pollResult.job;
        updateJob(latestJob);
      }

      if (!pollResponse.ok || pollResult.ok === false) {
        throw new Error(pollResult.error || latestJob.errorMessage || "读取生成任务失败");
      }

      if (isTerminalStatus(latestJob.status)) {
        return latestJob;
      }
    }

    throw new Error("生成任务仍在进行，请稍后到历史记录查看结果。");
  }

  function validateReferenceFile(file: File) {
    if (!allowedTypes.has(file.type)) {
      throw new Error("只支持 PNG、JPG、WEBP 图片。");
    }

    if (file.size > MAX_REFERENCE_IMAGE_BYTES) {
      throw new Error("参考图不能超过 8MB。");
    }
  }

  async function uploadReferenceFile(file: File) {
    if (referenceImages.length >= MAX_REFERENCE_IMAGES) {
      throw new Error(`一次最多上传 ${MAX_REFERENCE_IMAGES} 张参考图。`);
    }

    validateReferenceFile(file);
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads/reference-images", {
      method: "POST",
      body: formData,
    });
    const result = await readApiJson<UploadResult>(response);

    if (!response.ok || result.ok === false || !result.image) {
      throw new Error(result.error || "上传参考图失败");
    }

    setReferenceImages((current) => [...current, result.image!].slice(0, MAX_REFERENCE_IMAGES));
  }

  async function uploadReferenceFiles(files: FileList | File[]) {
    if (!referenceImagesEnabled) {
      setError("当前正式版暂未开放参考图参与生图。");
      return;
    }

    const pendingFiles = Array.from(files).slice(0, MAX_REFERENCE_IMAGES - referenceImages.length);
    if (!pendingFiles.length) {
      return;
    }

    setIsUploadingReference(true);
    setError("");
    setNotice("");

    try {
      for (const file of pendingFiles) {
        await uploadReferenceFile(file);
      }
      setNotice("参考图已上传并保存到本次任务。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "上传参考图失败");
    } finally {
      setIsUploadingReference(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  }

  function onReferenceInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) {
      void uploadReferenceFiles(event.target.files);
    }
  }

  function onReferenceDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length) {
      void uploadReferenceFiles(event.dataTransfer.files);
    }
  }

  async function polishPrompt() {
    const rawPrompt = prompt.trim();

    if (!rawPrompt) {
      setError("请先输入一段画面描述。");
      return;
    }

    setIsPolishing(true);
    setError("");
    setNotice("");

    try {
      const response = await fetch("/api/prompts/polish", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: rawPrompt,
          mode: selectedStyle,
          ratio,
        }),
      });
      const result = await readApiJson<PolishResult>(response);

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || "润色失败");
      }

      const data = result.data || result.result || {};
      const polishedZh = data.promptZh || data.promptEn || rawPrompt;
      setPrompt(polishedZh);
      setPolishedPromptEn(data.promptEn || "");
      setNegativePrompt(data.negativePrompt || "");
      setPolishProvider(result.source === "local" ? "本地整理" : data.provider || "DeepSeek");
      setNotice(result.warning || "描述已整理并回填到输入框。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "润色失败");
    } finally {
      setIsPolishing(false);
    }
  }

  async function startGeneration() {
    const rawPrompt = prompt.trim();

    if (!rawPrompt) {
      setError("请先输入画面描述。");
      return;
    }

    // 新任务开始前中止上一次可能仍在进行的轮询，避免叠加。
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsGenerating(true);
    setError("");
    setNotice("");
    updateJob(null);

    try {
      const response = await fetch("/api/generation/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
        body: JSON.stringify({
          promptZh: rawPrompt,
          promptEn: polishedPromptEn || undefined,
          negativePrompt: negativePrompt || undefined,
          ratio,
          quality,
          imageCount,
          referenceImageIds: referenceImagesEnabled ? referenceImages.map((image) => image.id) : [],
        }),
      });
      const result = await readApiJson<GenerationResult>(response);

      if (result.job) {
        updateJob(result.job);
      }

      if (!response.ok || result.ok === false || !result.job) {
        throw new Error(result.error || result.job?.errorMessage || "生成失败");
      }

      let finalJob = result.job;
      if (!isTerminalStatus(finalJob.status)) {
        setNotice(referenceImages.length ? "任务已提交，参考图已关联到任务。" : "任务已提交，正在等待结果。");
        finalJob = await watchGenerationJob(finalJob, controller.signal);
      }

      if (finalJob.status === "FAILED") {
        if (redirectOnTerminal) {
          setNotice("任务已结束，正在打开生成记录。");
          router.push(redirectOnTerminal);
          return;
        }
        throw new Error(finalJob.errorMessage || "生成失败");
      }

      if (redirectOnTerminal) {
        setNotice("生成完成，正在打开生成记录。");
        router.push(redirectOnTerminal);
        return;
      }

      setNotice("生成完成，结果已保存到历史记录。");
    } catch (caughtError) {
      // 被中止（卸载或新任务）时静默返回，不提示错误、不复位 loading。
      if (controller.signal.aborted) {
        return;
      }
      setError(caughtError instanceof Error ? caughtError.message : "生成失败");
    } finally {
      if (!controller.signal.aborted) {
        setIsGenerating(false);
      }
    }
  }

  function resetComposer() {
    setPrompt("");
    setPolishedPromptEn("");
    setNegativePrompt("");
    setReferenceImages([]);
    setAppliedPresetIds(new Set());
    setNotice("");
    setError("");
    updateJob(null);
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((current) => current.filter((image) => image.id !== id));
  }

  // 去掉一段风格后缀（连同分隔符），用于取消已套用的风格预设。
  function stripStyleSuffix(text: string, suffix: string) {
    return text.replace(`，${suffix}`, "").split(suffix).join("").trim();
  }

  // 一键套用/取消风格预设：把正向后缀追加到描述、负向后缀并入负向词（可再次点击撤销）。
  function toggleStylePreset(preset: StylePresetView) {
    const applied = appliedPresetIds.has(preset.id);
    setAppliedPresetIds((prev) => {
      const next = new Set(prev);
      if (applied) {
        next.delete(preset.id);
      } else {
        next.add(preset.id);
      }
      return next;
    });

    setPrompt((current) => {
      if (applied) {
        return stripStyleSuffix(current, preset.promptSuffix);
      }
      const trimmed = current.trim();
      return trimmed ? `${trimmed}，${preset.promptSuffix}` : preset.promptSuffix;
    });

    if (preset.negativeSuffix) {
      const negativeSuffix = preset.negativeSuffix;
      setNegativePrompt((current) => {
        if (applied) {
          return stripStyleSuffix(current, negativeSuffix);
        }
        const trimmed = current.trim();
        return trimmed ? `${trimmed}，${negativeSuffix}` : negativeSuffix;
      });
    }

    setError("");
    setNotice(applied ? `已取消「${preset.name}」风格。` : `已套用「${preset.name}」风格到描述。`);
  }

  return (
    <section className="space-y-4 rounded-2xl border border-line bg-panel p-5 shadow-card">
      {/* 画面描述 */}
      <div>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <label htmlFor="generate-prompt" className="text-[17px] font-bold text-ink">
            画面描述
          </label>
          <span className="text-xs text-ink-faint">字数不限，写清主体、场景与光线效果更好</span>
        </div>
        <textarea
          id="generate-prompt"
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setPolishedPromptEn("");
            setNegativePrompt("");
          }}
          placeholder="例如：雨夜街头的人像写真，浅景深，侧光，35mm 镜头，背景干净，真实皮肤质感。"
          rows={5}
          className="mt-2.5 w-full resize-y rounded-xl border border-line bg-page/60 px-3.5 py-2.5 text-sm leading-6 text-ink outline-none transition placeholder:text-ink-faint focus:border-brand-400 focus:bg-panel focus:ring-2 focus:ring-brand-100"
        />
      </div>

      {/* 参考图上传（默认开放，管理员可在后台关闭） */}
      {referenceImagesEnabled ? (
        <div
          className={clsx(
            "rounded-xl border border-dashed px-4 py-6 transition",
            isDragging ? "border-brand-400 bg-brand-50/60" : "border-line bg-page/60",
          )}
          onDragOver={(event) => {
            event.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={onReferenceDrop}
        >
          <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={onReferenceInputChange} />
          <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-1.5 text-center">
            {isUploadingReference ? <Loader2 className="animate-spin text-brand-500" size={22} /> : <UploadCloud size={22} className="text-brand-400" />}
            <span className="text-sm font-semibold text-ink-secondary">{isUploadingReference ? "参考图上传中" : "拖入参考图，或点击上传"}</span>
            <span className="text-xs text-ink-faint">PNG / JPG / WEBP，单张不超过 8MB，最多 4 张</span>
          </button>
        </div>
      ) : !compact ? (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-500/10 px-3.5 py-2.5 text-sm font-medium text-amber-600 dark:text-amber-300">当前正式版先开放文字生图，参考图生图暂未开放。</div>
      ) : null}

      {referenceImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {referenceImages.map((image) => (
            <div key={image.id} className="relative overflow-hidden rounded-xl border border-line bg-panel shadow-card">
              <img src={image.thumbnailUrl || image.url} alt="参考图" className="h-24 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeReferenceImage(image.id)}
                className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/70 text-white transition hover:bg-slate-900"
                aria-label="移除参考图"
              >
                <X size={12} />
              </button>
              <div className="px-2.5 py-1.5">
                <p className="truncate text-xs font-semibold text-ink-secondary">{image.mimeType.replace("image/", "").toUpperCase()}</p>
                <p className="mt-0.5 text-[11px] text-ink-faint">{formatSize(image.fileSize)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* 风格方向 */}
      <div>
        <p className="text-[13px] font-semibold text-ink-secondary">风格方向</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {IMAGE_STYLE_CATEGORIES.map((style) => (
            <button key={style} type="button" className={chipClass(selectedStyle === style)} onClick={() => setSelectedStyle(style)}>
              {style}
            </button>
          ))}
        </div>
      </div>

      {/* 风格预设：一键把风格化修饰追加到描述 */}
      {stylePresets.length > 0 ? (
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <p className="text-[13px] font-semibold text-ink-secondary">风格预设</p>
            <span className="text-xs text-ink-faint">点击套用，再次点击取消</span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            {stylePresets.map((preset) => {
              const applied = appliedPresetIds.has(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => toggleStylePreset(preset)}
                  title={preset.description || preset.promptSuffix}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-[13px] font-semibold transition",
                    applied
                      ? "border-brand-500 bg-brand-500 text-white shadow-chip"
                      : "border-line bg-panel text-ink-secondary hover:border-brand-200 hover:bg-brand-50/50 hover:text-brand-600",
                  )}
                >
                  {applied ? <Check size={14} /> : <Palette size={14} />}
                  {preset.name}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {/* 画幅比例 / 质量 / 张数 */}
      <div className="grid gap-4 sm:grid-cols-3">
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

        <div>
          <p className="text-[13px] font-semibold text-ink-secondary">质量</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {qualities.map((item) => (
              <button key={item.value} type="button" className={chipClass(quality === item.value)} onClick={() => setQuality(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[13px] font-semibold text-ink-secondary">张数</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {imageCounts.map((item) => (
              <button key={item} type="button" className={chipClass(imageCount === item)} onClick={() => setImageCount(item)}>
                {item} 张
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 润色回填预览 */}
      {polishedPromptEn || negativePrompt ? (
        <div className="space-y-2 rounded-xl border border-brand-100 bg-brand-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-brand-500 px-2 py-0.5 text-[11px] font-bold text-white">{polishProvider}</span>
            <span className="text-[13px] font-bold text-ink">已回填整理结果</span>
          </div>
          {polishedPromptEn ? <p className="break-words text-[13px] leading-5 text-ink-secondary">{polishedPromptEn}</p> : null}
          {negativePrompt ? <p className="text-xs leading-5 text-ink-faint">避免：{negativePrompt}</p> : null}
        </div>
      ) : null}

      {notice ? <div className="rounded-xl bg-emerald-50 dark:bg-emerald-500/10 px-3.5 py-2.5 text-sm font-medium text-emerald-600 dark:text-emerald-300">{notice}</div> : null}
      {error ? <div className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{error}</div> : null}

      {/* 操作行 */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={polishPrompt}
          disabled={isPolishing || isGenerating}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-line bg-panel px-4 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page disabled:opacity-60"
        >
          {isPolishing ? <Loader2 className="animate-spin" size={16} /> : <Wand2 size={16} />}
          整理描述
        </button>
        <button
          type="button"
          onClick={startGeneration}
          disabled={!canGenerate}
          className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-brand-500 px-4 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60"
        >
          {isGenerating ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />}
          开始生成
        </button>
        <button
          type="button"
          onClick={resetComposer}
          aria-label="重置"
          title="重置"
          className="flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-xl border border-line bg-panel text-ink-faint transition hover:bg-page hover:text-ink-secondary"
        >
          <RotateCcw size={16} />
        </button>
      </div>

      {referenceImagesEnabled && referenceImages.length > 0 ? <p className="text-xs leading-5 text-ink-faint">参考图会保存到任务记录中。</p> : null}
    </section>
  );
}
