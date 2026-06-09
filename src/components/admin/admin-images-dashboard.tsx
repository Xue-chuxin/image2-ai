"use client";

import { useMemo, useState } from "react";
import { Download, Pencil, RefreshCcw, Search, ShieldAlert, Trash2 } from "lucide-react";
import type { AdminCuratedGalleryImageView, AdminGalleryImageView } from "@/lib/gallery";

type AdminImagesPayload = {
  ok: boolean;
  images?: AdminGalleryImageView[];
  image?: AdminGalleryImageView;
  error?: string;
};

type AdminCuratedPayload = {
  ok: boolean;
  images?: AdminCuratedGalleryImageView[];
  image?: AdminCuratedGalleryImageView;
  error?: string;
};

type CuratedForm = {
  id: string;
  title: string;
  summary: string;
  imageUrl: string;
  thumbnailUrl: string;
  ratio: string;
  category: string;
  tags: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  authorName: string;
  sourceName: string;
  sourceUrl: string;
  sortOrder: string;
  isActive: boolean;
};

const statusOptions = [
  ["all", "全部"],
  ["public", "已公开"],
  ["private", "未公开"],
  ["taken_down", "已下架"],
  ["deleted", "已删除"],
];

const categoryOptions = ["写真", "商品", "角色", "界面", "建筑", "插画", "国风", "其他"];
const ratioOptions = ["1:1", "3:4", "4:3", "9:16", "16:9"];

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

const emptyCuratedForm: CuratedForm = {
  id: "",
  title: "",
  summary: "",
  imageUrl: "",
  thumbnailUrl: "",
  ratio: "1:1",
  category: "其他",
  tags: "",
  promptZh: "",
  promptEn: "",
  negativePrompt: "",
  authorName: "造图台",
  sourceName: "运营精选",
  sourceUrl: "",
  sortOrder: "0",
  isActive: true,
};

function curatedStatusLabel(image: AdminCuratedGalleryImageView) {
  if (image.isDeleted) {
    return "已删除";
  }
  if (image.takenDownAt || !image.isActive) {
    return "已下架";
  }
  return "展示中";
}

function curatedStatusClass(image: AdminCuratedGalleryImageView) {
  if (image.isDeleted || image.takenDownAt || !image.isActive) {
    return "bg-rose-50 text-rose-600 border-rose-100";
  }
  return "bg-emerald-50 text-emerald-600 border-emerald-100";
}

