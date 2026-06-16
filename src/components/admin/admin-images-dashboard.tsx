"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Image, Input, Select, Space, Statistic, Switch, Table, Tabs, Tag, Textarea } from "tdesign-react";
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
  { value: "all", label: "全部" },
  { value: "public", label: "已公开" },
  { value: "private", label: "未公开" },
  { value: "taken_down", label: "已下架" },
  { value: "deleted", label: "已删除" },
];

const categoryOptions = ["写真", "商品", "角色", "界面", "建筑", "插画", "国风", "其他"].map((value) => ({ value, label: value }));
const ratioOptions = ["1:1", "3:4", "4:3", "9:16", "16:9"].map((value) => ({ value, label: value }));

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

function statusLabel(image: AdminGalleryImageView) {
  if (image.isDeleted) return "已删除";
  if (image.takenDownAt) return "已下架";
  if (image.isPublic) return "已公开";
  return "未公开";
}

function statusTheme(image: AdminGalleryImageView): "success" | "danger" | "default" {
  if (image.isDeleted || image.takenDownAt) return "danger";
  if (image.isPublic) return "success";
  return "default";
}

function curatedStatusLabel(image: AdminCuratedGalleryImageView) {
  if (image.isDeleted) return "已删除";
  if (image.takenDownAt || !image.isActive) return "已下架";
  return "展示中";
}

function curatedStatusTheme(image: AdminCuratedGalleryImageView): "success" | "danger" {
  return image.isDeleted || image.takenDownAt || !image.isActive ? "danger" : "success";
}

