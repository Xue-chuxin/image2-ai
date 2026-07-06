"use client";

import { useState } from "react";
import clsx from "clsx";
import { Check, Clock3, Coins, Sparkles } from "lucide-react";

import { GenerateComposer } from "./generate-composer";
import { GeneratedImagePreview } from "./generated-image-preview";

type ReferenceImageResult = {
  id: string;
  url: string;
  thumbnailUrl: string | null;
  mimeType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
};

type GenerationJobResult = {
  id: string;
  status: string;
  provider: "openai" | "chatgpt_web" | "stability_ai";
  model: string | null;
  promptZh: string;
  promptEn: string | null;
  negativePrompt: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  errorMessage: string | null;
  createdAt: string;
  referenceImages: ReferenceImageResult[];
  images: Array<{
    id: string;
    url: string;
    thumbnailUrl?: string | null;
    width: number | null;
    height: number | null;
  }>;
};

type GenerateWorkbenchProps = {
  initialPrompt?: string;
  initialPromptEn?: string;
  initialNegativePrompt?: string;
  initialRatio?: string;
  initialQuality?: string;
  initialImageCount?: number;
  initialReferenceImages?: ReferenceImageResult[];
  referenceImagesEnabled?: boolean;
};

function getStatusLabel(status?: string) {
  if (status === "QUEUED") {
    return "排队中";
  }

  if (status === "POLISHING") {
    return "润色中";
  }

  if (status === "UPLOADING") {
    return "保存中";
  }

  if (status === "COMPLETED") {
    return "已完成";
  }

  if (status === "FAILED") {
    return "失败";
  }

  if (status === "GENERATING") {
    return "生成中";
  }

  return "等待生成";
}

function getQualityLabel(quality?: string) {
  if (quality === "high") {
    return "高清";
  }

  if (quality === "low") {
    return "省积分";
  }

  return "标准";
}

type StatusStep = {
  label: string;
  complete: boolean;
  active: boolean;
};

