import Link from "next/link";
import { ImageOff, Loader2, LockKeyhole, Palette } from "lucide-react";

import { GeneratedImagePreview } from "@/components/generated-image-preview";
import { HistoryJobActions } from "@/components/history-job-actions";
import { getUserSession } from "@/lib/auth";
import { listRecentGenerationJobs, type GenerationJobView } from "@/lib/generation-jobs";

export const dynamic = "force-dynamic";

const RUNNING_STATUSES = ["QUEUED", "POLISHING", "GENERATING", "UPLOADING"];

function getStatusLabel(status: string) {
  if (status === "QUEUED") {
    return "排队中";
  }

  if (status === "POLISHING") {
    return "润色中";
  }

  if (status === "UPLOADING") {
    return "保存中";
  }

  if (status === "COMPLETED") {
    return "已完成";
  }

  if (status === "FAILED") {
    return "失败";
  }

  if (status === "GENERATING") {
    return "生成中";
  }

  if (status === "CANCELED") {
    return "已取消";
  }

  return status;
}

function getQualityLabel(quality: string) {
  if (quality === "high") {
    return "高清";
  }

  if (quality === "low") {
    return "省积分";
  }

  return "标准";
}

function getQueueStatusLabel(job: GenerationJobView) {
  if (job.provider !== "chatgpt_web") {
    return getStatusLabel(job.status);
  }

  if (job.status === "GENERATING") {
    return "正在生成";
  }

  if (job.status === "QUEUED") {
    return job.queueWaitingCount > 0 ? `排队中，前面还有 ${job.queueWaitingCount} 个任务` : "即将开始";
  }

  return getStatusLabel(job.status);
}

function shouldShowQueueHint(job: GenerationJobView) {
  return job.provider === "chatgpt_web" && (job.status === "QUEUED" || job.status === "POLISHING" || job.status === "GENERATING" || job.status === "UPLOADING");
}

function formatTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusBadgeClass(status: string) {
  if (status === "COMPLETED") {
    return "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300";
  }

  if (status === "FAILED") {
    return "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300";
  }

  if (status === "CANCELED") {
    return "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-ink-faint";
  }

  if (RUNNING_STATUSES.includes(status)) {
    return "bg-brand-50 text-brand-600";
  }

  return "bg-slate-100 dark:bg-white/10 text-slate-500 dark:text-ink-faint";
}

