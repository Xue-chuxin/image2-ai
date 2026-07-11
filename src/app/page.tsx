import Link from "next/link";
import {
  ArrowRight,
  Bot,
  Flame,
  ImagePlus,
  Images,
  Newspaper,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { HomeAnnouncementModal } from "@/components/home-announcement-modal";
import { HomeWorksShowcase } from "@/components/home-works-showcase";
import { GALLERY_CATEGORIES, listPublicGalleryImages, type GalleryImageView } from "@/lib/gallery";
import { promptCards } from "@/lib/mock-data";
import { getPublicAppSettings, type FooterFriendLink } from "@/lib/settings";

const heroBanners = [
  {
    title: "电商视觉设计",
    subtitle: "商品图·详情页·宣传物料",
    prompt: "高端美妆产品电商主图，奶油色渐变背景，柔和棚拍光影，产品居中特写，水润质感，简洁留白构图",
    gradient: "from-orange-400 via-amber-400 to-rose-400",
  },
  {
    title: "AI 人像写真",
    subtitle: "一句话生成专业级人像",
    prompt: "都市夜景人像写真，浅景深，霓虹光斑背景，侧逆光勾勒轮廓，电影感色调，细腻皮肤质感",
    gradient: "from-blue-500 via-indigo-500 to-violet-500",
  },
  {
    title: "国风插画",
    subtitle: "中式美学一键出图",
    prompt: "国风工笔插画，青绿山水间白鹤展翅，云雾缭绕，宣纸质感，留白意境，传统东方配色",
    gradient: "from-emerald-500 via-teal-500 to-cyan-500",
  },
];

type AppEntry = {
  title: string;
  description: string;
  icon: LucideIcon;
  iconClass: string;
  href?: string;
};

const appEntries: AppEntry[] = [
  {
    title: "创意图片生成",
    description: "输入一句中文描述，生成可商用的高质量图片",
    icon: ImagePlus,
    iconClass: "bg-brand-50 text-brand-600",
    href: "/generate",
  },
  {
    title: "提示词整理",
    description: "DeepSeek 帮你把口语描述润色成专业提示词",
    icon: WandSparkles,
    iconClass: "bg-violet-50 text-violet-600",
    href: "/generate",
  },
  {
    title: "灵感画廊",
    description: "浏览公开作品，一键复用同款描述继续创作",
    icon: Images,
    iconClass: "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
    href: "#showcase",
  },
  {
    title: "智能助手",
    description: "AI 创作对话助手，答疑解惑与灵感脑暴",
    icon: Bot,
    iconClass: "bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-300",
    href: "/assistant",
  },
  {
    title: "小红书爆款文案",
    description: "按主题生成种草笔记文案与标签组合",
    icon: Flame,
    iconClass: "bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-300",
    href: "/apps/xhs-copy",
  },
  {
    title: "公众号标题生成",
    description: "一键产出高点击率标题备选方案",
    icon: Newspaper,
    iconClass: "bg-cyan-50 text-cyan-600",
    href: "/apps/wechat-title",
  },
];

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const rawQuery = params.q;
  const initialQuery = (Array.isArray(rawQuery) ? rawQuery[0] : rawQuery) ?? "";

  const settings = await getPublicAppSettings();
  let publicWorks: GalleryImageView[] = [];
  let galleryError: string | null = null;

  try {
    publicWorks = await listPublicGalleryImages({ limit: 48 });
  } catch {
    galleryError = "作品库暂时不可用，请检查数据库服务。";
  }

  return (
    <main className="mx-auto w-full max-w-[1280px] space-y-5">
      <HomeAnnouncementModal settings={settings.homePopup} />

      {/* Banner 轮播区 */}
      <section aria-label="推荐创作场景">
        <div className="no-scrollbar flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 md:grid md:grid-cols-3 md:overflow-visible md:pb-0">
          {heroBanners.map((banner) => (
            <Link
              key={banner.title}
              href={`/generate?prompt=${encodeURIComponent(banner.prompt)}`}
              className={`group relative flex h-36 w-[82%] min-w-[250px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-2xl bg-gradient-to-br ${banner.gradient} p-5 text-white shadow-card transition duration-300 hover:-translate-y-1 hover:shadow-pop md:h-40 md:w-auto md:min-w-0`}
            >
              <span className="pointer-events-none absolute -right-8 -top-12 h-36 w-36 rounded-full bg-white/20 blur-2xl" aria-hidden="true" />
              <span className="pointer-events-none absolute -bottom-14 right-8 h-28 w-28 rounded-full bg-white/10 blur-xl" aria-hidden="true" />
              <div className="relative">
                <h2 className="text-xl font-extrabold leading-tight">{banner.title}</h2>
                <p className="mt-1.5 text-sm font-medium text-white/85">{banner.subtitle}</p>
              </div>
              <span className="relative inline-flex w-fit items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur transition group-hover:bg-white/30">
                立即体验
                <ArrowRight size={12} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* 应用广场 */}
      <section aria-label="应用广场" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-[17px] font-bold text-ink">应用广场</h2>
          <Link
            href="/generate"
            className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-600 transition hover:text-brand-700"
          >
            开始创作
            <ArrowRight size={13} />
          </Link>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4 xl:grid-cols-6">
          {appEntries.map((entry) => (
            <AppEntryCard key={entry.title} entry={entry} />
          ))}
        </div>
      </section>

      {/* 作品广场 */}
      <section id="showcase" className="scroll-mt-24 space-y-4" aria-label="作品广场">
        <HomeWorksShowcase
          categories={GALLERY_CATEGORIES}
          initialWorks={publicWorks}
          fallbackPrompts={promptCards}
          galleryError={galleryError}
          initialQuery={initialQuery}
        />
      </section>

      {/* 页尾 */}
      <footer className="space-y-2.5 border-t border-line pt-6 text-center">
        {settings.friendLinks.length > 0 ? (
          <nav aria-label="友情链接" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-xs text-ink-faint">
            <span className="font-semibold text-ink-secondary">友情链接</span>
            {settings.friendLinks.map((link) => (
              <FriendLink key={`${link.label}-${link.href}`} link={link} />
            ))}
          </nav>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-ink-faint">
          {settings.icpNumber ? (
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noreferrer"
              className="transition hover:text-ink-secondary"
            >
              {settings.icpNumber}
            </a>
          ) : null}
          <span>Powered by Image2 AI</span>
        </div>
      </footer>
    </main>
  );
}

function AppEntryCard({ entry }: { entry: AppEntry }) {
  const Icon = entry.icon;
  const body = (
    <>
      <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${entry.iconClass}`}>
        <Icon size={19} />
      </span>
      <span className="block min-w-0">
        <span className="block truncate text-sm font-bold text-ink">{entry.title}</span>
        <span className="mt-1 line-clamp-2 block text-xs leading-5 text-ink-faint">{entry.description}</span>
      </span>
    </>
  );
  const baseClass = "relative flex flex-col gap-3 rounded-2xl border border-line bg-panel p-4 shadow-card";

  if (!entry.href) {
    return (
      <div className={`${baseClass} cursor-default`} title={`「${entry.title}」正在规划中，敬请期待`}>
        <span className="absolute right-3 top-3 rounded-full bg-amber-50 dark:bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-300">
          敬请期待
        </span>
        {body}
      </div>
    );
  }

  const interactiveClass = `${baseClass} transition duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-pop`;

  if (entry.href.startsWith("#")) {
    return (
      <a href={entry.href} className={interactiveClass}>
        {body}
      </a>
    );
  }

  return (
    <Link href={entry.href} className={interactiveClass}>
      {body}
    </Link>
  );
}

function FriendLink({ link }: { link: FooterFriendLink }) {
  const className = "transition hover:text-brand-600";

  if (link.href.startsWith("http://") || link.href.startsWith("https://")) {
    return (
      <a href={link.href} target="_blank" rel="noreferrer" className={className}>
        {link.label}
      </a>
    );
  }

  return (
    <Link href={link.href} className={className}>
      {link.label}
    </Link>
  );
}
