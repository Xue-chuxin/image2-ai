"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Home, ImagePlus, Library, Palette, UserRound } from "lucide-react";
import { clsx } from "clsx";
import type { ReactElement, ReactNode } from "react";
import { Layout, Menu, Tag } from "tdesign-react";
import {
  AiImageIcon,
  BrowseGalleryIcon,
  HistoryIcon,
  HomeIcon,
  ImageEditIcon,
  UserIcon,
} from "tdesign-icons-react";
import type { PublicAppSettings } from "@/lib/settings";
import { AccountMenu } from "@/components/account-menu";
import { GlassSurface, GooeyNav, ShapeGrid } from "@/components/front/react-bits";

const { Aside, Content, Header } = Layout;
const { MenuItem } = Menu;

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/prompts", label: "灵感", icon: Library },
  { href: "/generate", label: "创作", icon: ImagePlus, primary: true },
  { href: "/history", label: "记录", icon: Clock3 },
  { href: "/account", label: "账户", icon: UserRound },
];

const tdesignNavItems: Array<{
  href: string;
  label: string;
  icon: ReactElement;
}> = [
  { href: "/", label: "首页", icon: <HomeIcon /> },
  { href: "/generate", label: "创作", icon: <ImageEditIcon /> },
  { href: "/prompts", label: "灵感", icon: <BrowseGalleryIcon /> },
  { href: "/history", label: "记录", icon: <HistoryIcon /> },
  { href: "/account", label: "账户", icon: <UserIcon /> },
];

const pageMeta: Record<string, { title: string; description: string }> = {
  "/": { title: "产品首页", description: "了解产品能力、适用场景和公开作品展示。" },
  "/generate": { title: "创作", description: "完整生成流程、任务进度和结果预览。" },
  "/prompts": { title: "灵感", description: "浏览公开作品和运营精选，复用描述继续创作。" },
  "/history": { title: "记录", description: "查看当前账号的生图任务、结果和失败原因。" },
  "/account": { title: "账户", description: "查看积分余额、充值套餐和订单状态。" },
  "/signin": { title: "账号登录", description: "登录普通用户账号，或进入管理员后台。" },
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
  user?: { email: string } | null;
}) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

  if (settings.frontTemplate === "glass_app") {
    return <GlassAppShell settings={settings} user={user} pathname={pathname}>{children}</GlassAppShell>;
  }

  if (pathname === "/") {
    return <TDesignMarketingShell settings={settings} user={user}>{children}</TDesignMarketingShell>;
  }

  if (pathname.startsWith("/signin")) {
    return <TDesignAuthShell settings={settings}>{children}</TDesignAuthShell>;
  }

  return <TDesignWorkspaceShell settings={settings} user={user} pathname={pathname}>{children}</TDesignWorkspaceShell>;
}

