"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, RotateCcw, Search, XCircle } from "lucide-react";

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
  if (status === "COMPLETED") {
    return "已完成";
  }
  if (status === "FAILED") {
    return "失败";
  }
  if (status === "GENERATING") {
    return "生成中";
  }
  if (status === "POLISHING") {
    return "润色中";
  }
  if (status === "UPLOADING") {
    return "保存中";
  }
  if (status === "QUEUED") {
    return "排队中";
  }
  if (status === "CANCELED") {
    return "已取消";
  }
  return status;
}

function statusClass(status: string) {
  if (status === "COMPLETED") {
    return "border-emerald-100 bg-emerald-50 text-emerald-700";
  }
  if (status === "FAILED") {
    return "border-red-100 bg-red-50 text-red-600";
  }
  if (activeStatuses.has(status)) {
    return "border-blue-100 bg-blue-50 text-blue-700";
  }
  return "border-slate-200 bg-slate-50 text-slate-500";
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    hour12: false,
  });
}

function summarizePrompt(value: string) {
  return value.length > 96 ? `${value.slice(0, 96)}...` : value;
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

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      running: jobs.filter((job) => activeStatuses.has(job.status)).length,
      completed: jobs.filter((job) => job.status === "COMPLETED").length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
    };
  }, [jobs]);

  function replaceJob(updatedJob: AdminGenerationJobView) {
    setJobs((current) => current.map((job) => (job.id === updatedJob.id ? updatedJob : job)));
  }

  function buildJobsUrl() {
    const params = new URLSearchParams();
    if (status) {
      params.set("status", status);
    }
    if (query.trim()) {
      params.set("q", query.trim());
    }

    const suffix = params.toString();
    return suffix ? `/api/admin/generation/jobs?${suffix}` : "/api/admin/generation/jobs";
  }

  async function refreshJobs() {
    setIsRefreshing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(buildJobsUrl(), {
        method: "GET",
      });
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
      const response = await fetch(`/api/admin/generation/jobs/${jobId}`, {
        method: "GET",
      });
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
      const response = await fetch(`/api/admin/generation/jobs/${jobId}/retry`, {
        method: "POST",
      });
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
      const response = await fetch(`/api/admin/generation/jobs/${jobId}/fail`, {
        method: "POST",
      });
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

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500">
            <Clock3 className="h-4 w-4" />
            当前列表
          </div>
          <p className="mt-3 text-3xl font-black text-slate-950">{stats.total}</p>
        </div>
        <div className="rounded-[24px] border border-blue-100 bg-blue-50/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-blue-600">
            <Loader2 className="h-4 w-4" />
            进行中
          </div>
          <p className="mt-3 text-3xl font-black text-blue-700">{stats.running}</p>
        </div>
        <div className="rounded-[24px] border border-emerald-100 bg-emerald-50/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-emerald-600">
            <CheckCircle2 className="h-4 w-4" />
            已完成
          </div>
          <p className="mt-3 text-3xl font-black text-emerald-700">{stats.completed}</p>
        </div>
        <div className="rounded-[24px] border border-red-100 bg-red-50/80 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-red-600">
            <AlertCircle className="h-4 w-4" />
            失败
          </div>
          <p className="mt-3 text-3xl font-black text-red-600">{stats.failed}</p>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200 bg-white/88 p-5 shadow-card backdrop-blur">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Recent</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">最近生成任务</h2>
          </div>
          <button
            type="button"
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card disabled:opacity-60"
          >
            {isRefreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            刷新列表
          </button>
        </div>

        <div className="mt-5 grid gap-3 md:grid-cols-[180px_1fr_auto]">
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 outline-none focus:border-ocean-400"
          >
            {statusOptions.map((option) => (
              <option key={option.value || "all"} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索用户邮箱、昵称或任务 ID"
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-11 pr-4 text-sm font-bold text-slate-600 outline-none focus:border-ocean-400"
            />
          </div>
          <button
            type="button"
            onClick={refreshJobs}
            disabled={isRefreshing}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-card disabled:opacity-60"
          >
            筛选
          </button>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}

        <div className="mt-5 grid min-w-0 gap-3">
          {jobs.map((job) => (
            <article key={job.id} className="min-w-0 overflow-hidden rounded-[24px] border border-slate-200 bg-white/82 p-4 shadow-card">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(job.status)}`}>{statusText(job.status)}</span>
                    {job.isStale ? <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">疑似卡住，可刷新后重试或标记失败</span> : null}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{job.provider}</span>
                    {queueText(job) ? (
                      <span className="rounded-full border border-amber-100 bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">
                        {queueText(job)}
                      </span>
                    ) : null}
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                      {job.creditCost} 积分
                    </span>
                    <span className="text-xs font-bold text-slate-400">{formatDate(job.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 break-words text-base font-black leading-6 text-slate-950">{summarizePrompt(job.promptZh)}</h3>
                  <p className="mt-2 break-words text-xs font-bold leading-5 text-slate-500 [overflow-wrap:anywhere]">
                    用户：{job.user.email || job.user.displayName || job.user.id} · 任务：{job.id} · 比例：{job.ratio} · 质量：{job.quality} · 张数：{job.imageCount}
                  </p>
                  {job.errorMessage ? (
                    <p className="mt-3 max-w-full overflow-hidden break-words rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600 [overflow-wrap:anywhere]">
                      {job.errorMessage}
                    </p>
                  ) : null}
                  {job.images.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.images.map((image) => (
                        <img key={image.id} src={image.url} alt={job.promptZh} className="h-20 w-20 rounded-2xl border border-slate-100 object-cover" />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex w-full shrink-0 flex-col gap-2 sm:w-auto">
                  <button
                    type="button"
                    onClick={() => refreshSingleJob(job.id)}
                    disabled={busyJobId === job.id}
                    className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-600 shadow-card disabled:opacity-60"
                  >
                    {busyJobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    刷新
                  </button>
                  {job.status === "FAILED" || job.status === "CANCELED" ? (
                    <button
                      type="button"
                      onClick={() => retryJob(job.id)}
                      disabled={busyJobId === job.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-card disabled:opacity-60"
                    >
                      {busyJobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      重新执行
                    </button>
                  ) : null}
                  {activeStatuses.has(job.status) ? (
                    <button
                      type="button"
                      onClick={() => failJob(job.id)}
                      disabled={busyJobId === job.id}
                      className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-2xl border border-red-100 bg-red-50 px-4 py-2 text-xs font-black text-red-600 shadow-card disabled:opacity-60"
                    >
                      {busyJobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                      标记失败
                    </button>
                  ) : null}
                </div>
              </div>
            </article>
          ))}

          {!jobs.length ? (
            <div className="rounded-[24px] border border-dashed border-slate-200 bg-white/70 p-8 text-center text-sm font-bold text-slate-400">
              暂无生成任务。
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
