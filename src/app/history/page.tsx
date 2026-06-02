import { recentJobs } from "@/lib/mock-data";

export default function HistoryPage() {
  return (
    <main className="space-y-6 pb-28">
      <section className="rounded-app border border-ocean-100 bg-white/86 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-ocean-500">History</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">生成历史</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">阶段 1 使用静态数据展示历史结构，阶段 4 接入真实任务状态。</p>
      </section>

      <div className="space-y-4">
        {recentJobs.map((job) => (
          <article key={job.id} className="rounded-panel border border-ocean-100 bg-white/86 p-4 shadow-card backdrop-blur">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-ocean-500">{job.status}</p>
                <h2 className="mt-2 text-lg font-black text-slate-950">{job.title}</h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">{job.prompt}</p>
              </div>
              <span className="rounded-full bg-ocean-50 px-3 py-1 text-xs font-bold text-ocean-800">{job.cost} credits</span>
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
