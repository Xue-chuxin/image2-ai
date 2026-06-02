"use client";

import { useState } from "react";
import { ImageIcon } from "lucide-react";
import { GenerateComposer, type GenerationJobResult } from "@/components/generate-composer";

export function GenerateWorkbench({ initialPrompt }: { initialPrompt: string }) {
  const [job, setJob] = useState<GenerationJobResult | null>(null);

  return (
    <div className="grid gap-5 lg:grid-cols-[1.1fr_.9fr]">
      <GenerateComposer initialPrompt={initialPrompt} onJobChange={setJob} />
      <aside className="space-y-5">
        <div className="rounded-[28px] border border-slate-200 bg-white/86 p-5 shadow-card backdrop-blur">
          <h2 className="text-lg font-black text-slate-950">任务预览</h2>
          <div className="mt-4 aspect-square rounded-[24px] border border-dashed border-slate-200 bg-gradient-to-br from-slate-50 via-white to-blue-50 p-4">
            {job?.images.length ? (
              <img src={job.images[0].url} alt="任务预览" className="h-full w-full rounded-[20px] object-cover" />
            ) : (
              <div className="flex h-full flex-col items-center justify-center rounded-[20px] bg-white/72 text-center text-sm font-semibold text-slate-500">
                <ImageIcon className="mb-3 h-8 w-8 text-slate-300" />
                {job ? job.errorMessage || `任务状态：${job.status}` : "生成结果会在这里显示"}
              </div>
            )}
          </div>
          {job ? (
            <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 px-4 py-3 text-sm font-bold text-slate-600">
              <p>状态：{job.status}</p>
              <p className="mt-1">Provider：{job.provider}</p>
              <p className="mt-1">预计积分：{job.creditCost}</p>
            </div>
          ) : null}
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
    </div>
  );
}
