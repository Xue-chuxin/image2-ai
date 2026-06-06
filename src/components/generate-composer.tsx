"use client";

import { type ChangeEvent, type DragEvent, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2, RotateCcw, Send, UploadCloud, Wand2, X } from "lucide-react";
import { IMAGE_STYLE_CATEGORIES, type ImageStyleCategory } from "@/lib/image-categories";

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
  provider: "openai" | "chatgpt_web";
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
  initialReferenceImages?: ReferenceImageResult[];
  onJobChange?: (job: GenerationJobResult | null) => void;
  compact?: boolean;
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

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
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

export function GenerateComposer({ initialPrompt = "", initialReferenceImages = [], onJobChange, compact = false }: GenerateComposerProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<ImageStyleCategory>("写真");
  const [ratio, setRatio] = useState<(typeof ratios)[number]>("1:1");
  const [quality, setQuality] = useState<(typeof qualities)[number]["value"]>("standard");
  const [imageCount, setImageCount] = useState<(typeof imageCounts)[number]>(1);
  const [polishedPromptEn, setPolishedPromptEn] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [polishProvider, setPolishProvider] = useState("DeepSeek");
  const [referenceImages, setReferenceImages] = useState<ReferenceImageResult[]>(initialReferenceImages.slice(0, MAX_REFERENCE_IMAGES));
  const [isDragging, setIsDragging] = useState(false);
  const [isUploadingReference, setIsUploadingReference] = useState(false);
  const [currentJob, setCurrentJob] = useState<GenerationJobResult | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !isGenerating && !isUploadingReference, [prompt, isGenerating, isUploadingReference]);

  function updateJob(job: GenerationJobResult | null) {
    setCurrentJob(job);
    onJobChange?.(job);
  }

  async function pollGenerationJob(initialJob: GenerationJobResult) {
    let latestJob = initialJob;

    for (let attempt = 0; attempt < 180; attempt += 1) {
      await wait(2000);
      const pollResponse = await fetch(`/api/generation/jobs/${latestJob.id}`, {
        method: "GET",
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
        body: JSON.stringify({
          promptZh: rawPrompt,
          promptEn: polishedPromptEn || undefined,
          negativePrompt: negativePrompt || undefined,
          ratio,
          quality,
          imageCount,
          referenceImageIds: referenceImages.map((image) => image.id),
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
        finalJob = await pollGenerationJob(finalJob);
      }

      if (finalJob.status === "FAILED") {
        throw new Error(finalJob.errorMessage || "生成失败");
      }

      setNotice("生成完成，结果已保存到历史记录。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  function resetComposer() {
    setPrompt("");
    setPolishedPromptEn("");
    setNegativePrompt("");
    setReferenceImages([]);
    setNotice("");
    setError("");
    updateJob(null);
  }

  function removeReferenceImage(id: string) {
    setReferenceImages((current) => current.filter((image) => image.id !== id));
  }

  return (
    <section className={clsx("composer-panel", compact && "composer-panel-compact")}>
      <div className="composer-head">
        <div>
          <span className="eyebrow">Create</span>
          <h1>把一句描述整理成画面</h1>
          <p>写下画面、选择比例和张数。需要时可以先整理文字，再提交生成。</p>
        </div>
        <button className="icon-button" type="button" onClick={resetComposer} aria-label="重置">
          <RotateCcw size={18} />
        </button>
      </div>

      <div
        className={clsx("upload-card", isDragging && "ring-2 ring-slate-300")}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={onReferenceDrop}
      >
        <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" multiple className="hidden" onChange={onReferenceInputChange} />
        <button type="button" onClick={() => fileInputRef.current?.click()} className="flex w-full flex-col items-center gap-2 text-center">
          {isUploadingReference ? <Loader2 className="animate-spin" size={24} /> : <UploadCloud size={24} />}
          <span>{isUploadingReference ? "参考图上传中" : "拖入参考图，或点击上传"}</span>
          <small>PNG / JPG / WEBP，单张不超过 8MB，最多 4 张</small>
        </button>
      </div>

      {referenceImages.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {referenceImages.map((image) => (
            <div key={image.id} className="group relative overflow-hidden rounded-[18px] border border-slate-200 bg-white/85 shadow-card">
              <img src={image.thumbnailUrl || image.url} alt="参考图" className="h-28 w-full object-cover" />
              <button
                type="button"
                onClick={() => removeReferenceImage(image.id)}
                className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-slate-950/70 text-white backdrop-blur"
                aria-label="移除参考图"
              >
                <X size={14} />
              </button>
              <div className="p-2">
                <p className="truncate text-xs font-black text-slate-700">{image.mimeType.replace("image/", "").toUpperCase()}</p>
                <p className="mt-1 text-xs font-bold text-slate-400">{formatSize(image.fileSize)}</p>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <label className="field-block">
        <span>画面描述</span>
        <textarea
          value={prompt}
          onChange={(event) => {
            setPrompt(event.target.value);
            setPolishedPromptEn("");
            setNegativePrompt("");
          }}
          placeholder="例如：雨夜街头的人像写真，浅景深，侧光，35mm 镜头，背景干净，真实皮肤质感。"
          rows={5}
        />
      </label>

      <div className="option-group">
        <span>风格方向</span>
        <div className="chip-row">
          {IMAGE_STYLE_CATEGORIES.map((style) => (
            <button key={style} className={clsx("chip", selectedStyle === style && "active")} type="button" onClick={() => setSelectedStyle(style)}>
              {style}
            </button>
          ))}
        </div>
      </div>

      <div className="option-grid">
        <div className="option-group">
          <span>画幅比例</span>
          <div className="chip-row">
            {ratios.map((item) => (
              <button key={item} className={clsx("chip", ratio === item && "active")} type="button" onClick={() => setRatio(item)}>
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="option-group">
          <span>质量</span>
          <div className="chip-row">
            {qualities.map((item) => (
              <button key={item.value} className={clsx("chip", quality === item.value && "active")} type="button" onClick={() => setQuality(item.value)}>
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="option-group">
          <span>张数</span>
          <div className="chip-row">
            {imageCounts.map((item) => (
              <button key={item} className={clsx("chip", imageCount === item && "active")} type="button" onClick={() => setImageCount(item)}>
                {item} 张
              </button>
            ))}
          </div>
        </div>
      </div>

      {polishedPromptEn || negativePrompt ? (
        <div className="prompt-preview">
          <div>
            <span>{polishProvider}</span>
            <strong>已回填整理结果</strong>
          </div>
          {polishedPromptEn ? <p>{polishedPromptEn}</p> : null}
          {negativePrompt ? <small>避免：{negativePrompt}</small> : null}
        </div>
      ) : null}

      {currentJob?.images.length ? (
        <div className="result-strip">
          {currentJob.images.map((image) => (
            <img key={image.id} src={image.url} alt={currentJob.promptZh} />
          ))}
        </div>
      ) : null}

      {notice ? <div className="notice success">{notice}</div> : null}
      {error ? <div className="notice error">{error}</div> : null}

      <div className="composer-actions">
        <button type="button" onClick={polishPrompt} disabled={isPolishing || isGenerating} className="secondary-action">
          {isPolishing ? <Loader2 className="animate-spin" size={18} /> : <Wand2 size={18} />}
          整理描述
        </button>
        <button type="button" onClick={startGeneration} disabled={!canGenerate} className="primary-action">
          {isGenerating ? <Loader2 className="animate-spin" size={18} /> : <Send size={18} />}
          开始生成
        </button>
      </div>

      {referenceImages.length > 0 ? <p className="text-xs font-bold leading-6 text-slate-400">参考图会保存到任务记录中。当前版本不会把参考图自动上传到 ChatGPT Web。</p> : null}
    </section>
  );
}
