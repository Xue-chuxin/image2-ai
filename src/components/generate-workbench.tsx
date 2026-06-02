"use client";

import { useState } from "react";
import { Clock, Coins, ImageIcon, Sparkles } from "lucide-react";

import { GenerateComposer } from "./generate-composer";

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
  images: Array<{
    id: string;
    url: string;
    width: number | null;
    height: number | null;
  }>;
};

type GenerateWorkbenchProps = {
  initialPrompt?: string;
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

export function GenerateWorkbench({ initialPrompt = "" }: GenerateWorkbenchProps) {
  const [job, setJob] = useState<GenerationJobResult | null>(null);
  const firstImage = job?.images[0];

  return (
    <section className="generate-workbench">
      <GenerateComposer initialPrompt={initialPrompt} onJobChange={setJob} />

      <aside className="preview-panel">
        <div className="preview-card">
          {firstImage ? (
            <img src={firstImage.url} alt={job?.promptZh || "生成结果"} />
          ) : (
            <div className="preview-empty">
              <Sparkles size={28} />
              <span>生成结果会显示在这里</span>
              <small>生成前会先检查积分。成功后扣除积分，失败会返还冻结积分。</small>
            </div>
          )}
        </div>

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
            <span>阶段 5 为同步生成，队列和充值会放到后续阶段</span>
          </div>
        </div>
      </aside>
    </section>
  );
}
