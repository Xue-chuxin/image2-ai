"use client";

import Link from "next/link";
import { useState } from "react";
import { Copy, Download, Loader2, RotateCcw, Wand2 } from "lucide-react";

type RetryResponse = {
  ok: boolean;
  error?: string;
};

export function HistoryJobActions({
  jobId,
  status,
  promptZh,
  imageUrl,
}: {
  jobId: string;
  status: string;
  promptZh: string;
  imageUrl?: string;
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function copyPrompt() {
    await navigator.clipboard.writeText(promptZh);
    setMessage("提示词已复制。");
    setError("");
  }

  async function retryJob() {
    setIsRetrying(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/generation/jobs/${jobId}/retry`, {
        method: "POST",
      });
      const data = (await response.json()) as RetryResponse;

      if (!response.ok || !data.ok) {
        throw new Error(data.error || "重试任务失败");
      }

      setMessage("任务已重新提交，页面即将刷新。");
      window.setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "重试任务失败");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      {imageUrl ? (
        <a
          href={imageUrl}
          download
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card"
        >
          <Download className="h-4 w-4" />
          下载图片
        </a>
      ) : null}
      <button
        type="button"
        onClick={copyPrompt}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card"
      >
        <Copy className="h-4 w-4" />
        复制提示词
      </button>
      <Link
        href={`/generate?prompt=${encodeURIComponent(promptZh)}`}
        className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card"
      >
        <Wand2 className="h-4 w-4" />
        再次生成
      </Link>
      {status === "FAILED" || status === "CANCELED" ? (
        <button
          type="button"
          onClick={retryJob}
          disabled={isRetrying}
          className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-card disabled:opacity-60"
        >
          {isRetrying ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
          重试任务
        </button>
      ) : null}
      {message ? <span className="text-xs font-bold text-emerald-600">{message}</span> : null}
      {error ? <span className="text-xs font-bold text-red-600">{error}</span> : null}
    </div>
  );
}
