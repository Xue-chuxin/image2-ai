import Image from "next/image";

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
            <dt>预计积分</dt>
            <dd>{job.creditCost}</dd>
          </div>
          <div>
            <dt>时间</dt>
            <dd>{formatTime(job.createdAt)}</dd>
          </div>
        </dl>
      </div>
    </article>
  );
}

export default async function HistoryPage() {
  let jobs: GenerationJobView[] = [];

  try {
    jobs = await listRecentGenerationJobs(30);
  } catch {
    jobs = [];
  }

  return (
    <main className="history-page">
      <section className="section-heading">
        <span className="eyebrow">History</span>
        <h1>生成历史</h1>
        <p>这里展示最近创建的生图任务，包括成功图片和失败原因。</p>
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
        </section>
      )}
    </main>
  );
}
