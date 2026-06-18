import Link from "next/link";
import {
  ArrowRight,
  CheckCircle2,
  Clock3,
  GalleryHorizontalEnd,
  ImageDown,
  Images,
  Layers3,
  PenLine,
  ShieldCheck,
  Sparkles,
  WandSparkles,
  WalletCards,
} from "lucide-react";
import { GenerateComposer } from "@/components/generate-composer";
import { BlurText, GlassSurface, SpotlightCard, SplitText } from "@/components/front/react-bits";
import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { GALLERY_CATEGORIES, listPublicGalleryImages, type GalleryImageView } from "@/lib/gallery";
import { promptCards } from "@/lib/mock-data";
import { getPublicAppSettings } from "@/lib/settings";

const steps = [
  ["01", "写清画面", "先把主体、场景、镜头和比例写清楚。页面会保留你的原意，不把描述改成模板话术。"],
  ["02", "选择方向", "从写真、商品、角色、界面、建筑、插画、国风和其他里选择方向，也可以先用润色功能整理文字。"],
  ["03", "生成并归档", "提交任务后到记录里查看结果。满意的作品可以公开展示，方便之后复用。"],
];

const flowSteps = [
  {
    title: "写下画面",
    note: "把主体、场景、镜头和氛围先写出来，不需要一开始就很专业。",
    Icon: PenLine,
  },
  {
    title: "整理描述",
    note: "需要时先润色提示词，让模型更容易理解你的画面意图。",
    Icon: WandSparkles,
  },
  {
    title: "生成保存",
    note: "提交任务后自动归档到记录，后续可以复制提示词继续迭代。",
    Icon: ImageDown,
  },
];

const enterpriseCapabilities = [
  {
    title: "DeepSeek 提示词润色",
    description: "把口语化描述整理成更清晰的生成提示词，保留原意，降低模板味。",
    Icon: WandSparkles,
  },
  {
    title: "统一生图任务",
    description: "通过 Provider 抽象提交任务、轮询状态、保存结果，前台无需直连模型接口。",
    Icon: Sparkles,
  },
  {
    title: "作品历史与公开展示",
    description: "生成结果自动归档，满意作品可发布到作品流，用于复用提示词和运营展示。",
    Icon: GalleryHorizontalEnd,
  },
  {
    title: "积分与后台配置",
    description: "支持积分消耗、订单记录、模型通道、存储和安全配置，适合持续运营。",
    Icon: WalletCards,
  },
];

const scenarios = [
  ["电商商品图", "统一生成商品主图、详情素材和场景氛围图。"],
  ["内容运营", "快速产出封面、配图、活动视觉和社媒素材。"],
  ["设计提案", "用提示词库沉淀视觉方向，让团队复用稳定风格。"],
];

const previewNavItems = [
  { label: "首页", Icon: Images },
  { label: "创作", Icon: Sparkles },
  { label: "记录", Icon: Clock3 },
  { label: "安全", Icon: ShieldCheck },
];