function formatSize(value?: number | null) {
  if (!value) return "未知";
  return value >= 1024 * 1024 ? `${(value / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(value / 1024))} KB`;
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
    if (!response.ok || !payload.ok) throw new Error(payload.error || "操作失败");
    return payload;
  }

  async function requestCuratedJson(url: string, init?: RequestInit) {
    const response = await fetch(url, init);
    const payload = (await response.json().catch(() => ({}))) as AdminCuratedPayload;
    if (!response.ok || !payload.ok) throw new Error(payload.error || "操作失败");
    return payload;
  }

  function patchCuratedForm(key: keyof CuratedForm, value: string | boolean) {
    setCuratedForm((current) => ({ ...current, [key]: value }));
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
      setMessage("运营精选已刷新。");
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
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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
    if (!window.confirm("确认删除这个运营精选作品吗？它会从公开作品流移除。")) return;
    setPending(`curated-delete:${imageId}`);
    setMessage("");
    try {
      const payload = await requestCuratedJson(`/api/admin/gallery/curated/${imageId}`, { method: "DELETE" });
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
      if (nextStatus !== "all") params.set("status", nextStatus);
      if (nextQuery.trim()) params.set("q", nextQuery.trim());
      const payload = await requestJson(`/api/admin/images?${params.toString()}`);
      setImages(payload.images || []);
      setMessage("作品列表已刷新。");
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
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

  const imageColumns = [
    {
      colKey: "preview",
      title: "预览",
      width: 120,
      cell: ({ row }: { row: AdminGalleryImageView }) => <Image src={row.thumbnailUrl || row.url} fit="cover" style={{ width: 82, height: 82, borderRadius: 8 }} />,
    },
    {
      colKey: "promptZh",
      title: "作品",
      minWidth: 360,
      cell: ({ row }: { row: AdminGalleryImageView }) => (
        <div>
          <p className="line-clamp-2 font-black text-slate-900">{row.promptZh}</p>
          <p className="mt-1 text-xs text-slate-500">{row.authorEmail || row.authorName} · {row.jobStatus} · {row.creditCost} 积分</p>
          {row.takenDownReason ? <p className="mt-1 text-xs text-red-500">下架原因：{row.takenDownReason}</p> : null}
        </div>
      ),
    },
    {
      colKey: "status",
      title: "状态",
      width: 110,
      cell: ({ row }: { row: AdminGalleryImageView }) => <Tag theme={statusTheme(row)} variant="light">{statusLabel(row)}</Tag>,
    },
    {
      colKey: "meta",
      title: "元数据",
      width: 210,
      cell: ({ row }: { row: AdminGalleryImageView }) => (
        <div className="text-xs leading-5 text-slate-500">
          <p>{row.provider} · {row.ratio} · {row.category}</p>
          <p>{row.mimeType || "未知 MIME"} · {formatSize(row.fileSize)}</p>
        </div>
      ),
    },
    {
      colKey: "publishedAt",
      title: "发布时间",
      width: 190,
      cell: ({ row }: { row: AdminGalleryImageView }) => <span className="text-xs text-slate-500">{row.publishedAt ? new Date(row.publishedAt).toLocaleString("zh-CN") : "未发布"}</span>,
    },
    {
      colKey: "action",
      title: "操作",
      width: 180,
      fixed: "right" as const,
      cell: ({ row }: { row: AdminGalleryImageView }) => (
        <Space size="small">
          <Button variant="outline" size="small" href={row.url} target="_blank" rel="noreferrer">打开</Button>
          {!row.isDeleted && !row.takenDownAt ? (
            <Button theme="danger" variant="outline" size="small" loading={pending === `take-down:${row.id}`} onClick={() => void takeDown(row.id)}>
              下架
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  const curatedColumns = [
    {
      colKey: "preview",
      title: "预览",
      width: 120,
      cell: ({ row }: { row: AdminCuratedGalleryImageView }) => <Image src={row.thumbnailUrl || row.url} fit="cover" style={{ width: 82, height: 82, borderRadius: 8 }} />,
    },
    {
      colKey: "title",
      title: "精选作品",
      minWidth: 320,
      cell: ({ row }: { row: AdminCuratedGalleryImageView }) => (
        <div>
          <p className="font-black text-slate-900">{row.title}</p>
          <p className="mt-1 line-clamp-2 text-xs text-slate-500">{row.summary}</p>
          {row.takenDownReason ? <p className="mt-1 text-xs text-red-500">下架原因：{row.takenDownReason}</p> : null}
        </div>
      ),
    },
    {
      colKey: "status",
      title: "状态",
      width: 120,
      cell: ({ row }: { row: AdminCuratedGalleryImageView }) => <Tag theme={curatedStatusTheme(row)} variant="light">{curatedStatusLabel(row)}</Tag>,
    },
    {
      colKey: "meta",
      title: "分类",
      width: 170,
      cell: ({ row }: { row: AdminCuratedGalleryImageView }) => <span className="text-xs text-slate-500">{row.category} · {row.ratio} · 排序 {row.sortOrder}</span>,
    },
    {
      colKey: "action",
      title: "操作",
      width: 240,
      fixed: "right" as const,
      cell: ({ row }: { row: AdminCuratedGalleryImageView }) => (
        <Space size="small">
          <Button variant="outline" size="small" onClick={() => editCuratedImage(row)}>编辑</Button>
          {!row.isDeleted && !row.takenDownAt && row.isActive ? (
            <Button theme="warning" variant="outline" size="small" loading={pending === `curated-take-down:${row.id}`} onClick={() => void takeDownCuratedImage(row.id)}>下架</Button>
          ) : null}
          {!row.isDeleted ? (
            <Button theme="danger" variant="outline" size="small" loading={pending === `curated-delete:${row.id}`} onClick={() => void deleteCuratedImage(row.id)}>删除</Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-td-stat-grid">
        <Card className="admin-td-card"><Statistic title="全部作品" value={stats.total} /></Card>
        <Card className="admin-td-card"><Statistic title="已公开" value={stats.public} /></Card>
        <Card className="admin-td-card"><Statistic title="运营精选" value={stats.curated} /></Card>
        <Card className="admin-td-card"><Statistic title="已下架" value={stats.takenDown} /></Card>
        <Card className="admin-td-card"><Statistic title="已删除" value={stats.deleted} /></Card>
      </div>

      {message ? <Alert theme="info" message={message} /> : null}

      <Card className="admin-td-card">
        <Tabs defaultValue="generated">
          <Tabs.TabPanel value="generated" label="生成作品">
            <Form layout="inline" className="admin-td-filter-form">
              <Form.FormItem label="状态">
                <Select
                  value={status}
                  options={statusOptions}
                  style={{ width: 160 }}
                  onChange={(value) => {
                    const nextStatus = String(value);
                    setStatus(nextStatus);
                    void loadImages(nextStatus, query);
                  }}
                />
              </Form.FormItem>
              <Form.FormItem label="搜索">
                <Input
                  value={query}
                  clearable
                  placeholder="邮箱、任务 ID、提示词"
                  style={{ width: 340 }}
                  onChange={(value) => setQuery(String(value))}
                  onEnter={() => void loadImages(status, query)}
                />
              </Form.FormItem>
              <Form.FormItem>
                <Button theme="primary" loading={pending === "refresh"} onClick={() => void loadImages(status, query)}>搜索</Button>
              </Form.FormItem>
            </Form>
            <div className="admin-td-table-scroll">
              <Table rowKey="id" data={images} columns={imageColumns} hover stripe bordered tableLayout="fixed" empty="暂无作品记录" />
            </div>
          </Tabs.TabPanel>

          <Tabs.TabPanel value="curated" label="运营精选">
            <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
              <Card bordered title={curatedForm.id ? "编辑精选作品" : "新增精选作品"}>
                <Form labelAlign="top">
                  <Form.FormItem label="标题">
                    <Input value={curatedForm.title} placeholder="蓝白产品海报" onChange={(value) => patchCuratedForm("title", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="图片地址">
                    <Input value={curatedForm.imageUrl} placeholder="https://..." onChange={(value) => patchCuratedForm("imageUrl", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="缩略图地址">
                    <Input value={curatedForm.thumbnailUrl} placeholder="留空则使用原图" onChange={(value) => patchCuratedForm("thumbnailUrl", String(value))} />
                  </Form.FormItem>
                  <Space breakLine size="small">
                    <Form.FormItem label="分类">
                      <Select value={curatedForm.category} options={categoryOptions} style={{ width: 120 }} onChange={(value) => patchCuratedForm("category", String(value))} />
                    </Form.FormItem>
                    <Form.FormItem label="比例">
                      <Select value={curatedForm.ratio} options={ratioOptions} style={{ width: 120 }} onChange={(value) => patchCuratedForm("ratio", String(value))} />
                    </Form.FormItem>
                    <Form.FormItem label="排序">
                      <Input value={curatedForm.sortOrder} style={{ width: 120 }} onChange={(value) => patchCuratedForm("sortOrder", String(value))} />
                    </Form.FormItem>
                  </Space>
                  <Form.FormItem label="简介">
                    <Textarea value={curatedForm.summary} autosize={{ minRows: 2, maxRows: 4 }} onChange={(value) => patchCuratedForm("summary", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="中文提示词">
                    <Textarea value={curatedForm.promptZh} autosize={{ minRows: 3, maxRows: 6 }} onChange={(value) => patchCuratedForm("promptZh", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="英文提示词">
                    <Textarea value={curatedForm.promptEn} autosize={{ minRows: 2, maxRows: 4 }} onChange={(value) => patchCuratedForm("promptEn", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="过滤指令">
                    <Textarea value={curatedForm.negativePrompt} autosize={{ minRows: 2, maxRows: 4 }} onChange={(value) => patchCuratedForm("negativePrompt", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="标签">
                    <Input value={curatedForm.tags} placeholder="蓝白, 产品, 留白" onChange={(value) => patchCuratedForm("tags", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="作者">
                    <Input value={curatedForm.authorName} onChange={(value) => patchCuratedForm("authorName", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="来源名称">
                    <Input value={curatedForm.sourceName} onChange={(value) => patchCuratedForm("sourceName", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="来源链接">
                    <Input value={curatedForm.sourceUrl} placeholder="可留空" onChange={(value) => patchCuratedForm("sourceUrl", String(value))} />
                  </Form.FormItem>
                  <Form.FormItem label="展示到作品流">
                    <Switch value={curatedForm.isActive} onChange={(value) => patchCuratedForm("isActive", Boolean(value))} />
                  </Form.FormItem>
                  <Space>
                    <Button theme="primary" loading={pending === "curated-save"} onClick={() => void saveCuratedImage()}>{curatedForm.id ? "保存修改" : "添加精选"}</Button>
                    <Button variant="outline" onClick={() => setCuratedForm(emptyCuratedForm)}>清空</Button>
                    <Button variant="outline" loading={pending === "curated-refresh"} onClick={() => void loadCuratedImages()}>刷新精选</Button>
                  </Space>
                </Form>
              </Card>
              <div className="admin-td-table-scroll">
                <Table rowKey="id" data={curatedImages} columns={curatedColumns} hover stripe bordered tableLayout="fixed" empty="暂无运营精选作品" />
              </div>
            </div>
          </Tabs.TabPanel>
        </Tabs>
      </Card>
    </section>
  );
}
