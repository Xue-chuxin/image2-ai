"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot,
  CalendarCheck,
  Clock3,
  Gift,
  Heart,
  Images,
  Info,
  LayoutGrid,
  Palette,
  Receipt,
  Search,
  Settings2,
  Sparkles,
  UserRound,
  Wand2,
  Wrench,
  Zap,
} from "lucide-react";
import { clsx } from "clsx";
import type { PublicAppSettings } from "@/lib/settings";
import { AccountMenu } from "@/components/account-menu";
import { InviteDialog } from "@/components/invite-dialog";
import { CheckinDialog } from "@/components/checkin-dialog";
import { NotificationBell } from "@/components/notification-bell";
import { ThemeToggle } from "@/components/theme-toggle";

export type ShellUser = {
  email: string;
  credits?: number;
  displayName?: string | null;
  avatarUrl?: string | null;
};

type NavItem = {
  href: string;
  label: string;
  icon: typeof Images;
  placeholder?: boolean;
  external?: boolean;
};

const navItems: NavItem[] = [
  { href: "/", label: "画廊广场", icon: Images },
  { href: "/apps", label: "应用中心", icon: LayoutGrid, placeholder: true },
  { href: "/assistant", label: "智能助手", icon: Bot, placeholder: true },
  { href: "/generate", label: "专业绘画", icon: Palette },
  { href: "/prompts", label: "提示词库", icon: Sparkles },
  { href: "/tools", label: "更多工具", icon: Wrench, placeholder: true },
  { href: "/favorites", label: "我的收藏", icon: Heart },
  { href: "/history", label: "生成历史", icon: Clock3 },
  { href: "/credits", label: "积分明细", icon: Receipt },
  { href: "/console", label: "后台管理", icon: Settings2, external: true },
];