function GlassAppShell({
  children,
  settings,
  user,
  pathname,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
  user?: { email: string } | null;
  pathname: string;
}) {
  const navLinks = navItems.map((item) => ({
    href: item.href,
    label: item.label,
    active: isActivePath(pathname, item.href),
  }));

  return (
    <div className="front-shell min-h-screen">
      <ShapeGrid className="front-shell__shape-grid" />
      <header className="front-header sticky inset-x-0 top-0 z-40 w-full px-4 py-3 md:px-8">
        <div className="mx-auto max-w-[1440px]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              <div className="front-logo-mark flex h-11 w-11 shrink-0 items-center justify-center text-[#254c73] transition duration-200 group-hover:-translate-y-0.5">
                <Palette className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black leading-none text-slate-950">{settings.siteTitle}</p>
                <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{settings.siteSubtitle}</p>
              </div>
            </Link>

            <div className="hidden md:block">
              <GooeyNav items={navLinks} />
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {user?.email ? (
                <AccountMenu email={user.email} role="user" />
              ) : (
                <Link href="/signin" className="front-login-button">
                  登录
                </Link>
              )}
            </div>
          </div>

        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-[1440px] flex-col px-3 pb-24 pt-4 md:px-6 md:pb-8">
        <GlassSurface className="front-stage flex-1 p-3 md:p-5">
          <div className="relative">
            {children}
          </div>
        </GlassSurface>

      </div>

      <MobileNav pathname={pathname} />
    </div>
  );
}

function TDesignMarketingShell({
  children,
  settings,
  user,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
  user?: { email: string } | null;
}) {
  return (
    <div className="front-site-shell">
      <header className="front-site-header">
        <div className="front-site-header-inner">
          <FrontTDesignBrand settings={settings} />
          <nav className="front-site-nav" aria-label="官网导航">
            <a href="#features">产品能力</a>
            <a href="#scenarios">适用场景</a>
            <a href="#showcase">作品展示</a>
            <Link href="/prompts">灵感库</Link>
          </nav>
          <div className="front-site-actions">
            {user?.email ? (
              <AccountMenu email={user.email} role="user" />
            ) : (
              <Link href="/signin" className="front-site-login">
                登录
              </Link>
            )}
            <Link href={user?.email ? "/generate" : "/signin?next=/generate"} className="front-site-primary">
              开始创作
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function TDesignAuthShell({
  children,
  settings,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
}) {
  return (
    <div className="front-site-shell front-site-shell--auth">
      <header className="front-site-header">
        <div className="front-site-header-inner">
          <FrontTDesignBrand settings={settings} />
          <div className="front-site-actions">
            <Link href="/" className="front-site-login">
              返回首页
            </Link>
            <Link href="/generate" className="front-site-primary">
              进入创作
            </Link>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

function TDesignWorkspaceShell({
  children,
  settings,
  user,
  pathname,
}: {
  children: ReactNode;
  settings: PublicAppSettings;
  user?: { email: string } | null;
  pathname: string;
}) {
  const activeItem = tdesignNavItems.find((item) => isActivePath(pathname, item.href));
  const metaKey = pathname.startsWith("/signin") ? "/signin" : activeItem?.href || "/";
  const meta = pageMeta[metaKey] || pageMeta["/"];

  return (
    <Layout className="front-td-shell">
      <Aside className="front-td-sider hidden md:block" width="236px">
        <Menu
          value={activeItem?.href || ""}
          className="front-td-menu"
          theme="light"
          width="236px"
          logo={<FrontTDesignBrand settings={settings} />}
          operations={<FrontTDesignOperations user={user} />}
        >
          {tdesignNavItems.map((item) => (
            <MenuItem key={item.href} value={item.href} href={item.href} icon={item.icon}>
              {item.label}
            </MenuItem>
          ))}
        </Menu>
      </Aside>
      <Layout>
        <Header className="front-td-header">
          <div className="front-td-header-inner">
            <div className="front-td-heading">
              <Tag theme="primary" variant="light">TDesign Workspace</Tag>
              <div>
                <h1>{meta.title}</h1>
                <p>{meta.description}</p>
              </div>
            </div>
            <div className="front-td-account">
              {user?.email ? (
                <AccountMenu email={user.email} role="user" />
              ) : (
                <Link href="/signin" className="front-td-login-button">
                  登录 / 注册
                </Link>
              )}
            </div>
          </div>
        </Header>
        <Content className="front-td-content">{children}</Content>
      </Layout>
      <MobileNav pathname={pathname} tdesign />
    </Layout>
  );
}

function FrontTDesignBrand({ settings }: { settings: PublicAppSettings }) {
  return (
    <Link href="/" className="front-td-brand">
      <span className="front-td-brand-mark">
        <AiImageIcon />
      </span>
      <span className="front-td-brand-copy">
        <strong>{settings.siteTitle}</strong>
        <small>{settings.siteSubtitle}</small>
      </span>
    </Link>
  );
}

function FrontTDesignOperations({ user }: { user?: { email: string } | null }) {
  return (
    <div className="front-td-menu-operations">
      <span className="front-td-status-dot" />
      <span>{user?.email ? "已登录" : "访客模式"}</span>
    </div>
  );
}

function MobileNav({ pathname, tdesign = false }: { pathname: string; tdesign?: boolean }) {
  return (
    <nav
      className={clsx(
        "fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[22px] border p-1.5 md:hidden",
        tdesign ? "front-td-mobile-nav" : "border-slate-200/80 bg-white/86 shadow-card backdrop-blur-xl",
      )}
      aria-label="移动端主导航"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const active = isActivePath(pathname, item.href);
        const isPrimary = Boolean(item.primary);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={clsx(
              "front-mobile-nav-item flex min-h-12 flex-col items-center justify-center gap-1 rounded-[17px] px-1 py-2 text-[11px] font-bold transition duration-200 active:scale-[0.98]",
              isPrimary
                ? "front-mobile-nav-item-primary text-[#174766]"
                : active
                  ? "border border-sky-100 bg-[#e9f4fc] text-[#254c73] shadow-card"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
              isPrimary && active && "front-mobile-nav-item-primary-active text-[#123b58]",
              tdesign && "front-td-mobile-nav-item",
              tdesign && active && "front-td-mobile-nav-item-active",
            )}
          >
            <Icon className={clsx(isPrimary ? "h-5 w-5" : "h-4 w-4")} />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
