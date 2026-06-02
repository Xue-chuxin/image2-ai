import { PromptLibrary } from "@/components/prompt-library";
import { categories, promptCards } from "@/lib/mock-data";

export default function PromptsPage() {
  return (
    <main className="space-y-6 pb-28">
      <section className="relative overflow-hidden rounded-[30px] border border-slate-200 bg-white p-5 shadow-card md:p-7">
        <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full bg-blue-50 blur-3xl" />
        <div className="relative grid gap-6 lg:grid-cols-[1fr_.9fr] lg:items-end">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Gallery</p>
            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">灵感库</h1>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-500">按写真、商品、角色、界面、建筑和插画组织。浏览后可直接套用到创作面板。</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-[20px] border border-slate-200 bg-slate-50 p-4 text-slate-900">
              <p className="text-2xl font-black">+100</p>
              <p className="mt-1 text-xs font-bold text-slate-500">本周新增</p>
            </div>
            <div className="rounded-[20px] border border-slate-200 bg-white p-4 text-slate-900">
              <p className="text-2xl font-black">8 类</p>
              <p className="mt-1 text-xs font-bold text-slate-500">常用场景</p>
            </div>
          </div>
        </div>
      </section>

      <PromptLibrary categories={categories} prompts={promptCards} />
    </main>
  );
}