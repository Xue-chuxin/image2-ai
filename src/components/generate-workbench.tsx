"use client";

import { useState } from "react";
import { Clock, Coins, ImageIcon, Sparkles } from "lucide-react";

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
  provider: "openai" | "chatgpt_web";
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
};

function getStatusLabel(status?: string) {
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

export function GenerateWorkbench({ initialPrompt = "", initialReferenceImages = [] }: GenerateWorkbenchProps) {
  const [job, setJob] = useState<GenerationJobResult | null>(null);
  const firstImage = job?.images[0];
  const references = job?.referenceImages?.length ? job.referenceImages : initialReferenceImages;

  return (
    <section className="generate-workbench">
      <GenerateComposer initialPrompt={initialPrompt} initialReferenceImages={initialReferenceImages} onJobChange={setJob} />

      <aside className="preview-panel">
        <div className="preview-card">
          {firstImage ? (
            <img src={firstImage.url} alt={job?.promptZh || "生成结果"} />
          ) : (
            <div className="preview-empty">
              <Sparkles size={28} />
              <span>生成结果会显示在这里</span>
              <small>生成前会检查积分。成功后扣除积分，失败会退还冻结积分。</small>
            </div>
          )}
        </div>

        {references.length > 0 ? (
          <div className="job-card">
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
            <p className="mt-3 text-xs font-bold leading-6 text-slate-400">当前版本会记录参考图，自动上传到 ChatGPT Web 放到下一阶段。</p>
          </div>
        ) : null}

        <div className="job-card">
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
            <p className="muted-copy">输入提示词并点击“开始生成”后，这里会展示当前任务信息。</p>
          )}
        </div>

        <div className="job-card compact">
          <div className="rule-row">
            <Coins size={18} />
            <span>标准 5 积分 / 张，高清 12 积分 / 张，省积分 3 积分 / 张</span>
          </div>
          <div className="rule-row">
            <Clock size={18} />
            <span>阶段 8B 已支持参考图上传和任务关联，真实图生图放到下一阶段。</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
