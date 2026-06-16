"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Image, Input, Space, Statistic, Table, Tag } from "tdesign-react";
import type { AdminUploadedImageView } from "@/lib/uploads";

type UploadsPayload = {
  ok: boolean;
  images?: AdminUploadedImageView[];
  error?: string;
};

function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function AdminUploadsDashboard({ initialImages }: { initialImages: AdminUploadedImageView[] }) {
  const [images, setImages] = useState(initialImages);
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  const totalSize = useMemo(() => images.reduce((sum, image) => sum + image.fileSize, 0), [images]);
  const totalSizeStat =
    totalSize >= 1024 * 1024
      ? { value: Number((totalSize / 1024 / 1024).toFixed(1)), unit: "MB" }
      : { value: Math.max(1, Math.round(totalSize / 1024)), unit: "KB" };

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
      setMessage("上传资源已刷新。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "刷新失败");
    } finally {
      setPending(false);
    }
  }

  const columns = [
    {
      colKey: "preview",
      title: "预览",
      width: 120,
      cell: ({ row }: { row: AdminUploadedImageView }) => <Image className="admin-td-preview-image" src={row.thumbnailUrl || row.url} fit="cover" />,
    },
    {
      colKey: "id",
      title: "资源",
      minWidth: 280,
      cell: ({ row }: { row: AdminUploadedImageView }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-main admin-td-cell-id">{row.id}</p>
          <p className="admin-td-cell-sub admin-td-cell-id">{row.url}</p>
        </div>
      ),
    },
    {
      colKey: "user",
      title: "用户",
      width: 220,
      cell: ({ row }: { row: AdminUploadedImageView }) => <span>{row.userEmail || row.userDisplayName || row.userId}</span>,
    },
    {
      colKey: "file",
      title: "文件",
      width: 180,
      cell: ({ row }: { row: AdminUploadedImageView }) => (
        <Space direction="vertical" size={4}>
          <Tag>{row.mimeType}</Tag>
          <span className="admin-td-cell-sub">{formatSize(row.fileSize)}</span>
        </Space>
      ),
    },
    {
      colKey: "createdAt",
      title: "上传时间",
      width: 190,
      cell: ({ row }: { row: AdminUploadedImageView }) => <span className="admin-td-cell-sub">{new Date(row.createdAt).toLocaleString("zh-CN")}</span>,
    },
    {
      colKey: "action",
      title: "操作",
      width: 110,
      cell: ({ row }: { row: AdminUploadedImageView }) => (
        <Button variant="outline" size="small" href={row.url} target="_blank" rel="noreferrer">
          打开
        </Button>
      ),
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-td-stat-grid">
        <Card className="admin-td-card"><Statistic title="上传图" value={images.length} /></Card>
        <Card className="admin-td-card"><Statistic title="总大小" value={totalSizeStat.value} unit={totalSizeStat.unit} /></Card>
        <Card className="admin-td-card"><Statistic title="参考图" value={images.length} unit="张" /></Card>
      </div>

      <Card className="admin-td-card" title="上传资源">
        <Form layout="inline" className="admin-td-filter-form">
          <Form.FormItem label="搜索">
            <Input
              value={query}
              clearable
              placeholder="用户邮箱、上传图 ID、URL"
              style={{ width: 360 }}
              onChange={(value) => setQuery(String(value))}
              onEnter={() => void loadImages()}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Button theme="primary" loading={pending} onClick={() => void loadImages()}>
              搜索
            </Button>
          </Form.FormItem>
        </Form>

        {message ? <Alert className="mb-3" theme="info" message={message} /> : null}
        <div className="admin-td-table-scroll">
          <Table rowKey="id" data={images} columns={columns} hover stripe bordered tableLayout="fixed" empty="暂无上传图" />
        </div>
      </Card>
    </section>
  );
}
