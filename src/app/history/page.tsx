import Image from "next/image";
import Link from "next/link";

import { HistoryJobActions } from "@/components/history-job-actions";
import { getUserSession } from "@/lib/auth";
import { listRecentGenerationJobs, type GenerationJobView } from "@/lib/generation-jobs";

export const dynamic = "force-dynamic";

function getStatusLabel(status: string) {
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

function getQualityLabel(quality: string) {
  if (quality === "high") {
    return "高清";
  }

  if (quality === "low") {
    return "省积分";
  }

  return "标准";
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
    <article className="history-card">
      <div className="history-image">
        {firstImage ? (
          <Image src={firstImage.url} alt={job.promptZh} width={640} height={640} />
        ) : (
          <div className="history-placeholder">
            <span>{getStatusLabel(job.status)}</span>
          </div>
        )}
      </div>

      <div className="history-body">
        <div className="history-title-row">
          <div>
            <span className="eyebrow">{job.provider}</span>
            <h2>{job.promptZh}</h2>
          </div>
          <span className={`status-pill ${job.status.toLowerCase()}`}>{getStatusLabel(job.status)}</span>
        </div>

        {job.promptEn ? <p className="history-prompt">{job.promptEn}</p> : null}
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
    </article>
  );
}

export default async function HistoryPage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="history-page">
        <section className="section-heading">
          <span className="eyebrow">History</span>
          <h1>生成历史</h1>
          <p>登录普通用户账号后，只会看到你自己的生图任务和图片结果。</p>
        </section>
        <section className="empty-state">
          <span>请先登录</span>
          <p>用户历史记录已按账号隔离，未登录时不会读取任何任务。</p>
          <Link className="primary-button mt-3 px-6" href="/signin?next=/history">
            去登录
          </Link>
        </section>
      </main>
    );
  }

  let jobs: GenerationJobView[] = [];

  try {
    jobs = await listRecentGenerationJobs(session.userId, 30);
  } catch {
    jobs = [];
  }

  return (
    <main className="history-page">
      <section className="section-heading">
        <span className="eyebrow">History</span>
        <h1>生成历史</h1>
        <p>这里展示当前账号最近创建的生图任务，包括成功图片、失败原因、Provider 和积分记录。</p>
      </section>

      {jobs.length ? (
        <section className="history-list">
          {jobs.map((job) => (
            <HistoryItem key={job.id} job={job} />
          ))}
        </section>
      ) : (
        <section className="empty-state">
          <span>暂无生成记录</span>
          <p>去创作页提交第一个生图任务后，结果会出现在这里。</p>
          <Link className="primary-button mt-3 px-6" href="/generate">
            去创作
          </Link>
        </section>
      )}
    </main>
  );
}
