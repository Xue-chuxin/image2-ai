"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, EyeOff, Globe2, RefreshCcw, Send, Trash2 } from "lucide-react";
import { CopyPromptButton } from "@/components/copy-prompt-button";

type HistoryImageActionView = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  isPublic?: boolean;
  isDeleted?: boolean;
  takenDownAt?: string | null;
  takenDownReason?: string | null;
};

type HistoryReferenceImageView = {
  id: string;
  url: string;
  thumbnailUrl?: string | null;
  mimeType?: string | null;
  fileSize?: number | null;
};

type HistoryJobActionsProps = {
  job?: {
    id?: string;
    status?: string;
    promptZh?: string;
    promptEn?: string | null;
    negativePrompt?: string | null;
    ratio?: string;
    quality?: string;
    imageCount?: number;
    images?: HistoryImageActionView[];
    referenceImages?: HistoryReferenceImageView[];
  };
  jobId?: string;
  id?: string;
  status?: string;
  promptZh?: string;
  prompt?: string;
  promptEn?: string | null;
  negativePrompt?: string | null;
  ratio?: string;
  quality?: string;
  imageCount?: number;
  images?: HistoryImageActionView[];
  referenceImages?: HistoryReferenceImageView[];
  [key: string]: unknown;
};

type ActionPayload = {
  ok: boolean;
  error?: string;
  image?: HistoryImageActionView;
  job?: unknown;
};

function buttonClass(tone: "dark" | "light" | "danger" = "light") {
  if (tone === "dark") {
    return "inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white";
  }

  if (tone === "danger") {
    return "inline-flex items-center justify-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600";
  }

  return "inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600";
}

function formatSize(bytes?: number | null) {
  if (!bytes) {
    return "未知大小";
  }

  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }

  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function HistoryJobActions(props: HistoryJobActionsProps) {
  const job = props.job || {};
  const jobId = props.jobId || props.id || job.id || "";
  const status = props.status || job.status || "";
  const promptZh = props.promptZh || props.prompt || job.promptZh || "";
  const promptEn = props.promptEn ?? job.promptEn ?? null;
  const negativePrompt = props.negativePrompt ?? job.negativePrompt ?? null;
  const ratio = props.ratio || job.ratio || "1:1";
  const quality = props.quality || job.quality || "standard";
  const imageCount = props.imageCount || job.imageCount || 1;
  const referenceImages = props.referenceImages || job.referenceImages || [];
  const [images, setImages] = useState<HistoryImageActionView[]>(props.images || job.images || []);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  const generateHref = useMemo(() => {
    const params = new URLSearchParams();
    if (promptZh) {
      params.set("prompt", promptZh);
    }
    if (promptEn) {
      params.set("promptEn", promptEn);
    }
    if (negativePrompt) {
      params.set("negativePrompt", negativePrompt);
    }
    params.set("ratio", ratio);
    params.set("quality", quality);
    params.set("imageCount", String(imageCount));
    for (const image of referenceImages) {
      params.append("referenceImageIds", image.id);
      params.append("referenceImageUrls", image.thumbnailUrl || image.url);
    }
    return `/generate?${params.toString()}`;
  }, [imageCount, negativePrompt, promptEn, promptZh, quality, ratio, referenceImages]);

  async function requestJson(url: string, init: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as ActionPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function retryJob() {
    if (!jobId) {
      return;
    }

    setPending("retry");
    setMessage("");
    try {
      await requestJson(`/api/generation/jobs/${jobId}/retry`, {
        method: "POST",
      });
      setMessage("已重新提交任务，稍后在记录里查看结果。");
      window.setTimeout(() => window.location.reload(), 800);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "重试失败");
    } finally {
      setPending("");
    }
  }

  async function updateImage(imageId: string, action: "publish" | "unpublish" | "delete") {
    setPending(`${action}:${imageId}`);
    setMessage("");

    try {
      const url = action === "delete" ? `/api/images/${imageId}` : `/api/images/${imageId}/${action}`;
      const payload = await requestJson(url, {
        method: action === "delete" ? "DELETE" : "POST",
      });

      if (payload.image) {
        setImages((current) =>
          current.map((image) => {
            if (image.id !== imageId) {
              return image;
            }
            return {
              ...image,
              ...payload.image,
            };
          }),
        );
      }

      if (action === "publish") {
        setMessage("作品已发布到首页广场。");
      } else if (action === "unpublish") {
        setMessage("已取消发布。");
      } else {
        setMessage("作品记录已删除。");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "操作失败");
    } finally {
      setPending("");
    }
  }

  const retryable = status === "FAILED" || status === "CANCELED";
  const visibleImages = images.filter((image) => !image.isDeleted);

  return (
    <div className="space-y-3">
      {referenceImages.length > 0 ? (
        <div className="rounded-[20px] border border-slate-200 bg-white/80 p-3 shadow-card">
          <div className="mb-3 flex items-center justify-between">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Reference Images</p>
            <span className="text-xs font-black text-slate-400">{referenceImages.length} 张</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {referenceImages.map((image) => (
              <a key={image.id} href={image.url} target="_blank" rel="noreferrer" className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                <img src={image.thumbnailUrl || image.url} alt="参考图" className="h-24 w-full object-cover" />
                <div className="p-2">
                  <p className="truncate text-xs font-black text-slate-700">{image.mimeType || "参考图"}</p>
                  <p className="mt-1 text-xs font-bold text-slate-400">{formatSize(image.fileSize)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {promptZh ? <CopyPromptButton text={promptZh} label="复制提示词" className={buttonClass("light")} /> : null}
        <Link href={generateHref} className={buttonClass("light")}>
          <Send className="h-4 w-4" />
          再次生成
        </Link>
        {retryable ? (
          <button type="button" onClick={retryJob} disabled={pending === "retry"} className={buttonClass("dark")}>
            <RefreshCcw className="h-4 w-4" />
            {pending === "retry" ? "重试中" : "重试失败任务"}
          </button>
        ) : null}
      </div>

      {visibleImages.length > 0 ? (
        <div className="grid gap-2">
          {visibleImages.map((image) => {
            const imagePending = pending.endsWith(`:${image.id}`);
            const disabledByTakeDown = Boolean(image.takenDownAt);

            return (
              <div key={image.id} className="rounded-[20px] border border-slate-200 bg-white/80 p-3 shadow-card">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Image</p>
                    <p className="mt-1 truncate text-sm font-bold text-slate-600">{image.id}</p>
                    {disabledByTakeDown ? <p className="mt-1 text-xs font-bold text-rose-500">已被后台下架：{image.takenDownReason || "管理员下架"}</p> : null}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <a href={image.url} download className={buttonClass("light")}>
                      <Download className="h-4 w-4" />
                      下载
                    </a>
                    {image.isPublic ? (
                      <button type="button" disabled={imagePending} onClick={() => updateImage(image.id, "unpublish")} className={buttonClass("light")}>
                        <EyeOff className="h-4 w-4" />
                        取消发布
                      </button>
                    ) : (
                      <button type="button" disabled={imagePending || disabledByTakeDown} onClick={() => updateImage(image.id, "publish")} className={buttonClass("dark")}>
                        <Globe2 className="h-4 w-4" />
                        发布广场
                      </button>
                    )}
                    <button type="button" disabled={imagePending} onClick={() => updateImage(image.id, "delete")} className={buttonClass("danger")}>
                      <Trash2 className="h-4 w-4" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {message ? <p className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-600">{message}</p> : null}
    </div>
  );
}