export function AdminImagesDashboard({
  initialImages,
  initialCuratedImages,
}: {
  initialImages: AdminGalleryImageView[];
  initialCuratedImages: AdminCuratedGalleryImageView[];
}) {
  const [images, setImages] = useState(initialImages);
  const [curatedImages, setCuratedImages] = useState(initialCuratedImages);
  const [curatedForm, setCuratedForm] = useState<CuratedForm>(emptyCuratedForm);
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
      curated: curatedImages.filter((image) => image.isActive && !image.takenDownAt && !image.isDeleted).length,
    }),
    [curatedImages, images],
  );

  async function requestJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as AdminImagesPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  async function requestCuratedJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as AdminCuratedPayload;
    if (!response.ok || !payload.ok) {
      throw new Error(payload.error || "操作失败");
    }
    return payload;
  }

  function patchCuratedForm(key: keyof CuratedForm, value: string | boolean) {
    setCuratedForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function editCuratedImage(image: AdminCuratedGalleryImageView) {
    setCuratedForm({
      id: image.id,
      title: image.title,
      summary: image.summary,
      imageUrl: image.url,
      thumbnailUrl: image.thumbnailUrl === image.url ? "" : image.thumbnailUrl,
      ratio: image.ratio,
      category: image.category,
      tags: image.tags.join(", "),
      promptZh: image.promptZh,
      promptEn: image.promptEn || "",
      negativePrompt: image.negativePrompt || "",
      authorName: image.authorName,
      sourceName: image.sourceName || "运营精选",
      sourceUrl: image.sourceUrl || "",
      sortOrder: String(image.sortOrder),
      isActive: image.isActive && !image.takenDownAt && !image.isDeleted,
    });
  }

  async function loadCuratedImages() {
    setPending("curated-refresh");
    setMessage("");

    try {
      const payload = await requestCuratedJson("/api/admin/gallery/curated");
      setCuratedImages(payload.images || []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新运营精选失败");
    } finally {
      setPending("");
    }
  }

  async function saveCuratedImage() {
    setPending("curated-save");
    setMessage("");

    try {
      const payload = await requestCuratedJson("/api/admin/gallery/curated", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...curatedForm,
          id: curatedForm.id || undefined,
          sortOrder: Number(curatedForm.sortOrder || 0),
          tags: curatedForm.tags,
        }),
      });

      if (payload.image) {
        setCuratedImages((current) => {
          const exists = current.some((image) => image.id === payload.image!.id);
          return exists ? current.map((image) => (image.id === payload.image!.id ? payload.image! : image)) : [payload.image!, ...current];
        });
      }
      setCuratedForm(emptyCuratedForm);
      setMessage("运营精选作品已保存。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "保存运营精选失败");
    } finally {
      setPending("");
    }
  }

  async function takeDownCuratedImage(imageId: string) {
    const reason = window.prompt("请输入下架原因", "运营暂不展示") || "运营暂不展示";
    setPending(`curated-take-down:${imageId}`);
    setMessage("");

    try {
      const payload = await requestCuratedJson(`/api/admin/gallery/curated/${imageId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reason,
        }),
      });

      if (payload.image) {
        setCuratedImages((current) => current.map((image) => (image.id === imageId ? payload.image! : image)));
      }
      setMessage("运营精选作品已下架。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "下架运营精选失败");
    } finally {
      setPending("");
    }
  }

  async function deleteCuratedImage(imageId: string) {
    if (!window.confirm("确认删除这个运营精选作品吗？它会从公开作品流移除。")) {
      return;
    }

    setPending(`curated-delete:${imageId}`);
    setMessage("");

    try {
      const payload = await requestCuratedJson(`/api/admin/gallery/curated/${imageId}`, {
        method: "DELETE",
      });

      if (payload.image) {
        setCuratedImages((current) => current.map((image) => (image.id === imageId ? payload.image! : image)));
      }
      setMessage("运营精选作品已删除。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "删除运营精选失败");
    } finally {
      setPending("");
    }
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
      <div className="grid gap-3 md:grid-cols-5">
        {[
          ["全部", stats.total],
          ["已公开", stats.public],
          ["运营精选", stats.curated],
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
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">Curated Works</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">运营精选作品</h2>
            <p className="mt-2 text-sm font-bold leading-6 text-slate-500">用于补足首页和灵感页的早期内容；用户公开作品仍会优先展示。</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setCuratedForm(emptyCuratedForm)} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
              新建
            </button>
            <button type="button" onClick={() => void loadCuratedImages()} className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
              {pending === "curated-refresh" ? "刷新中" : "刷新精选"}
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-2">
          <label className="block">
            <span className="text-xs font-black text-slate-400">标题</span>
            <input value={curatedForm.title} onChange={(event) => patchCuratedForm("title", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="蓝白产品海报" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">图片地址</span>
            <input value={curatedForm.imageUrl} onChange={(event) => patchCuratedForm("imageUrl", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="https://..." />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">缩略图地址</span>
            <input value={curatedForm.thumbnailUrl} onChange={(event) => patchCuratedForm("thumbnailUrl", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="留空则使用原图" />
          </label>
          <div className="grid gap-3 sm:grid-cols-3">
            <label className="block">
              <span className="text-xs font-black text-slate-400">分类</span>
              <select value={curatedForm.category} onChange={(event) => patchCuratedForm("category", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                {categoryOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-400">比例</span>
              <select value={curatedForm.ratio} onChange={(event) => patchCuratedForm("ratio", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none">
                {ratioOptions.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-xs font-black text-slate-400">排序</span>
              <input value={curatedForm.sortOrder} onChange={(event) => patchCuratedForm("sortOrder", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="0" />
            </label>
          </div>
          <label className="block lg:col-span-2">
            <span className="text-xs font-black text-slate-400">简介</span>
            <textarea value={curatedForm.summary} onChange={(event) => patchCuratedForm("summary", event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700 outline-none" placeholder="作品卡片和详情里的简短描述。" />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-black text-slate-400">中文提示词</span>
            <textarea value={curatedForm.promptZh} onChange={(event) => patchCuratedForm("promptZh", event.target.value)} className="mt-1 min-h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700 outline-none" placeholder="用户点击复用描述时会带入这里。" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">英文提示词</span>
            <textarea value={curatedForm.promptEn} onChange={(event) => patchCuratedForm("promptEn", event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">过滤指令</span>
            <textarea value={curatedForm.negativePrompt} onChange={(event) => patchCuratedForm("negativePrompt", event.target.value)} className="mt-1 min-h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold leading-6 text-slate-700 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">标签</span>
            <input value={curatedForm.tags} onChange={(event) => patchCuratedForm("tags", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="蓝白, 产品, 留白" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">作者</span>
            <input value={curatedForm.authorName} onChange={(event) => patchCuratedForm("authorName", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">来源名称</span>
            <input value={curatedForm.sourceName} onChange={(event) => patchCuratedForm("sourceName", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" />
          </label>
          <label className="block">
            <span className="text-xs font-black text-slate-400">来源链接</span>
            <input value={curatedForm.sourceUrl} onChange={(event) => patchCuratedForm("sourceUrl", event.target.value)} className="mt-1 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700 outline-none" placeholder="可留空" />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-black text-slate-600">
            <input type="checkbox" checked={curatedForm.isActive} onChange={(event) => patchCuratedForm("isActive", event.target.checked)} />
            展示到作品流
          </label>
          <button type="button" onClick={() => void saveCuratedImage()} disabled={pending === "curated-save"} className="rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white disabled:opacity-60">
            {pending === "curated-save" ? "保存中" : curatedForm.id ? "保存修改" : "添加精选"}
          </button>
        </div>

        <div className="mt-5 grid gap-3">
          {curatedImages.map((image) => (
            <article key={image.id} className="grid gap-3 rounded-[22px] border border-slate-200 bg-slate-50/78 p-3 md:grid-cols-[120px_1fr]">
              <img src={image.thumbnailUrl || image.url} alt={image.title} className="h-32 w-full rounded-[18px] border border-slate-200 object-cover" />
              <div className="min-w-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap gap-2">
                      <span className={`rounded-full border px-3 py-1 text-xs font-black ${curatedStatusClass(image)}`}>{curatedStatusLabel(image)}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{image.category}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">{image.ratio}</span>
                      <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-black text-slate-500">排序 {image.sortOrder}</span>
                    </div>
                    <h3 className="mt-3 line-clamp-1 text-lg font-black text-slate-950">{image.title}</h3>
                    <p className="mt-1 line-clamp-2 text-sm font-bold leading-6 text-slate-500">{image.summary}</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" onClick={() => editCuratedImage(image)} className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
                      <Pencil className="h-4 w-4" />
                      编辑
                    </button>
                    {!image.isDeleted && !image.takenDownAt && image.isActive ? (
                      <button type="button" disabled={pending === `curated-take-down:${image.id}`} onClick={() => void takeDownCuratedImage(image.id)} className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-black text-rose-600">
                        <ShieldAlert className="h-4 w-4" />
                        下架
                      </button>
                    ) : null}
                    {!image.isDeleted ? (
                      <button type="button" disabled={pending === `curated-delete:${image.id}`} onClick={() => void deleteCuratedImage(image.id)} className="inline-flex items-center gap-2 rounded-2xl border border-rose-100 bg-white px-4 py-3 text-sm font-black text-rose-600">
                        <Trash2 className="h-4 w-4" />
                        删除
                      </button>
                    ) : null}
                  </div>
                </div>
                {image.takenDownReason ? <p className="mt-3 rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-600">下架原因：{image.takenDownReason}</p> : null}
              </div>
            </article>
          ))}
          {curatedImages.length === 0 ? <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-sm font-bold text-slate-500">暂无运营精选作品。</p> : null}
        </div>
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
