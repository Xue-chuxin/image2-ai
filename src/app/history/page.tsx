import Link from "next/link";

import { GeneratedImagePreview } from "@/components/generated-image-preview";
import { HistoryJobActions } from "@/components/history-job-actions";
import { BlurText, GlassSurface, SpotlightCard } from "@/components/front/react-bits";
import { getUserSession } from "@/lib/auth";
import { listRecentGenerationJobs, type GenerationJobView } from "@/lib/generation-jobs";

export const dynamic = "force-dynamic";

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

function HistoryItem({ job }: { job: GenerationJobView }) {
  const firstImage = job.images[0];

  return (
    <SpotlightCard className="history-card">
      <div className="history-card-layout">
        <div className="history-image">
          {firstImage ? (
            <GeneratedImagePreview image={firstImage} alt={job.promptZh} />
          ) : (
            <div className="history-placeholder">
              <span>{getQueueStatusLabel(job)}</span>
            </div>
          )}
        </div>

        <div className="history-body">
          <div className="history-title-row">
            <div>
              <span className="eyebrow">{job.provider}</span>
              <h2>{job.promptZh}</h2>
            </div>
            <span className={`status-pill ${job.status.toLowerCase()}`}>{getQueueStatusLabel(job)}</span>
          </div>

          {job.promptEn ? <p className="history-prompt">{job.promptEn}</p> : null}
          {shouldShowQueueHint(job) ? <p className="history-prompt">{getQueueStatusLabel(job)}</p> : null}
          {job.errorMessage ? <p className="history-error">{job.errorMessage}</p> : null}

          <dl className="history-meta">
            <div>
              <dt>比例</dt>
              <dd>{job.ratio}</dd>
            </div>
            <div>
              <dt>质量</dt>
              <dd>{getQualityLabel(job.quality)}</dd>
            </div>
            <div>
              <dt>张数</dt>
              <dd>{job.imageCount}</dd>
            </div>
            <div>
              <dt>积分</dt>
              <dd>{job.creditCost}</dd>
            </div>
            <div>
              <dt>时间</dt>
              <dd>{formatTime(job.createdAt)}</dd>
            </div>
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
    </SpotlightCard>
  );
}

export default async function HistoryPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="history-page">
        <GlassSurface className="section-heading">
          <span className="eyebrow">History</span>
          <BlurText as="h1" text="生成历史" delay={0.035} />
          <p>登录普通用户账号后，只会看到你自己的生图任务和图片结果。</p>
        </GlassSurface>
        <SpotlightCard className="empty-state">
          <span>请先登录</span>
          <p>用户历史记录已按账号隔离，未登录时不会读取任何任务。</p>
          <Link className="primary-button mt-3 px-6" href="/signin?next=/history">
            去登录
          </Link>
        </SpotlightCard>
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

  return (
    <main className="history-page">
      <GlassSurface className="section-heading">
        <span className="eyebrow">History</span>
        <BlurText as="h1" text="生成历史" delay={0.035} />
        <p>这里展示当前账号最近创建的生图任务，包括成功图片、失败原因、Provider 和积分记录。</p>
      </GlassSurface>

      {jobs.length ? (
        <>
          <section className="history-summary-grid" aria-label="历史概览">
            <div>
              <span>全部任务</span>
              <strong>{jobs.length}</strong>
            </div>
            <div>
              <span>已完成</span>
              <strong>{completedCount}</strong>
            </div>
            <div>
              <span>进行中</span>
              <strong>{runningCount}</strong>
            </div>
            <div>
              <span>失败</span>
              <strong>{failedCount}</strong>
            </div>
            <div>
              <span>积分记录</span>
              <strong>{creditTotal}</strong>
            </div>
          </section>

          <section className="history-list">
            {jobs.map((job) => (
              <HistoryItem key={job.id} job={job} />
            ))}
          </section>
        </>
      ) : (
        <SpotlightCard className="empty-state">
          <span>暂无生成记录</span>
          <p>去创作页提交第一个生图任务后，结果会出现在这里。</p>
          <Link className="primary-button mt-3 px-6" href="/generate">
            去创作
          </Link>
        </SpotlightCard>
      )}
    </main>
  );
}