function HistoryItem({ job }: { job: GenerationJobView }) {
  const firstImage = job.images[0];
  const isRunning = RUNNING_STATUSES.includes(job.status);
  const metaItems = [
    { label: "比例", value: job.ratio },
    { label: "质量", value: getQualityLabel(job.quality) },
    { label: "张数", value: `${job.imageCount} 张` },
    { label: "积分", value: String(job.creditCost) },
    { label: "时间", value: formatTime(job.createdAt) },
  ];

  return (
    <article className="rounded-2xl border border-line bg-panel p-4 shadow-card md:p-5">
      <div className="grid gap-4 md:grid-cols-[240px_1fr] md:gap-5">
        <div className="overflow-hidden rounded-xl border border-line bg-page">
          {firstImage ? (
            <GeneratedImagePreview
              image={firstImage}
              alt={job.promptZh}
              className="h-full min-h-[210px]"
              loadingLabel="图片加载中"
              originalLoadingLabel="图片加载中"
            />
          ) : (
            <div className="flex h-full min-h-[210px] flex-col items-center justify-center gap-2.5 px-4 text-center">
              {isRunning ? (
                <Loader2 className="h-5 w-5 animate-spin text-brand-400" />
              ) : (
                <ImageOff className="h-5 w-5 text-ink-faint" />
              )}
              <span className="text-sm font-semibold text-ink-secondary">{getQueueStatusLabel(job)}</span>
            </div>
          )}
        </div>

        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center rounded-lg px-2.5 py-1 text-xs font-bold ${getStatusBadgeClass(job.status)}`}>
              {getQueueStatusLabel(job)}
            </span>
            <span className="rounded-lg bg-page px-2.5 py-1 text-xs font-medium text-ink-faint">{job.provider}</span>
          </div>

          <h2 className="line-clamp-2 text-[15px] font-bold leading-6 text-ink md:text-base">{job.promptZh}</h2>
          {job.promptEn ? <p className="line-clamp-1 text-[13px] text-ink-faint">{job.promptEn}</p> : null}

          {shouldShowQueueHint(job) ? (
            <p className="flex items-center gap-2 rounded-xl bg-brand-50 px-3.5 py-2.5 text-sm font-medium text-brand-600">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
              {getQueueStatusLabel(job)}
            </p>
          ) : null}
          {job.errorMessage ? (
            <p className="rounded-xl bg-rose-50 dark:bg-rose-500/10 px-3.5 py-2.5 text-sm font-medium text-rose-500 dark:text-rose-300">{job.errorMessage}</p>
          ) : null}

          <dl className="flex flex-wrap gap-1.5">
            {metaItems.map((item) => (
              <div key={item.label} className="flex items-center gap-1.5 rounded-lg bg-page px-2.5 py-1 text-xs">
                <dt className="font-medium text-ink-faint">{item.label}</dt>
                <dd className="font-semibold text-ink-secondary">{item.value}</dd>
              </div>
            ))}
          </dl>

          <HistoryJobActions
            jobId={job.id}
            status={job.status}
            promptZh={job.promptZh}
            promptEn={job.promptEn}
            negativePrompt={job.negativePrompt}
            ratio={job.ratio}
            quality={job.quality}
            imageCount={job.imageCount}
            images={job.images}
            referenceImages={job.referenceImages}
          />
        </div>
      </div>
    </article>
  );
}

export default async function HistoryPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px] space-y-5">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">
              历史记录已按账号隔离，登录后只会看到你自己的生图任务和图片结果。
            </p>
            <Link
              href="/signin?next=/history"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let jobs: GenerationJobView[] = [];

  try {
    jobs = await listRecentGenerationJobs(session.userId, 30);
  } catch {
    jobs = [];
  }

  const completedCount = jobs.filter((job) => job.status === "COMPLETED").length;
  const failedCount = jobs.filter((job) => job.status === "FAILED").length;
  const runningCount = jobs.filter((job) => ["QUEUED", "POLISHING", "GENERATING", "UPLOADING"].includes(job.status)).length;
  const creditTotal = jobs.reduce((sum, job) => sum + job.creditCost, 0);

  const stats = [
    { label: "全部任务", value: jobs.length, valueClass: "text-ink" },
    { label: "已完成", value: completedCount, valueClass: "text-emerald-600 dark:text-emerald-300" },
    { label: "进行中", value: runningCount, valueClass: "text-brand-600" },
    { label: "失败", value: failedCount, valueClass: "text-rose-500 dark:text-rose-300" },
    { label: "积分记录", value: creditTotal, valueClass: "text-ink" },
  ];

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      {jobs.length ? (
        <>
          <section aria-label="历史概览" className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {stats.map((item) => (
              <div key={item.label} className="rounded-2xl border border-line bg-panel px-4 py-3.5 shadow-card">
                <p className={`text-2xl font-extrabold leading-tight ${item.valueClass}`}>{item.value}</p>
                <p className="mt-1 text-xs font-medium text-ink-faint">{item.label}</p>
              </div>
            ))}
          </section>

          <section aria-label="任务列表" className="space-y-4">
            {jobs.map((job) => (
              <HistoryItem key={job.id} job={job} />
            ))}
          </section>
        </>
      ) : (
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <Palette className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-bold text-ink">暂无生成记录</h2>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">去创作页提交第一个生图任务后，结果会出现在这里。</p>
            <Link
              href="/generate"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去创作
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
