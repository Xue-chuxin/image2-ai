import { GenerateWorkbench } from "@/components/generate-workbench";

export default async function GeneratePage({
  searchParams
}: {
  searchParams?: Promise<{ prompt?: string }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialPrompt = resolvedSearchParams.prompt || "";

  return (
    <main className="space-y-5 pb-28">
      <section className="rounded-[28px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Create</p>
        <h1 className="mt-2 text-3xl font-black text-slate-950">创作工作台</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          先用 DeepSeek 整理画面描述，再提交图片生成任务。当前阶段已接入后台配置、Provider 抽象和生图任务落库。
        </p>
      </section>
      <GenerateWorkbench initialPrompt={initialPrompt} />
    </main>
  );
}
