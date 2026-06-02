import { listRecentGenerationJobs } from "@/lib/generation-jobs";

export default async function HistoryPage() {
  const jobs = await listRecentGenerationJobs().catch(() => []);

  return (
    <main className="space-y-6 pb-28">
      <section className="rounded-app border border-ocean-100 bg-white/86 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-ocean-500">History</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">生成历史</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          展示最近的生成任务和结果。当前阶段使用演示用户记录，登录用户历史会在阶段 5 接入。
        </p>
      </section>

      <div className="space-y-4">
        {jobs.length === 0 ? (
          <section className="rounded-panel border border-ocean-100 bg-white/86 p-6 text-center shadow-card backdrop-blur">
            <p className="text-sm font-bold text-slate-500">还没有生成记录。</p>
          </section>
        ) : null}
        {jobs.map((job) => (
          <article key={job.id} className="rounded-panel border border-ocean-100 bg-white/86 p-4 shadow-card backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ocean-500">{job.status}</p>
                <h2 className="mt-2 text-lg font-black text-slate-950">{job.polishedPromptZh || job.originalInput}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  {job.provider} · {job.ratio} · {job.quality}
                </p>
              </div>
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-800">{job.creditCost} 积分</span>
            </div>
            {job.errorMessage ? <p className="mt-3 text-sm font-bold text-red-500">{job.errorMessage}</p> : null}
            {job.images.length > 0 ? (
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {job.images.map((image) => (
                  <img key={image.id} src={image.url} alt="生成历史" className="aspect-square rounded-[18px] border border-slate-200 object-cover" />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}
