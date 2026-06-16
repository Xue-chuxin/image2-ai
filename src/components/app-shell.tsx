"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Home, ImagePlus, Library, Palette, UserRound } from "lucide-react";
import { clsx } from "clsx";
import type { ReactNode } from "react";
import type { PublicAppSettings } from "@/lib/settings";
import { GlassSurface, GooeyNav, ShapeGrid } from "@/components/front/react-bits";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/prompts", label: "灵感", icon: Library },
  { href: "/generate", label: "创作", icon: ImagePlus, primary: true },
  { href: "/history", label: "记录", icon: Clock3 },
  { href: "/account", label: "账户", icon: UserRound },
];

function isActivePath(pathname: string, href: string) {
  if (href === "/") {
    return pathname === "/";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children, settings }: { children: ReactNode; settings: PublicAppSettings }) {
  const pathname = usePathname();

  if (pathname.startsWith("/admin")) {
    return <>{children}</>;
  }

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
              <Link href="/signin" className="front-login-button">
                登录
              </Link>
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

      <nav
        className="fixed inset-x-3 bottom-3 z-50 mx-auto grid max-w-md grid-cols-5 gap-1 rounded-[22px] border border-slate-200/80 bg-white/86 p-1.5 shadow-card backdrop-blur-xl md:hidden"
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
              )}
            >
              <Icon className={clsx(isPrimary ? "h-5 w-5" : "h-4 w-4")} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
