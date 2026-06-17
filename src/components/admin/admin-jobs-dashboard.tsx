"use client";

import { useMemo, useState } from "react";
import { Alert, Button, Card, Form, Input, Select, Space, Statistic, Table, Tag } from "tdesign-react";
import type { AdminGenerationJobView } from "@/lib/generation-jobs";

type JobsResponse = {
  ok: boolean;
  jobs?: AdminGenerationJobView[];
  job?: AdminGenerationJobView;
  error?: string;
};

const statusOptions = [
  { value: "", label: "全部" },
  { value: "QUEUED", label: "排队中" },
  { value: "POLISHING", label: "润色中" },
  { value: "GENERATING", label: "生成中" },
  { value: "UPLOADING", label: "保存中" },
  { value: "COMPLETED", label: "已完成" },
  { value: "FAILED", label: "失败" },
  { value: "CANCELED", label: "已取消" },
];

const activeStatuses = new Set(["QUEUED", "POLISHING", "GENERATING", "UPLOADING"]);

function statusText(status: string) {
  return statusOptions.find((item) => item.value === status)?.label || status;
}

function statusTheme(status: string): "success" | "danger" | "primary" | "default" {
  if (status === "COMPLETED") return "success";
  if (status === "FAILED") return "danger";
  if (activeStatuses.has(status)) return "primary";
  return "default";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", { hour12: false });
}

function summarizePrompt(value: string) {
  return value.length > 92 ? `${value.slice(0, 92)}...` : value;
}

function queueText(job: AdminGenerationJobView) {
  if (job.provider !== "chatgpt_web") {
    return "";
  }
  if (job.status === "GENERATING") {
    return "ChatGPT Web 正在执行";
  }
  if (job.status === "QUEUED") {
    return job.queueWaitingCount > 0 ? `队列 #${job.queuePosition}，前面 ${job.queueWaitingCount} 个` : "队列 #1，即将开始";
  }
  return "";
}

async function readJobsResponse(response: Response): Promise<JobsResponse> {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return (await response.json()) as JobsResponse;
  }
  const text = await response.text();
  return {
    ok: false,
    error: text ? `接口返回非 JSON 内容：${text.slice(0, 80)}` : "接口返回非 JSON 内容",
  };
}

