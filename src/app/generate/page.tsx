import { GenerateComposer } from "@/components/generate-composer";

export default async function GeneratePage({
  searchParams
}: {
  searchParams?: Promise<{ prompt?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialPrompt = resolvedSearchParams.prompt || "";

  return (
    <main className="grid gap-5 pb-28 lg:grid-cols-[1.1fr_.9fr]">
      <section className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Create</p>
          <h1 className="mt-2 text-3xl font-black text-slate-950">创作工作台</h1>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            先用 DeepSeek 整理画面描述，再提交图片生成任务。当前阶段先完成提示词润色闭环，生成队列会在下一阶段接入。
          </p>
        </div>
        <GenerateComposer initialPrompt={initialPrompt} />
      </section>

      <aside className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
          <h2 className="text-lg font-black text-slate-950">任务预览</h2>
          <div className="mt-4 aspect-square rounded-[24px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
            <div className="flex h-full items-center justify-center rounded-[20px] bg-white/72 text-center text-sm font-semibold text-slate-500">
              生成结果会在这里显示
            </div>
          </div>
        </div>
        <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-card">
          <h2 className="text-lg font-black text-slate-950">积分规则草稿</h2>
          <div className="mt-4 space-y-3 text-sm text-slate-500">
            <p>标准图：5 积分 / 张</p>
            <p>高清图：12 积分 / 张</p>
            <p>任务失败：自动回滚冻结积分</p>
          </div>
        </div>
      </aside>
    </main>
  );
}
