"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { ImageUp, Loader2, RotateCcw, Send, Wand2 } from "lucide-react";

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
  images: Array<{
    id: string;
    url: string;
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
  };
  source?: string;
  warning?: string;
};

type GenerationResult = {
  job?: GenerationJobResult;
};

type GenerateComposerProps = {
  initialPrompt?: string;
  onJobChange?: (job: GenerationJobResult | null) => void;
};

const styles = ["写实", "商品", "角色", "界面", "插画", "建筑"] as const;
const ratios = ["1:1", "3:4", "16:9", "9:16"] as const;
const qualities = [
  { value: "standard", label: "标准" },
  { value: "high", label: "高清" },
  { value: "low", label: "省积分" },
] as const;
const imageCounts = [1, 2, 4] as const;

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

export function GenerateComposer({ initialPrompt = "", onJobChange }: GenerateComposerProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [selectedStyle, setSelectedStyle] = useState<(typeof styles)[number]>("写实");
  const [ratio, setRatio] = useState<(typeof ratios)[number]>("1:1");
  const [quality, setQuality] = useState<(typeof qualities)[number]["value"]>("standard");
  const [imageCount, setImageCount] = useState<(typeof imageCounts)[number]>(1);
  const [polishedPrompt, setPolishedPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [polishProvider, setPolishProvider] = useState("DeepSeek");
  const [currentJob, setCurrentJob] = useState<GenerationJobResult | null>(null);
  const [isPolishing, setIsPolishing] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !isGenerating, [prompt, isGenerating]);

  function updateJob(job: GenerationJobResult | null) {
    setCurrentJob(job);
    onJobChange?.(job);
  }

  async function polishPrompt() {
    const rawPrompt = prompt.trim();

    if (!rawPrompt) {
      setError("先输入一句想生成的画面描述");
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
      setPolishedPrompt(data.promptEn || data.promptZh || "");
      setNegativePrompt(data.negativePrompt || "");
      setPolishProvider(result.source === "local" ? "本地兜底" : data.provider || "DeepSeek");
      setNotice(result.warning || "提示词已润色，可以直接开始生成");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "润色失败");
    } finally {
      setIsPolishing(false);
    }
  }

  async function startGeneration() {
    const rawPrompt = prompt.trim();

    if (!rawPrompt) {
      setError("先输入一句想生成的画面描述");
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
          promptEn: polishedPrompt || undefined,
          negativePrompt: negativePrompt || undefined,
          ratio,
          quality,
          imageCount,
          provider: "openai",
        }),
      });
      const result = await readApiJson<GenerationResult>(response);

      if (result.job) {
        updateJob(result.job);
      }

      if (!response.ok || result.ok === false) {
        throw new Error(result.error || result.job?.errorMessage || "生成失败");
      }

      setNotice("生成完成，结果已保存到历史记录");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "生成失败");
    } finally {
      setIsGenerating(false);
    }
  }

  function resetComposer() {
    setPrompt("");
    setPolishedPrompt("");
    setNegativePrompt("");
    setNotice("");
    setError("");
    updateJob(null);
  }

  return (
    <section className="composer-panel">
      <div className="composer-head">
        <div>
          <span className="eyebrow">Create</span>
          <h1>一句话生成你的视觉草图</h1>
          <p>输入想法后可先润色提示词，再调用后台配置的 OpenAI 生图通道。</p>
        </div>
        <button className="icon-button" type="button" onClick={resetComposer} aria-label="重置">
          <RotateCcw size={18} />
        </button>
      </div>

      <div className="upload-card" aria-label="参考图上传占位">
        <ImageUp size={24} />
        <span>拖入参考图</span>
        <small>阶段 4B 暂不处理图生图，先保留入口</small>
      </div>

      <label className="field-block">
        <span>画面描述</span>
        <textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：蓝白色玻璃质感的移动端应用启动页，柔和自然光，简洁高级"
          rows={5}
        />
      </label>

      <div className="option-group">
        <span>风格方向</span>
        <div className="chip-row">
          {styles.map((style) => (
            <button
              key={style}
              className={clsx("chip", selectedStyle === style && "active")}
              type="button"
              onClick={() => setSelectedStyle(style)}
            >
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
              <button
                key={item}
                className={clsx("chip", ratio === item && "active")}
                type="button"
                onClick={() => setRatio(item)}
              >
                {item}
              </button>
            ))}
          </div>
        </div>

        <div className="option-group">
          <span>质量</span>
          <div className="chip-row">
            {qualities.map((item) => (
              <button
                key={item.value}
                className={clsx("chip", quality === item.value && "active")}
                type="button"
                onClick={() => setQuality(item.value)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="option-group">
          <span>张数</span>
          <div className="chip-row">
            {imageCounts.map((item) => (
              <button
                key={item}
                className={clsx("chip", imageCount === item && "active")}
                type="button"
                onClick={() => setImageCount(item)}
              >
                {item} 张
              </button>
            ))}
          </div>
        </div>
      </div>

      {polishedPrompt ? (
        <div className="prompt-preview">
          <div>
            <span>{polishProvider}</span>
            <strong>润色后的提示词</strong>
          </div>
          <p>{polishedPrompt}</p>
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
        <button className="ghost-button" type="button" onClick={polishPrompt} disabled={isPolishing}>
          {isPolishing ? <Loader2 className="spin" size={17} /> : <Wand2 size={17} />}
          AI 润色
        </button>
        <button className="primary-button" type="button" onClick={startGeneration} disabled={!canGenerate}>
          {isGenerating ? <Loader2 className="spin" size={17} /> : <Send size={17} />}
          {isGenerating ? "生成中" : "开始生成"}
        </button>
      </div>
    </section>
  );
}
