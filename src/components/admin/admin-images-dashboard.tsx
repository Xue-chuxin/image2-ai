"use client";

import { useMemo, useState } from "react";
import { Download, RefreshCcw, Search, ShieldAlert } from "lucide-react";
import type { AdminGalleryImageView } from "@/lib/gallery";

type AdminImagesPayload = {
  ok: boolean;
  images?: AdminGalleryImageView[];
  image?: AdminGalleryImageView;
  error?: string;
};

const statusOptions = [
  ["all", "全部"],
  ["public", "已公开"],
  ["private", "未公开"],
  ["taken_down", "已下架"],
  ["deleted", "已删除"],
];

function statusLabel(image: AdminGalleryImageView) {
  if (image.isDeleted) {
    return "已删除";
  }
  if (image.takenDownAt) {
    return "已下架";
  }
  if (image.isPublic) {
    return "已公开";
  }
  return "未公开";
}

function statusClass(image: AdminGalleryImageView) {
  if (image.isDeleted || image.takenDownAt) {
    return "bg-rose-50 text-rose-600 border-rose-100";
  }
  if (image.isPublic) {
    return "bg-emerald-50 text-emerald-600 border-emerald-100";
  }
  return "bg-slate-50 text-slate-500 border-slate-200";
}

export function AdminImagesDashboard({ initialImages }: { initialImages: AdminGalleryImageView[] }) {
  const [images, setImages] = useState(initialImages);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState("");
  const [message, setMessage] = useState("");

  const stats = useMemo(
    () => ({
      total: images.length,
      public: images.filter((image) => image.isPublic && !image.takenDownAt && !image.isDeleted).length,
      takenDown: images.filter((image) => image.takenDownAt).length,
      deleted: images.filter((image) => image.isDeleted).length,
    }),
    [images],
  );

  async function requestJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as AdminImagesPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function loadImages(nextStatus = status, nextQuery = query) {
    setPending("refresh");
    setMessage("");

    try {
      const params = new URLSearchParams();
      if (nextStatus !== "all") {
        params.set("status", nextStatus);
      }
      if (nextQuery.trim()) {
        params.set("q", nextQuery.trim());
      }

      const payload = await requestJson(`/api/admin/images?${params.toString()}`);
      setImages(payload.images || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setPending("");
    }
  }

  async function takeDown(imageId: string) {
    const reason = window.prompt("请输入下架原因", "管理员下架") || "管理员下架";
    setPending(`take-down:${imageId}`);
    setMessage("");

    try {
      const payload = await requestJson(`/api/admin/images/${imageId}/take-down`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
        }),
      });

      if (payload.image) {
        setImages((current) => current.map((image) => (image.id === imageId ? payload.image! : image)));
      }
      setMessage("作品已下架。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "下架失败");
    } finally {
      setPending("");
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        {[
          ["全部", stats.total],
          ["已公开", stats.public],
          ["已下架", stats.takenDown],
          ["已删除", stats.deleted],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
            {statusOptions.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  setStatus(value);
                  void loadImages(value, query);
                }}
                className={`shrink-0 rounded-full border px-4 py-2 text-sm font-black ${status === value ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-600"}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex min-w-0 flex-1 items-center gap-2 lg:max-w-lg">
            <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-slate-500" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void loadImages(status, query);
                  }
                }}
                className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
                placeholder="搜索邮箱、任务 ID、提示词"
              />
            </label>
            <button type="button" onClick={() => loadImages(status, query)} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
              {pending === "refresh" ? "刷新中" : "搜索"}
            </button>
          </div>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-card">{message}</p> : null}

      <div className="grid gap-4">
        {images.map((image) => (
          <article key={image.id} className="grid gap-4 rounded-[26px] border border-slate-200 bg-white/90 p-4 shadow-card backdrop-blur md:grid-cols-[180px_1fr]">
            <div className="overflow-hidden rounded-[22px] border border-slate-200 bg-slate-50">
              <img src={image.thumbnailUrl || image.url} alt={image.promptZh} className="h-48 w-full object-cover md:h-full" />
            </div>
            <div className="min-w-0 space-y-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(image)}`}>{statusLabel(image)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{image.provider}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{image.ratio}</span>
                  </div>
                  <h3 className="mt-3 line-clamp-2 text-xl font-black text-slate-950">{image.promptZh}</h3>
                  <p className="mt-2 text-sm font-bold text-slate-500">{image.authorEmail || image.authorName} · {image.jobStatus} · {image.creditCost} 积分</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <a href={image.url} download className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                    <Download className="h-4 w-4" />
                    下载
                  </a>
                  {!image.isDeleted && !image.takenDownAt ? (
                    <button
                      type="button"
                      disabled={pending === `take-down:${image.id}`}
                      onClick={() => takeDown(image.id)}
                      className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600"
                    >
                      <ShieldAlert className="h-4 w-4" />
                      下架
                    </button>
                  ) : null}
                  <button type="button" onClick={() => loadImages(status, query)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                    <RefreshCcw className="h-4 w-4" />
                    刷新
                  </button>
                </div>
              </div>

              <dl className="grid gap-2 text-xs font-bold text-slate-500 md:grid-cols-3">
                {[
                  ["图片 ID", image.id],
                  ["任务 ID", image.jobId],
                  ["分类", image.category],
                  ["MIME", image.mimeType || "未知"],
                  ["大小", image.fileSize ? `${Math.round(image.fileSize / 1024)} KB` : "未知"],
                  ["发布时间", image.publishedAt ? new Date(image.publishedAt).toLocaleString("zh-CN") : "未发布"],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl bg-slate-50 px-3 py-2">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="mt-1 truncate text-slate-700">{value}</dd>
                  </div>
                ))}
              </dl>

              {image.takenDownReason ? <p className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">下架原因：{image.takenDownReason}</p> : null}
            </div>
          </article>
        ))}
      </div>

      {images.length === 0 ? (
        <div className="rounded-[26px] border border-slate-200 bg-white/90 p-8 text-center shadow-card backdrop-blur">
          <p className="text-lg font-black text-slate-950">暂无作品记录</p>
          <p className="mt-2 text-sm text-slate-500">生成成功并保存图片后，这里会显示作品资产。</p>
        </div>
      ) : null}
    </section>
  );
}
