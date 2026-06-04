"use client";

import { useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Clock3, Loader2, RefreshCw, RotateCcw } from "lucide-react";

import type { AdminGenerationJobView } from "@/lib/generation-jobs";

type JobsResponse = {
  ok: boolean;
  jobs?: AdminGenerationJobView[];
  job?: AdminGenerationJobView;
  error?: string;
};

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
  if (status === "GENERATING" || status === "QUEUED") {
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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [retryingId, setRetryingId] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      running: jobs.filter((job) => job.status === "QUEUED" || job.status === "GENERATING").length,
      completed: jobs.filter((job) => job.status === "COMPLETED").length,
      failed: jobs.filter((job) => job.status === "FAILED").length,
    };
  }, [jobs]);

  async function refreshJobs() {
    setIsRefreshing(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/generation/jobs", {
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

  async function retryJob(jobId: string) {
    setRetryingId(jobId);
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

      setJobs((current) => current.map((job) => (job.id === data.job?.id ? data.job : job)));
      setMessage("任务已重新加入队列。");
    } catch (caughtError) {
      setError(caughtError instanceof Error ? caughtError.message : "重试任务失败");
    } finally {
      setRetryingId("");
    }
  }

  return (
    <section className="space-y-5">
      <div className="grid gap-3 md:grid-cols-4">
        <div className="rounded-[24px] border border-slate-200 bg-white/88 p-4 shadow-card backdrop-blur">
          <div className="flex items-center gap-2 text-sm font-black text-slate-500">
            <Clock3 className="h-4 w-4" />
            全部任务
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
            刷新
          </button>
        </div>

        {message ? <p className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-4 rounded-2xl border border-red-100 bg-red-50 px-4 py-3 text-sm font-bold text-red-600">{error}</p> : null}

        <div className="mt-5 grid gap-3">
          {jobs.map((job) => (
            <article key={job.id} className="rounded-[24px] border border-slate-200 bg-white/82 p-4 shadow-card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full border px-3 py-1 text-xs font-black ${statusClass(job.status)}`}>{statusText(job.status)}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">{job.provider}</span>
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">
                      {job.creditCost} 积分
                    </span>
                    <span className="text-xs font-bold text-slate-400">{formatDate(job.createdAt)}</span>
                  </div>
                  <h3 className="mt-3 text-base font-black leading-6 text-slate-950">{summarizePrompt(job.promptZh)}</h3>
                  <p className="mt-2 text-xs font-bold leading-5 text-slate-500">
                    用户：{job.user.email || job.user.displayName || job.user.id} · 比例：{job.ratio} · 质量：{job.quality} · 张数：{job.imageCount}
                  </p>
                  {job.errorMessage ? <p className="mt-3 rounded-2xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-600">{job.errorMessage}</p> : null}
                  {job.images.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {job.images.map((image) => (
                        <img key={image.id} src={image.url} alt={job.promptZh} className="h-20 w-20 rounded-2xl border border-slate-100 object-cover" />
                      ))}
                    </div>
                  ) : null}
                </div>
                <div className="flex shrink-0 flex-col gap-2">
                  {(job.status === "FAILED" || job.status === "CANCELED") ? (
                    <button
                      type="button"
                      onClick={() => retryJob(job.id)}
                      disabled={retryingId === job.id}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-2 text-xs font-black text-white shadow-card disabled:opacity-60"
                    >
                      {retryingId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                      重新执行
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