export function AdminJobsDashboard({ initialJobs }: { initialJobs: AdminGenerationJobView[] }) {
  const [jobs, setJobs] = useState(initialJobs);
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyJobId, setBusyJobId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(
    () => ({
      total: jobs.length,
      running: jobs.filter((job) => activeStatuses.has(job.status)).length,
      completed: jobs.filter((job) => job.status === "COMPLETED").length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
    }),
    [jobs],
  );

  function replaceJob(updatedJob: AdminGenerationJobView) {
    setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
  }

  function buildJobsUrl(nextStatus = status, nextQuery = query) {
    const params = new URLSearchParams();
    if (nextStatus) params.set("status", nextStatus);
    if (nextQuery.trim()) params.set("q", nextQuery.trim());
    const suffix = params.toString();
    return suffix ? `/api/admin/generation/jobs?${suffix}` : "/api/admin/generation/jobs";
  }

  async function refreshJobs(nextStatus = status, nextQuery = query) {
    setIsRefreshing(true);
    setMessage("");
    setError("");
    try {
      const response = await fetch(buildJobsUrl(nextStatus, nextQuery), { method: "GET" });
      const data = await readJobsResponse(response);
      if (!response.ok || !data.ok || !data.jobs) {
        throw new Error(data.error || "刷新任务失败");
      }
      setJobs(data.jobs);
      setMessage("任务列表已刷新。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "刷新任务失败");
    } finally {
      setIsRefreshing(false);
    }
  }

  async function refreshSingleJob(jobId: string) {
    setBusyJobId(jobId);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/generation/jobs/${jobId}`, { method: "GET" });
      const data = await readJobsResponse(response);
      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.error || "刷新单个任务失败");
      }
      replaceJob(data.job);
      setMessage("单个任务已刷新。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "刷新单个任务失败");
    } finally {
      setBusyJobId("");
    }
  }

  async function retryJob(jobId: string) {
    setBusyJobId(jobId);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/generation/jobs/${jobId}/retry`, { method: "POST" });
      const data = await readJobsResponse(response);
      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.error || "重试任务失败");
      }
      replaceJob(data.job);
      setMessage("任务已重新加入队列。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "重试任务失败");
    } finally {
      setBusyJobId("");
    }
  }

  async function failJob(jobId: string) {
    setBusyJobId(jobId);
    setMessage("");
    setError("");
    try {
      const response = await fetch(`/api/admin/generation/jobs/${jobId}/fail`, { method: "POST" });
      const data = await readJobsResponse(response);
      if (!response.ok || !data.ok || !data.job) {
        throw new Error(data.error || "标记失败失败");
      }
      replaceJob(data.job);
      setMessage("任务已标记失败。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "标记失败失败");
    } finally {
      setBusyJobId("");
    }
  }

  const columns = [
    {
      colKey: "status",
      title: "状态",
      width: 170,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <Space direction="vertical" size={4}>
          <Tag theme={statusTheme(row.status)} variant="light">
            {statusText(row.status)}
          </Tag>
          {row.isStale ? (
            <Tag theme="warning" variant="light">
              疑似卡住
            </Tag>
          ) : null}
          {queueText(row) ? <span className="admin-td-cell-sub">{queueText(row)}</span> : null}
        </Space>
      ),
    },
    {
      colKey: "promptZh",
      title: "任务",
      minWidth: 360,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <div className="admin-td-cell-stack">
          <p className="admin-td-cell-main">{summarizePrompt(row.promptZh)}</p>
          <p className="admin-td-cell-sub admin-td-cell-id">{row.id}</p>
          {row.errorMessage ? <p className="admin-td-cell-error">{row.errorMessage}</p> : null}
        </div>
      ),
    },
    {
      colKey: "provider",
      title: "Provider",
      width: 180,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <Space direction="vertical" size={4}>
          <Tag>{row.provider}</Tag>
          <span className="admin-td-cell-sub">{row.model || "未返回模型"}</span>
        </Space>
      ),
    },
    {
      colKey: "meta",
      title: "参数",
      width: 170,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <div className="admin-td-cell-meta">
          <p>{row.ratio} · {row.quality}</p>
          <p>{row.imageCount} 张 · {row.creditCost} 积分</p>
        </div>
      ),
    },
    {
      colKey: "images",
      title: "图片",
      width: 150,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <div className="admin-td-thumb-list">
          {row.images.slice(0, 3).map((image) => (
            <img key={image.id} src={image.url} alt={row.promptZh} className="admin-td-thumb admin-td-thumb-small" />
          ))}
          {!row.images.length ? <span className="admin-td-cell-placeholder">暂无</span> : null}
        </div>
      ),
    },
    {
      colKey: "createdAt",
      title: "时间",
      width: 190,
      cell: ({ row }: { row: AdminGenerationJobView }) => <span className="admin-td-cell-sub">{formatDate(row.createdAt)}</span>,
    },
    {
      colKey: "actions",
      title: "操作",
      fixed: "right" as const,
      width: 230,
      cell: ({ row }: { row: AdminGenerationJobView }) => (
        <div className="admin-td-action-row">
          <Button variant="outline" size="small" loading={busyJobId === row.id} onClick={() => void refreshSingleJob(row.id)}>
            刷新
          </Button>
          {row.status === "FAILED" || row.isStale ? (
            <Button theme="primary" size="small" loading={busyJobId === row.id} onClick={() => void retryJob(row.id)}>
              重试
            </Button>
          ) : null}
          {activeStatuses.has(row.status) || row.isStale ? (
            <Button theme="danger" variant="outline" size="small" loading={busyJobId === row.id} onClick={() => void failJob(row.id)}>
              标失败
            </Button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <section className="admin-td-grid">
      <div className="admin-td-stat-grid">
        <Card className="admin-td-card"><Statistic title="当前列表" value={stats.total} /></Card>
        <Card className="admin-td-card"><Statistic title="进行中" value={stats.running} /></Card>
        <Card className="admin-td-card"><Statistic title="已完成" value={stats.completed} /></Card>
        <Card className="admin-td-card"><Statistic title="失败" value={stats.failed} /></Card>
      </div>

      <Card className="admin-td-card" title="最近生成任务">
        <Form layout="inline" className="admin-td-filter-form">
          <Form.FormItem label="状态">
            <Select
              value={status}
              options={statusOptions}
              className="admin-td-filter-control-sm"
              onChange={(value) => {
                const nextStatus = String(value);
                setStatus(nextStatus);
                void refreshJobs(nextStatus, query);
              }}
            />
          </Form.FormItem>
          <Form.FormItem label="搜索">
            <Input
              value={query}
              clearable
              placeholder="任务 ID、用户邮箱、提示词"
              className="admin-td-filter-control-md"
              onChange={(value) => setQuery(String(value))}
              onEnter={() => void refreshJobs()}
            />
          </Form.FormItem>
          <Form.FormItem>
            <Button theme="primary" loading={isRefreshing} onClick={() => void refreshJobs()}>
              刷新任务
            </Button>
          </Form.FormItem>
        </Form>

        {message ? <Alert className="admin-td-form-section" theme="success" message={message} /> : null}
        {error ? <Alert className="admin-td-form-section" theme="error" message={error} /> : null}

        <div className="admin-td-table-scroll admin-td-table-scroll--lg">
          <Table
            rowKey="id"
            data={jobs}
            columns={columns}
            hover
            stripe
            bordered
            tableLayout="fixed"
            tableContentWidth="1480px"
            verticalAlign="top"
            empty="暂无任务"
          />
        </div>
      </Card>
    </section>
  );
}