export default async function HomePage() {
  const settings = await getPublicAppSettings();
  let publicWorks: GalleryImageView[] = [];
  let galleryError: string | null = null;

  try {
    publicWorks = await listPublicGalleryImages({ limit: 48 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  if (settings.frontTemplate === "tdesign_workspace") {
    return (
      <main className="front-site-main">
        <section className="front-site-hero">
          <div className="front-site-hero-copy">
            <span className="front-site-eyebrow">AI Image Studio</span>
            <h1>{settings.siteTitle}</h1>
            <p>
              {settings.siteSubtitle ? `${settings.siteSubtitle}。` : ""}
              面向团队运营的 AI 生图工作台，从一句中文描述开始，完成提示词整理、生图任务、作品归档和公开展示。
            </p>
            <div className="front-site-hero-actions">
              <Link href="/generate" className="front-site-primary front-site-primary--large">
                开始创作
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a href="#showcase" className="front-site-secondary">
                浏览作品
              </a>
            </div>
            <dl className="front-site-metrics" aria-label="产品能力概览">
              <div>
                <dt>Provider</dt>
                <dd>OpenAI</dd>
              </div>
              <div>
                <dt>Prompt</dt>
                <dd>DeepSeek</dd>
              </div>
              <div>
                <dt>Workflow</dt>
                <dd>任务归档</dd>
              </div>
            </dl>
          </div>

          <ProductInterfacePreview siteTitle={settings.siteTitle} />
        </section>

        <section id="features" className="front-site-section">
          <div className="front-site-section-head">
            <span className="front-site-eyebrow">Product Capabilities</span>
            <h2>从生成到运营，前台和后台连成一条线</h2>
            <p>首页负责介绍产品价值，应用页负责真实创作流程，后台负责通道、存储和内容管理。</p>
          </div>
          <div className="front-site-feature-grid">
            {enterpriseCapabilities.map(({ title, description, Icon }) => (
              <article key={title} className="front-site-feature-card">
                <span>
                  <Icon className="h-5 w-5" />
                </span>
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section id="scenarios" className="front-site-section front-site-section--split">
          <div className="front-site-section-head">
            <span className="front-site-eyebrow">Use Cases</span>
            <h2>适合需要持续产图的业务场景</h2>
            <p>不是一次性玩具，而是能沉淀提示词、作品和运营配置的生产入口。</p>
          </div>
          <div className="front-site-scenario-list">
            {scenarios.map(([title, description], index) => (
              <article key={title}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="showcase" className="front-site-section front-site-showcase">
          <div className="front-site-section-head front-site-section-head--row">
            <div>
              <span className="front-site-eyebrow">Works</span>
              <h2>用作品展示真实生成结果</h2>
              <p>公开作品和运营精选会在这里沉淀，访客可以浏览风格、复用描述并继续创作。</p>
            </div>
            <Link href="/prompts" className="front-site-secondary">
              进入灵感库
            </Link>
          </div>
          <HomeWorksShowcase
            categories={GALLERY_CATEGORIES}
            initialWorks={publicWorks}
            fallbackPrompts={promptCards}
            galleryError={galleryError}
          />
        </section>
      </main>
    );
  }

  return (
    <main className="space-y-8 pb-28">
      <section className="grid gap-5 lg:grid-cols-[0.86fr_1.14fr] lg:items-stretch">
        <GlassSurface className="order-2 rounded-[28px] px-6 py-7 text-slate-950 md:px-8 md:py-8 lg:order-1 lg:h-full">
          <div className="absolute -right-24 top-10 h-72 w-72 rounded-full bg-sky-100/80 blur-3xl" />
          <div className="relative flex h-full flex-col gap-6">
            <div>
              <span className="eyebrow">Studio Flow</span>
              <BlurText
                as="h1"
                text="从一句描述开始创作"
                className="max-w-xl font-serif text-4xl font-black leading-[1.02] text-slate-950 md:text-5xl"
                by="letters"
                delay={0.012}
              />
              <SplitText
                as="p"
                text="先把脑子里的画面写下来，右侧工作台会帮你完成整理、生成和保存。首页只保留创作路径，把注意力留给输入本身。"
                className="max-w-xl text-base leading-7 text-slate-500"
                delay={0.006}
              />
            </div>

            <div className="grid gap-3">
              {flowSteps.map(({ title, note, Icon }, index) => (
                <div key={title} className="group rounded-[22px] border border-white/85 bg-white/68 p-4 shadow-[0_16px_42px_rgba(31,52,76,0.08)] backdrop-blur transition duration-300 hover:-translate-y-0.5 hover:bg-white/82">
                  <div className="flex items-start gap-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-sky-100 bg-sky-50/86 text-ocean-700 shadow-sm">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-black text-slate-300">{String(index + 1).padStart(2, "0")}</span>
                        <h2 className="text-base font-black text-slate-950">{title}</h2>
                      </div>
                      <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">{note}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-auto flex flex-wrap gap-3 pt-1">
              <Link href="/generate" className="inline-flex items-center gap-2 rounded-full border border-sky-100 bg-sky-50/90 px-5 py-3 text-sm font-black text-ocean-800 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                开始创作
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/prompts" className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/78 px-5 py-3 text-sm font-black text-slate-700 shadow-card backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">
                浏览灵感
              </Link>
            </div>

          </div>
        </GlassSurface>

        <div className="order-1 lg:order-2">
          <GenerateComposer compact redirectOnTerminal="/history" />
        </div>
      </section>

      <HomeWorksShowcase
        categories={GALLERY_CATEGORIES}
        initialWorks={publicWorks}
        fallbackPrompts={promptCards}
        galleryError={galleryError}
      />

      <SpotlightCard className="p-5 md:p-6">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">How it works</p>
            <h2 className="mt-1 text-2xl font-black text-slate-950">如何使用</h2>
          </div>
          <Link href="/generate" className="hidden items-center gap-2 rounded-full bg-slate-950 px-4 py-2 text-sm font-black text-white transition hover:-translate-y-0.5 md:inline-flex">
            开始创作
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {steps.map(([num, title, note]) => (
            <div key={num} className="rounded-[22px] border border-slate-200 bg-slate-50/86 p-4">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-black text-slate-400">{num}</span>
                <CheckCircle2 className="h-4 w-4 text-slate-400" />
              </div>
              <p className="text-lg font-black text-slate-950">{title}</p>
              <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
            </div>
          ))}
        </div>
      </SpotlightCard>
    </main>
  );
}

function ProductInterfacePreview({ siteTitle }: { siteTitle: string }) {
  return (
    <aside className="front-site-product-preview" aria-label="产品界面预览">
      <div className="front-site-preview-window">
        <div className="front-site-preview-topbar">
          <span />
          <span />
          <span />
          <strong>{siteTitle} Studio</strong>
        </div>
        <div className="front-site-preview-body">
          <div className="front-site-preview-sidebar">
            {previewNavItems.map(({ label, Icon }, index) => {
              return (
                <div key={label} className={index === 1 ? "is-active" : ""}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                </div>
              );
            })}
          </div>
          <div className="front-site-preview-main">
            <div className="front-site-preview-composer">
              <div>
                <span>画面描述</span>
                <strong>雨夜街头的人像写真，浅景深，侧光</strong>
              </div>
              <div className="front-site-preview-options">
                <span>1:1</span>
                <span>标准</span>
                <span>1 张</span>
              </div>
              <button type="button">开始生成</button>
            </div>
            <div className="front-site-preview-result">
              <Layers3 className="h-7 w-7" />
              <strong>任务进度</strong>
              <span>润色 / 生成 / 保存</span>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
