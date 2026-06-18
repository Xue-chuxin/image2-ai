import Link from "next/link";
import {
  ArrowRight,
  BadgeCheck,
  Bot,
  CheckCircle2,
  Clock3,
  Database,
  FileImage,
  GalleryHorizontalEnd,
  Gauge,
  ImageDown,
  Images,
  Layers3,
  PenLine,
  Settings2 as Settings2Icon,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  WandSparkles,
  WalletCards,
  Workflow,
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

const featureSpotlight = {
  title: "从一句中文到可复用视觉资产",
  description: "把创意描述、提示词润色、生图任务和作品归档串成同一条生产链路，减少反复复制、截图和人工整理。",
  points: ["中文想法先保留业务语境", "提示词结构自动变清晰", "结果、参数和描述一起沉淀"],
};

const enterpriseCapabilities = [
  {
    title: "统一生图任务",
    description: "通过统一模型通道提交任务、轮询状态、保存结果，前台无需直连模型接口。",
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

const trustSignals = ["内容运营团队", "电商视觉生产", "设计提案协作", "品牌素材归档"];

const heroProofs = [
  { label: "模型组合", value: "DeepSeek + OpenAI", Icon: Bot },
  { label: "任务状态", value: "进度可追踪", Icon: Gauge },
  { label: "作品资产", value: "图库可复用", Icon: FileImage },
];

const workflowStages = [
  {
    title: "描述进入",
    description: "把中文想法、商品信息或活动主题写成初稿，保留业务语境。",
    meta: "输入",
    Icon: PenLine,
  },
  {
    title: "提示词润色",
    description: "DeepSeek 将口语描述整理成更稳定的画面结构和镜头语言。",
    meta: "润色",
    Icon: WandSparkles,
  },
  {
    title: "任务生成",
    description: "统一模型通道提交、状态轮询、失败提示和结果预览。",
    meta: "生成",
    Icon: Workflow,
  },
  {
    title: "沉淀复用",
    description: "作品、提示词、积分和公开展示一起归档，方便团队复盘。",
    meta: "归档",
    Icon: Database,
  },
];

const operations = [
  {
    title: "前台创作体验",
    description: "给普通用户一个清晰入口，从灵感浏览到正式生成都在同一套应用结构里完成。",
    Icon: Sparkles,
    items: ["创作工作台", "灵感库复用", "历史记录"],
  },
  {
    title: "运营后台配置",
    description: "管理员可以集中配置站点显示、模型通道、作品公开和支付积分相关能力。",
    Icon: Settings2Icon,
    items: ["模板切换", "通道管理", "作品审核"],
  },
  {
    title: "生产安全边界",
    description: "外部模型只在服务端调用，用户会话、管理员会话和公开内容职责分离。",
    Icon: ShieldCheck,
    items: ["统一接口", "权限隔离", "配置兜底"],
  },
  {
    title: "素材与存储扩展",
    description: "当前结构已预留上传、存储和公开展示能力，后续接对象存储时前台体验不需要重做。",
    Icon: UploadCloud,
    items: ["参考图", "存储服务", "公开展示"],
  },
];

const scenarios = [
  {
    title: "电商商品图",
    description: "统一生成商品主图、详情素材和场景氛围图。",
    audience: "电商运营、品牌视觉、店铺设计",
    input: "商品卖点、质感、拍摄角度",
    output: "主图、场景图、详情页素材",
  },
  {
    title: "内容运营",
    description: "快速产出封面、活动视觉、社媒配图和栏目素材。",
    audience: "新媒体、市场、活动运营",
    input: "活动主题、栏目调性、发布时间",
    output: "封面图、活动图、社媒配图",
  },
  {
    title: "设计提案",
    description: "将风格方向、镜头描述和作品样例沉淀成团队资产。",
    audience: "设计师、创意团队、项目负责人",
    input: "风格方向、镜头语言、参考情绪",
    output: "概念图、风格板、提案素材",
  },
  {
    title: "品牌素材库",
    description: "把公开作品、精选图和提示词归档，形成可持续展示入口。",
    audience: "品牌、内容中台、运营管理员",
    input: "品牌规范、常用场景、精选作品",
    output: "公开图库、提示词库、复用资产",
  },
];

const previewNavItems = [
  { label: "首页", Icon: Images },
  { label: "创作", Icon: Sparkles },
  { label: "记录", Icon: Clock3 },
  { label: "安全", Icon: ShieldCheck },
];

type HeroWork = {
  id: string;
  title: string;
  summary: string;
  category: string;
  imageUrl?: string;
  ratio: string;
  tone: string;
};

const workToneMap: Record<string, string> = {
  商品: "product",
  写真: "portrait",
  角色: "character",
  界面: "interface",
  建筑: "space",
  插画: "illustration",
  国风: "heritage",
  其他: "default",
};

function getWorkTone(category: string) {
  return workToneMap[category] || "default";
}

function shortSummary(text: string, maxLength = 46) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= maxLength) {
    return clean;
  }

  return `${clean.slice(0, maxLength)}...`;
}

function buildHeroWorks(publicWorks: GalleryImageView[]): HeroWork[] {
  const liveWorks = publicWorks.slice(0, 5).map((work) => ({
    id: work.id,
    title: work.title,
    summary: shortSummary(work.summary || work.promptZh || "公开作品"),
    category: work.category,
    imageUrl: work.thumbnailUrl || work.url,
    ratio: work.ratio,
    tone: getWorkTone(work.category),
  }));
  const fallbackWorks = promptCards.slice(0, Math.max(0, 5 - liveWorks.length)).map((prompt) => ({
    id: `prompt-${prompt.slug}`,
    title: prompt.title,
    summary: shortSummary(prompt.summary),
    category: prompt.category,
    ratio: prompt.ratio,
    tone: getWorkTone(prompt.category),
  }));

  return [...liveWorks, ...fallbackWorks].slice(0, 5);
}

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
    const heroWorks = buildHeroWorks(publicWorks);

    return (
      <main className="front-site-main">
        <section className="front-site-hero">
          <div className="front-site-hero-copy">
            <span className="front-site-eyebrow">企业级 AI 生图官网</span>
            <h1>{settings.siteTitle}</h1>
            <p>
              {settings.siteSubtitle ? `${settings.siteSubtitle}。` : ""}
              把团队的 AI 图片生产变成可复用工作流：中文想法进入，提示词自动整理，生成结果沉淀为作品资产。
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
                <dt>模型通道</dt>
                <dd>OpenAI</dd>
              </div>
              <div>
                <dt>提示词</dt>
                <dd>DeepSeek</dd>
              </div>
              <div>
                <dt>任务流程</dt>
                <dd>任务归档</dd>
              </div>
            </dl>
            <div className="front-site-proof-grid" aria-label="产品可信能力">
              {heroProofs.map(({ label, value, Icon }) => (
                <div key={label}>
                  <Icon className="h-4 w-4" />
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
          </div>

          <ProductInterfacePreview siteTitle={settings.siteTitle} works={heroWorks} />
        </section>

        <HeroResultStrip works={heroWorks} />

        <section className="front-site-trust-strip" aria-label="适用团队">
          <span>适合持续产图的团队</span>
          <div>
            {trustSignals.map((item) => (
              <strong key={item}>
                <BadgeCheck className="h-4 w-4" />
                {item}
              </strong>
            ))}
          </div>
        </section>

        <section id="features" className="front-site-section">
          <div className="front-site-section-head">
            <span className="front-site-eyebrow">产品能力</span>
            <h2>从生成到运营，前台和后台连成一条线</h2>
            <p>首页负责介绍产品价值，应用页负责真实创作流程，后台负责通道、存储和内容管理。</p>
          </div>
          <div className="front-site-feature-layout">
            <article className="front-site-feature-spotlight">
              <span className="front-site-feature-spotlight__icon">
                <WandSparkles className="h-6 w-6" />
              </span>
              <div>
                <h3>{featureSpotlight.title}</h3>
                <p>{featureSpotlight.description}</p>
              </div>
              <ul>
                {featureSpotlight.points.map((point) => (
                  <li key={point}>
                    <CheckCircle2 className="h-4 w-4" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
            <div className="front-site-feature-side-grid">
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
          </div>
        </section>

        <section id="workflow" className="front-site-section">
          <div className="front-site-section-head front-site-section-head--row">
            <div>
              <span className="front-site-eyebrow">生产流程</span>
              <h2>把一次生成，变成可复用的生产流程</h2>
              <p>首页只负责建立信任和讲清产品能力；用户进入应用页后，完整生成链路仍保留在工作台中。</p>
            </div>
            <Link href="/generate" className="front-site-secondary">
              查看工作台
            </Link>
          </div>
          <div className="front-site-workflow-grid">
            {workflowStages.map(({ title, description, meta, Icon }, index) => (
              <article key={title} className="front-site-workflow-card">
                <div>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <small>{meta}</small>
                </div>
                <Icon className="h-5 w-5" />
                <h3>{title}</h3>
                <p>{description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="front-site-section front-site-operations">
          <div className="front-site-section-head">
            <span className="front-site-eyebrow">运营就绪</span>
            <h2>不只是前台好看，也能支撑后续运营</h2>
            <p>模板、模型、作品、用户和积分都从后台统一管理，官网首页负责承接访客，应用工作台负责真实生产。</p>
          </div>
          <div className="front-site-operation-grid">
            {operations.map(({ title, description, Icon, items }) => (
              <article key={title} className="front-site-operation-card">
                <span>
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                </div>
                <ul>
                  {items.map((item) => (
                    <li key={item}>
                      <CheckCircle2 className="h-4 w-4" />
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section id="scenarios" className="front-site-section front-site-section--split">
          <div className="front-site-section-head">
            <span className="front-site-eyebrow">适用场景</span>
            <h2>适合需要持续产图的业务场景</h2>
            <p>不是一次性玩具，而是能沉淀提示词、作品和运营配置的生产入口。</p>
          </div>
          <div className="front-site-scenario-list">
            {scenarios.map(({ title, description, audience, input, output }, index) => (
              <article key={title}>
                <strong>{String(index + 1).padStart(2, "0")}</strong>
                <div>
                  <h3>{title}</h3>
                  <p>{description}</p>
                  <dl className="front-site-scenario-meta">
                    <div>
                      <dt>适合谁</dt>
                      <dd>{audience}</dd>
                    </div>
                    <div>
                      <dt>输入</dt>
                      <dd>{input}</dd>
                    </div>
                    <div>
                      <dt>产出</dt>
                      <dd>{output}</dd>
                    </div>
                  </dl>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section id="showcase" className="front-site-section front-site-showcase">
          <div className="front-site-section-head front-site-section-head--row">
            <div>
              <span className="front-site-eyebrow">作品展示</span>
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

        <section className="front-site-final-cta">
          <div>
            <span className="front-site-eyebrow">开始使用</span>
            <h2>从官网进入产品，从工作台完成创作</h2>
            <p>访客先理解能力，用户再进入生成流程。前台门面和应用体验各司其职，后续也方便继续扩展模板。</p>
          </div>
          <div>
            <Link href="/generate" className="front-site-primary front-site-primary--large">
              开始创作
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/signup" className="front-site-secondary">
              注册账号
            </Link>
          </div>
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

function HeroResultStrip({ works }: { works: HeroWork[] }) {
  return (
    <section className="front-site-result-strip" aria-label="生成结果预览">
      <div className="front-site-result-strip__head">
        <span className="front-site-eyebrow">作品结果</span>
        <h2>先看到产出，再进入工作台继续创作</h2>
        <p>首页展示公开作品和精选提示词，访客能快速判断风格与质量，登录后再进入完整生成流程。</p>
        <Link href="/prompts" className="front-site-secondary">
          进入灵感库
        </Link>
      </div>
      <div className="front-site-result-grid">
        {works.map((work, index) => (
          <article key={work.id} className={index === 0 ? "front-site-result-card is-large" : "front-site-result-card"}>
            <WorkVisual work={work} />
            <div>
              <span>{work.category}</span>
              <strong>{work.title}</strong>
              <small>{work.summary}</small>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function ProductInterfacePreview({ siteTitle, works }: { siteTitle: string; works: HeroWork[] }) {
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
            <div className="front-site-preview-panel">
              <div className="front-site-preview-status-card">
                <span>当前流程</span>
                <strong>提示词润色 -> 任务生成 -> 作品归档</strong>
                <small>面向团队的稳定生产链路</small>
              </div>
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
            </div>
            <div className="front-site-preview-gallery">
              <div className="front-site-preview-gallery-head">
                <span>
                  <Layers3 className="h-4 w-4" />
                  生成结果
                </span>
                <strong>自动进入作品资产库</strong>
              </div>
              <div className="front-site-preview-work-grid">
                {works.slice(0, 4).map((work, index) => (
                  <article key={work.id} className={index === 0 ? "front-site-preview-work-card is-large" : "front-site-preview-work-card"}>
                    <WorkVisual work={work} />
                    <div>
                      <span>{work.ratio}</span>
                      <strong>{work.title}</strong>
                    </div>
                  </article>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function WorkVisual({ work }: { work: HeroWork }) {
  if (work.imageUrl) {
    return <img src={work.imageUrl} alt={work.title} loading="lazy" />;
  }

  return <span className={`front-site-work-fallback tone-${work.tone}`} aria-hidden="true" />;
}
