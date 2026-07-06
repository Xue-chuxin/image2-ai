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

function buttonClass(tone: "primary" | "secondary" | "danger" = "secondary") {
  if (tone === "primary") {
    return "inline-flex items-center justify-center gap-1.5 rounded-xl bg-brand-500 px-3.5 py-2 text-[13px] font-bold text-white shadow-chip transition hover:bg-brand-600 disabled:opacity-60";
  }

  if (tone === "danger") {
    return "inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-100 bg-rose-50 px-3.5 py-2 text-[13px] font-semibold text-rose-500 transition hover:bg-rose-100 disabled:opacity-60";
  }

  return "inline-flex items-center justify-center gap-1.5 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-secondary transition hover:bg-page disabled:opacity-60";
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
        <div className="rounded-xl border border-line bg-page/50 p-3">
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-xs font-semibold text-ink-faint">参考图</p>
            <span className="text-xs font-medium text-ink-faint">{referenceImages.length} 张</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {referenceImages.map((image) => (
              <a
                key={image.id}
                href={image.url}
                target="_blank"
                rel="noreferrer"
                className="overflow-hidden rounded-lg border border-line bg-white transition hover:border-brand-300"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.thumbnailUrl || image.url} alt="参考图" className="h-20 w-full object-cover" />
                <div className="px-2 py-1.5">
                  <p className="truncate text-xs font-semibold text-ink-secondary">{image.mimeType || "参考图"}</p>
                  <p className="mt-0.5 text-[11px] font-medium text-ink-faint">{formatSize(image.fileSize)}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        {promptZh ? <CopyPromptButton text={promptZh} label="复制提示词" className={buttonClass("secondary")} /> : null}
        <Link href={generateHref} className={buttonClass("secondary")}>
          <Send className="h-3.5 w-3.5" />
          再次生成
        </Link>
        {retryable ? (
          <button type="button" onClick={retryJob} disabled={pending === "retry"} className={buttonClass("primary")}>
            <RefreshCcw className="h-3.5 w-3.5" />
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
              <div key={image.id} className="rounded-xl border border-line bg-page/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-ink-faint">图片 ID</p>
                    <p className="mt-0.5 truncate text-[13px] font-semibold text-ink-secondary">{image.id}</p>
                    {disabledByTakeDown ? (
                      <p className="mt-1 text-xs font-semibold text-rose-500">已被后台下架：{image.takenDownReason || "管理员下架"}</p>
                    ) : null}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a href={image.url} download className={buttonClass("secondary")}>
                      <Download className="h-3.5 w-3.5" />
                      下载
                    </a>
                    {image.isPublic ? (
                      <button type="button" disabled={imagePending} onClick={() => updateImage(image.id, "unpublish")} className={buttonClass("secondary")}>
                        <EyeOff className="h-3.5 w-3.5" />
                        取消发布
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={imagePending || disabledByTakeDown}
                        onClick={() => updateImage(image.id, "publish")}
                        className={buttonClass("primary")}
                      >
                        <Globe2 className="h-3.5 w-3.5" />
                        发布广场
                      </button>
                    )}
                    <button type="button" disabled={imagePending} onClick={() => updateImage(image.id, "delete")} className={buttonClass("danger")}>
                      <Trash2 className="h-3.5 w-3.5" />
                      删除
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}

      {message ? (
        <p className="rounded-xl border border-line bg-page px-3.5 py-2.5 text-sm font-medium text-ink-secondary">{message}</p>
      ) : null}
    </div>
  );
}
