import { GenerateComposer } from "@/components/generate-composer";

export default function GeneratePage() {
  return (
    <main className="grid gap-5 pb-28 lg:grid-cols-[1.1fr_.9fr]">
      <section className="space-y-5">
        <div className="rounded-app border border-ocean-100 bg-white/86 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-ocean-500">Create</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">生图工作台</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">先让 DeepSeek 把想法整理成稳定 prompt，再提交异步生图任务。</p>
        </div>
        <GenerateComposer />
      </section>

      <aside className="space-y-5">
        <div className="rounded-app border border-ocean-100 bg-white/86 p-5 shadow-card backdrop-blur">
          <h2 className="text-lg font-black text-slate-950">任务预览</h2>
          <div className="mt-4 aspect-square rounded-[24px] border border-dashed border-ocean-200 bg-gradient-to-br from-ocean-50 via-white to-sky-100 p-4">
            <div className="flex h-full items-center justify-center rounded-[20px] bg-white/72 text-center text-sm font-semibold text-ocean-700">
              生成结果将在这里显示
            </div>
          </div>
        </div>
        <div className="rounded-app bg-ocean-900 p-5 text-white shadow-app">
          <h2 className="text-lg font-black">积分规则草案</h2>
          <div className="mt-4 space-y-3 text-sm text-sky-100">
            <p>标准图：5 积分 / 张</p>
            <p>高清图：12 积分 / 张</p>
            <p>任务失败：自动回滚冻结积分</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
