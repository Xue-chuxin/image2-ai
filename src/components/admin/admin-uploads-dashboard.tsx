"use client";

import { useMemo, useState } from "react";
import { Download, Search } from "lucide-react";
import type { AdminUploadedImageView } from "@/lib/uploads";

type UploadsPayload = {
  ok: boolean;
  images?: AdminUploadedImageView[];
  error?: string;
};

export function AdminUploadsDashboard({ initialImages }: { initialImages: AdminUploadedImageView[] }) {
  const [images, setImages] = useState(initialImages);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const totalSize = useMemo(() => images.reduce((sum, image) => sum + image.fileSize, 0), [images]);

  async function loadImages() {
    setPending(true);
    setMessage("");

    try {
      const params = new URLSearchParams();
      if (query.trim()) {
        params.set("q", query.trim());
      }

      const response = await fetch(`/api/admin/uploads?${params.toString()}`);
      const payload = (await response.json().catch(() => ({}))) as UploadsPayload;
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error || "刷新失败");
      }
      setImages(payload.images || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setPending(false);
    }
  }

  return (
    <section className="space-y-4">
      <div className="grid gap-3 md:grid-cols-3">
        {[
          ["上传图", images.length],
          ["总大小", `${Math.round(totalSize / 1024)} KB`],
          ["用途", "参考图"],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[22px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">{label}</p>
            <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-[26px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <label className="flex min-w-0 flex-1 items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <Search className="h-4 w-4 shrink-0 text-slate-500" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  void loadImages();
                }
              }}
              className="w-full bg-transparent text-sm font-bold text-slate-700 outline-none placeholder:text-slate-400"
              placeholder="搜索用户邮箱、上传图 ID、URL"
            />
          </label>
          <button type="button" onClick={loadImages} className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white">
            {pending ? "搜索中" : "搜索"}
          </button>
        </div>
      </div>

      {message ? <p className="rounded-2xl border border-slate-200 bg-white/90 px-4 py-3 text-sm font-bold text-slate-600 shadow-card">{message}</p> : null}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {images.map((image) => (
          <article key={image.id} className="overflow-hidden rounded-[26px] border border-slate-200 bg-white/90 shadow-card backdrop-blur">
            <img src={image.thumbnailUrl || image.url} alt={image.id} className="h-56 w-full object-cover" />
            <div className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Reference</p>
                  <h3 className="mt-1 truncate text-base font-black text-slate-950">{image.id}</h3>
                </div>
                <a href={image.url} download className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-600">
                  <Download className="h-4 w-4" />
                  下载
                </a>
              </div>
              <dl className="grid gap-2 text-xs font-bold text-slate-500">
                {[
                  ["用户", image.userEmail || image.userDisplayName || image.userId],
                  ["类型", image.mimeType],
                  ["大小", `${Math.round(image.fileSize / 1024)} KB`],
                  ["上传时间", new Date(image.createdAt).toLocaleString("zh-CN")],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2">
                    <dt className="text-slate-400">{label}</dt>
                    <dd className="max-w-[70%] truncate text-slate-700">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </article>
        ))}
      </div>

      {images.length === 0 ? (
        <div className="rounded-[26px] border border-slate-200 bg-white/90 p-8 text-center shadow-card backdrop-blur">
          <p className="text-lg font-black text-slate-950">暂无上传图</p>
          <p className="mt-2 text-sm text-slate-500">用户上传参考图后，这里会显示资源记录。</p>
        </div>
      ) : null}
    </section>
  );
}