const mobileNavItems = [
  { href: "/", label: "广场", icon: Images },
  { href: "/tools", label: "工具", icon: Wrench },
  { href: "/generate", label: "创作", icon: Wand2, primary: true },
  { href: "/history", label: "历史", icon: Clock3 },
  { href: "/account", label: "我的", icon: UserRound },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": { title: "画廊广场", description: "AI 创作广场" },
  "/apps": { title: "应用中心", description: "常用创作应用集合" },
  "/assistant": { title: "智能助手", description: "AI 创作对话助手" },
  "/generate": { title: "专业绘画", description: "AI 商业设计工作台" },
  "/tools": { title: "更多工具", description: "实用创作工具集合" },
  "/favorites": { title: "我的收藏", description: "收藏的公开作品与精选" },
  "/history": { title: "生成历史", description: "我的生成任务与结果" },
  "/credits": { title: "积分明细", description: "积分余额与收支流水" },
  "/account": { title: "用户中心", description: "积分、充值与订单" },
};

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({
  children,
  settings,
  user,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
  user?: ShellUser | null;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (pathname.startsWith("/signin") || pathname.startsWith("/signup")) {
    return <AuthShell settings={settings}>{children}</AuthShell>;
  }

  return (
    <WorkspaceShell settings={settings} user={user} pathname={pathname}>
      {children}
    </WorkspaceShell>
  );
}

function Brand({ settings }: { settings: PublicAppSettings }) {
  return (
    <Link href="/" className="flex items-center gap-2.5 px-2">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip">
        {settings.siteLogoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={settings.siteLogoUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <Sparkles size={18} />
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-[17px] font-extrabold leading-tight text-ink">{settings.siteTitle}</span>
      </span>
    </Link>
  );
}

function WorkspaceShell({
  children,
  settings,
  user,
  pathname,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
  user?: ShellUser | null;
  pathname: string;
}) {
  const router = useRouter();
  const [searchValue, setSearchValue] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [checkinOpen, setCheckinOpen] = useState(false);
  const metaKey = navItems.find((item) => isActivePath(pathname, item.href))?.href || (pathname.startsWith("/account") ? "/account" : "/");
  const meta = pageMeta[metaKey] || { title: settings.siteTitle, description: settings.siteSubtitle };

  function onSearchSubmit(event: FormEvent) {
    event.preventDefault();
    const keyword = searchValue.trim();
    router.push(keyword ? `/?q=${encodeURIComponent(keyword)}` : "/");
  }

  return (
    <div className="flex min-h-dvh">
      {/* 侧边栏 */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-[232px] flex-col border-r border-line bg-panel px-3.5 py-4 md:flex">
        <Brand settings={settings} />

        <nav className="mt-6 flex flex-1 flex-col gap-1" aria-label="主导航">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = !item.external && isActivePath(pathname, item.href);
            const itemClass = clsx(
              "group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14.5px] font-semibold transition",
              active ? "bg-brand-500 text-white shadow-chip" : "text-ink-secondary hover:bg-brand-50 hover:text-brand-600",
            );
            const iconClass = clsx(active ? "text-white" : "text-ink-faint group-hover:text-brand-500");

            if (item.external) {
              return (
                <a key={item.href} href={item.href} className={itemClass}>
                  <Icon size={18} className={iconClass} />
                  {item.label}
                </a>
              );
            }

            return (
              <Link key={item.href} href={item.href} className={itemClass}>
                <Icon size={18} className={iconClass} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <a
          href="https://github.com/Xue-chuxin/image2-ai"
          target="_blank"
          rel="noreferrer"
          className="flex items-center justify-center gap-2 rounded-xl border border-line px-3.5 py-2.5 text-sm font-semibold text-ink-secondary transition hover:bg-page"
        >
          <Info size={15} />
          关于我们
        </a>
      </aside>

      {/* 主区域 */}
      <div className="flex min-w-0 flex-1 flex-col md:pl-[232px]">
        {/* 顶栏 */}
        <header className="sticky top-0 z-30 border-b border-line bg-panel/90 backdrop-blur-md">
          <div className="flex h-16 items-center gap-3 px-4 md:gap-5 md:px-6">
            <div className="flex min-w-0 items-center gap-2.5 md:hidden">
              <Brand settings={settings} />
            </div>

            <div className="hidden shrink-0 md:block">
              <p className="text-[15px] font-bold leading-tight text-ink">{meta.title}</p>
              <p className="mt-0.5 text-xs leading-tight text-ink-faint">{meta.description}</p>
            </div>

            <form onSubmit={onSearchSubmit} className="hidden min-w-0 flex-1 justify-center md:flex">
              <label className="flex w-full max-w-xl items-center gap-2.5 rounded-full border border-line bg-page px-4 py-2.5 transition focus-within:border-brand-300 focus-within:bg-panel focus-within:ring-2 focus-within:ring-brand-100">
                <Search size={15} className="shrink-0 text-ink-faint" />
                <input
                  value={searchValue}
                  onChange={(event) => setSearchValue(event.target.value)}
                  placeholder="搜索作品、风格或提示词"
                  className="w-full bg-transparent text-sm text-ink outline-none placeholder:text-ink-faint"
                />
              </label>
            </form>

            <div className="ml-auto flex shrink-0 items-center gap-2 md:gap-2.5">
              <button
                type="button"
                onClick={() => (user ? setCheckinOpen(true) : router.push(`/signin?next=${encodeURIComponent(pathname)}`))}
                className="hidden items-center gap-1.5 rounded-full bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 text-[13px] font-bold text-emerald-600 dark:text-emerald-300 transition hover:bg-emerald-100 dark:hover:bg-emerald-500/20 lg:flex"
              >
                <CalendarCheck size={14} />
                每日签到
              </button>

              <button
                type="button"
                onClick={() => (user ? setInviteOpen(true) : router.push(`/signin?next=${encodeURIComponent(pathname)}`))}
                className="hidden items-center gap-1.5 rounded-full bg-amber-50 dark:bg-amber-500/10 px-3 py-1.5 text-[13px] font-bold text-amber-600 dark:text-amber-300 transition hover:bg-amber-100 dark:hover:bg-amber-500/20 lg:flex"
              >
                <Gift size={14} />
                邀请有礼
              </button>

              {user ? (
                <a
                  href="/console#/account/recharge"
                  className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1.5 text-[13px] font-bold text-brand-600 transition hover:bg-brand-100"
                >
                  <Zap size={14} className="text-brand-500" />
                  {typeof user.credits === "number" ? user.credits : "--"}
                  <span className="text-ink-faint">·</span>
                  充值
                </a>
              ) : null}

              <Link
                href="/membership"
                className="hidden rounded-full bg-gradient-to-r from-brand-500 to-brand-600 px-3.5 py-1.5 text-[13px] font-bold italic text-white shadow-chip transition hover:opacity-90 lg:block"
              >
                VIP 升级会员
              </Link>

              {user?.email ? <NotificationBell /> : null}

              <ThemeToggle className="flex h-9 w-9 items-center justify-center rounded-full text-ink-secondary transition hover:bg-brand-50 hover:text-brand-600" />

              {user?.email ? (
                <AccountMenu email={user.email} role="user" displayName={user.displayName} avatarUrl={user.avatarUrl} />
              ) : (
                <Link
                  href={`/signin?next=${encodeURIComponent(pathname === "/" ? "/generate" : pathname)}`}
                  className="rounded-full bg-brand-500 px-4 py-2 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
                >
                  登录
                </Link>
              )}
            </div>
          </div>
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-5 md:px-6 md:pb-10">{children}</main>
      </div>

      {/* 移动端底部导航 */}
      <nav
        className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-5 gap-1 rounded-3xl border border-line bg-panel/95 p-1.5 shadow-pop backdrop-blur-xl md:hidden"
        aria-label="移动端主导航"
        style={{ paddingBottom: "max(6px, env(safe-area-inset-bottom))" }}
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActivePath(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-1.5 text-[11px] font-bold transition active:scale-[0.97]",
                item.primary
                  ? "bg-gradient-to-br from-brand-400 to-brand-600 text-white shadow-chip"
                  : active
                    ? "bg-brand-50 text-brand-600"
                    : "text-ink-faint",
              )}
            >
              <Icon size={item.primary ? 20 : 17} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {inviteOpen ? <InviteDialog onClose={() => setInviteOpen(false)} /> : null}

      {checkinOpen ? <CheckinDialog onClose={() => setCheckinOpen(false)} /> : null}
    </div>
  );
}

function AuthShell({ children, settings }: { children: ReactNode; settings: PublicAppSettings }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-16 items-center justify-between px-5 md:px-8">
        <Brand settings={settings} />
        <Link href="/" className="rounded-full border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page">
          返回首页
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-4 pb-16 pt-4">{children}</main>
    </div>
  );
}