function StatusStepper({ steps }: { steps: StatusStep[] }) {
  return (
    <ol className="flex items-start">
      {steps.map((step, index) => {
        const isFailure = step.label === "失败" && step.active && !step.complete;
        const previousReached = index > 0 && (steps[index - 1].complete || steps[index - 1].active);

        return (
          <li key={`${step.label}-${index}`} className="relative flex flex-1 flex-col items-center">
            {index > 0 ? (
              <span
                aria-hidden
                className={clsx(
                  "absolute right-1/2 top-3.5 h-0.5 w-full -translate-y-1/2",
                  steps[index - 1].complete ? "bg-emerald-400" : previousReached ? "bg-brand-200" : "bg-line",
                )}
              />
            ) : null}
            <span
              className={clsx(
                "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold",
                step.complete
                  ? "bg-emerald-500 text-white"
                  : isFailure
                    ? "bg-rose-500 text-white"
                    : step.active
                      ? "bg-brand-500 text-white shadow-chip"
                      : "border border-line bg-white text-ink-faint",
              )}
            >
              {step.complete ? <Check size={14} /> : index + 1}
            </span>
            <span
              className={clsx(
                "mt-2 text-xs font-semibold",
                step.complete ? "text-emerald-600" : isFailure ? "text-rose-500" : step.active ? "text-brand-600" : "text-ink-faint",
              )}
            >
              {step.label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function GenerateWorkbench({
  initialPrompt = "",
  initialPromptEn = "",
  initialNegativePrompt = "",
  initialRatio,
  initialQuality,
  initialImageCount,
  initialReferenceImages = [],
  referenceImagesEnabled = false,
}: GenerateWorkbenchProps) {
  const [job, setJob] = useState<GenerationJobResult | null>(null);
  const firstImage = job?.images[0];
  const references = referenceImagesEnabled ? (job?.referenceImages?.length ? job.referenceImages : initialReferenceImages) : [];
  const status = job?.status || "";
  const statusSteps: StatusStep[] = [
    { label: "排队", complete: Boolean(job) && status !== "QUEUED", active: status === "QUEUED" || !job },
    { label: "生成", complete: ["UPLOADING", "COMPLETED"].includes(status), active: status === "POLISHING" || status === "GENERATING" },
    { label: "保存", complete: status === "COMPLETED", active: status === "UPLOADING" },
    { label: status === "FAILED" ? "失败" : "完成", active: status === "FAILED" || status === "COMPLETED", complete: status === "COMPLETED" },
  ];

  const metaRows: Array<{ term: string; value: string }> = job
    ? [
        { term: "Provider", value: job.provider },
        { term: "模型", value: job.model || "未返回" },
        { term: "比例", value: job.ratio },
        { term: "质量", value: getQualityLabel(job.quality) },
        { term: "张数", value: `${job.imageCount}` },
        { term: "积分", value: `${job.creditCost}` },
      ]
    : [];

  return (
    <div className="space-y-5">
      {/* Hero */}
      <section className="pt-2 text-center md:pt-4">
        <h1 className="text-2xl font-extrabold text-ink md:text-3xl">AI 绘画 · 让每句描述都成为画面</h1>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-ink-secondary">
          先用 DeepSeek 把一句话整理成专业提示词，再经统一生图通道提交任务，结果自动保存到生成历史。
        </p>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[1.15fr_.85fr]">
        {/* 左列：创作卡片 */}
        <GenerateComposer
          initialPrompt={initialPrompt}
          initialPromptEn={initialPromptEn}
          initialNegativePrompt={initialNegativePrompt}
          initialRatio={initialRatio}
          initialQuality={initialQuality}
          initialImageCount={initialImageCount}
          initialReferenceImages={initialReferenceImages}
          onJobChange={setJob}
          referenceImagesEnabled={referenceImagesEnabled}
        />

        {/* 右列：结果与任务信息 */}
        <aside className="space-y-5">
          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-[17px] font-bold text-ink">结果预览</h2>
            <div className="mt-4">
              {firstImage ? (
                <GeneratedImagePreview
                  image={firstImage}
                  alt={job?.promptZh || "生成结果"}
                  loadingLabel="图片加载中"
                  originalLoadingLabel="图片加载中"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-line bg-page/60 px-4 py-10 text-center">
                  <Sparkles size={26} className="text-brand-400" />
                  <p className="text-sm font-semibold text-ink-secondary">生成结果会显示在这里</p>
                  <p className="max-w-60 text-xs leading-5 text-ink-faint">生成前会检查积分。成功后扣除积分，失败会退回冻结积分。</p>
                </div>
              )}
            </div>
          </section>

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-[17px] font-bold text-ink">任务进度</h2>
              <span
                className={clsx(
                  "rounded-full px-2.5 py-1 text-xs font-bold",
                  status === "FAILED"
                    ? "bg-rose-50 text-rose-500"
                    : status === "COMPLETED"
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-brand-50 text-brand-600",
                )}
              >
                {job ? getStatusLabel(job.status) : "等待生成"}
              </span>
            </div>
            <div className="mt-5">
              <StatusStepper steps={statusSteps} />
            </div>
          </section>

          {references.length > 0 ? (
            <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
              <h2 className="text-[17px] font-bold text-ink">参考图</h2>
              <div className="mt-4 grid grid-cols-2 gap-2.5">
                {references.map((image) => (
                  <img key={image.id} src={image.thumbnailUrl || image.url} alt="参考图" className="h-24 w-full rounded-xl border border-line object-cover" />
                ))}
              </div>
              <p className="mt-3 text-xs leading-5 text-ink-faint">参考图会保存在任务记录里，便于后续复用。</p>
            </section>
          ) : null}

          <section className="rounded-2xl border border-line bg-white p-5 shadow-card">
            <h2 className="text-[17px] font-bold text-ink">任务信息</h2>
            {job ? (
              <>
                <dl className="mt-4 space-y-2.5">
                  {metaRows.map((row) => (
                    <div key={row.term} className="flex items-center justify-between gap-3 text-sm">
                      <dt className="shrink-0 font-medium text-ink-faint">{row.term}</dt>
                      <dd className="truncate font-semibold text-ink">{row.value}</dd>
                    </div>
                  ))}
                </dl>
                {job.errorMessage ? <p className="mt-3 rounded-xl bg-rose-50 px-3.5 py-2.5 text-sm font-medium text-rose-500">{job.errorMessage}</p> : null}
              </>
            ) : (
              <p className="mt-3 text-sm leading-6 text-ink-faint">输入描述并点击“开始生成”后，这里会显示当前任务信息。</p>
            )}
          </section>

          <section className="space-y-2.5 rounded-2xl border border-line bg-white p-5 shadow-card">
            <div className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary">
              <Coins size={16} className="mt-1 shrink-0 text-amber-500" />
              <span>标准 10 积分 / 张，高清 35 积分 / 张，省积分 3 积分 / 张。</span>
            </div>
            <div className="flex items-start gap-2.5 text-sm leading-6 text-ink-secondary">
              <Clock3 size={16} className="mt-1 shrink-0 text-brand-400" />
              <span>如果任务还在处理中，可以到「生成历史」页面继续查看。</span>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
