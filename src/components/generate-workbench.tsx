"use client";

import { useState } from "react";
import { Clock, Coins, ImageIcon, Sparkles } from "lucide-react";

import { GlassSurface, SpotlightCard, StatusStepper } from "./front/react-bits";
import { GenerateComposer } from "./generate-composer";

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

export function GenerateWorkbench({ initialPrompt = "", initialReferenceImages = [], referenceImagesEnabled = false }: GenerateWorkbenchProps) {
  const [job, setJob] = useState<GenerationJobResult | null>(null);
  const firstImage = job?.images[0];
  const references = referenceImagesEnabled ? (job?.referenceImages?.length ? job.referenceImages : initialReferenceImages) : [];
  const status = job?.status || "";
  const statusSteps = [
    { label: "排队", complete: Boolean(job) && status !== "QUEUED", active: status === "QUEUED" || !job },
    { label: "生成", complete: ["UPLOADING", "COMPLETED"].includes(status), active: status === "POLISHING" || status === "GENERATING" },
    { label: "保存", complete: status === "COMPLETED", active: status === "UPLOADING" },
    { label: status === "FAILED" ? "失败" : "完成", active: status === "FAILED" || status === "COMPLETED", complete: status === "COMPLETED" },
  ];

  return (
    <section className="generate-workbench">
      <GenerateComposer initialPrompt={initialPrompt} initialReferenceImages={initialReferenceImages} onJobChange={setJob} referenceImagesEnabled={referenceImagesEnabled} />

      <aside className="preview-panel">
        <GlassSurface className="preview-card">
          {firstImage ? (
            <img src={firstImage.url} alt={job?.promptZh || "生成结果"} />
          ) : (
            <div className="preview-empty">
              <Sparkles size={28} />
              <span>生成结果会显示在这里</span>
              <small>生成前会检查积分。成功后扣除积分，失败会退回冻结积分。</small>
            </div>
          )}
        </GlassSurface>

        <SpotlightCard className="job-card">
          <div className="job-card-head">
            <div>
              <span className="eyebrow">Progress</span>
              <h2>{job ? getStatusLabel(job.status) : "等待生成"}</h2>
            </div>
            <Sparkles size={20} />
          </div>
          <StatusStepper items={statusSteps} />
        </SpotlightCard>

        {references.length > 0 ? (
          <SpotlightCard className="job-card">
            <div className="job-card-head">
              <div>
                <span className="eyebrow">References</span>
                <h2>参考图</h2>
              </div>
              <ImageIcon size={20} />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {references.map((image) => (
                <img key={image.id} src={image.thumbnailUrl || image.url} alt="参考图" className="h-24 w-full rounded-2xl border border-slate-200 object-cover" />
              ))}
            </div>
            <p className="mt-3 text-xs font-bold leading-6 text-slate-400">参考图会保存在任务记录里，便于后续复用。</p>
          </SpotlightCard>
        ) : null}

        <SpotlightCard className="job-card">
          <div className="job-card-head">
            <div>
              <span className="eyebrow">Task</span>
              <h2>{job ? getStatusLabel(job.status) : "等待生成"}</h2>
            </div>
            <ImageIcon size={20} />
          </div>

          {job ? (
            <>
              <dl className="meta-list">
                <div>
                  <dt>Provider</dt>
                  <dd>{job.provider}</dd>
                </div>
                <div>
                  <dt>模型</dt>
                  <dd>{job.model || "未返回"}</dd>
                </div>
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
                  <dt>积分</dt>
                  <dd>{job.creditCost}</dd>
                </div>
              </dl>

              {job.errorMessage ? <p className="job-error">{job.errorMessage}</p> : null}
            </>
          ) : (
            <p className="muted-copy">输入描述并点击“开始生成”后，这里会显示当前任务信息。</p>
          )}
        </SpotlightCard>

        <SpotlightCard className="job-card compact">
          <div className="rule-row">
            <Coins size={18} />
            <span>标准 10 积分 / 张，高清 35 积分 / 张，省积分 3 积分 / 张。</span>
          </div>
          <div className="rule-row">
            <Clock size={18} />
            <span>如果任务还在处理中，可以到“记录”页面继续查看。</span>
          </div>
        </SpotlightCard>
      </aside>
    </section>
  );
}
