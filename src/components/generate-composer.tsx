"use client";

import { useState } from "react";
import { ImageUp, RotateCcw, Send, Wand2 } from "lucide-react";
import { clsx } from "clsx";

const styles = ["写真", "商品", "角色", "界面", "插画", "建筑"];
const ratios = ["1:1", "3:4", "16:9", "9:16"];

export function GenerateComposer({ compact = false }: { compact?: boolean }) {
  const [style, setStyle] = useState(styles[1]);
  const [ratio, setRatio] = useState(ratios[0]);

  return (
    <section className="liquid-glass relative overflow-hidden rounded-[28px] p-5 animate-float-in">
      <div className="liquid-mask" />
      <div className="relative">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-200 md:hidden" />
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-slate-400">Create</p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">画面描述</h2>
          </div>
          <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-500">约 1 分钟</div>
        </div>

        <div className="relative mt-5 overflow-hidden rounded-[22px] border border-white/60 bg-white/48 p-3 shadow-card backdrop-blur-xl">
          <div className="liquid-mask" />
          <textarea
            className="relative min-h-32 w-full resize-none bg-transparent p-3 text-[15px] leading-7 text-slate-800 outline-none placeholder:text-slate-400"
            placeholder="描述你想要的画面，例如：蓝白色产品海报，玻璃质感咖啡机，冷光棚拍，干净留白..."
          />
          <div className="relative flex flex-wrap items-center gap-2 border-t border-white/70 px-2 pt-3">
            <button className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-card">
              <Wand2 className="h-3.5 w-3.5" /> 整理描述
            </button>
            <button className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-700 shadow-card">
              <ImageUp className="h-3.5 w-3.5" /> 加图
            </button>
            <button className="ml-auto inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-black text-slate-500 shadow-card">
              <RotateCcw className="h-3.5 w-3.5" /> 换一句
            </button>
          </div>
        </div>

        <div className="mt-4 flex gap-2 overflow-x-auto pb-1 no-scrollbar">
          {styles.map((item) => (
            <button
              key={item}
              onClick={() => setStyle(item)}
              className={clsx(
                "shrink-0 rounded-full border px-4 py-2 text-sm font-black transition",
                style === item ? "border-slate-950 bg-slate-950 text-white shadow-card" : "border-slate-200 bg-white text-slate-600"
              )}
            >
              {item}
            </button>
          ))}
        </div>

        {!compact && (
          <div className="mt-5 grid gap-3 sm:grid-cols-[1fr_1.3fr]">
            <button className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-4 py-4 text-sm font-black text-slate-600">
              <ImageUp className="h-4 w-4" /> 上传参考图
            </button>
            <div className="flex gap-2 overflow-x-auto rounded-2xl border border-slate-200 bg-white p-2 no-scrollbar">
              {ratios.map((item) => (
                <button
                  key={item}
                  onClick={() => setRatio(item)}
                  className={clsx(
                    "shrink-0 rounded-xl px-3 py-2 text-xs font-black",
                    ratio === item ? "bg-slate-950 text-white shadow-card" : "text-slate-500"
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 grid gap-3 sm:grid-cols-[.9fr_1.1fr]">
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-600">
            保存草稿
          </button>
          <button className="inline-flex items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-card transition hover:bg-slate-800">
            <Send className="h-4 w-4" /> 开始生成
          </button>
        </div>
      </div>
    </section>
  );
}
