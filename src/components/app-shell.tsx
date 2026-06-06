"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Home, ImagePlus, Library, Palette, Settings, UserRound } from "lucide-react";
import { clsx } from "clsx";
import type { PublicAppSettings } from "@/lib/settings";

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

export function AppShell({ children, settings }: { children: React.ReactNode; settings: PublicAppSettings }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky inset-x-0 top-0 z-40 w-full border-b border-slate-200/70 bg-[#f8fafc]/88 px-4 py-3 backdrop-blur-xl md:px-8">
        <div className="mx-auto max-w-[1380px]">
          <div className="flex items-center justify-between gap-4">
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[15px] border border-slate-200 bg-white text-[#254c73] shadow-card transition duration-200 group-hover:-translate-y-0.5">
                <Palette className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-black leading-none tracking-[-0.04em] text-slate-950">{settings.siteTitle}</p>
                <p className="mt-1 truncate text-[11px] font-bold uppercase tracking-[0.16em] text-slate-400">{settings.siteSubtitle}</p>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 rounded-[18px] border border-slate-200 bg-white/76 p-1 shadow-card md:flex">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isActivePath(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "inline-flex min-h-10 items-center gap-2 rounded-[14px] px-4 py-2 text-sm font-black transition duration-200 focus:outline-none focus:ring-4 focus:ring-slate-200",
                      active ? "bg-slate-950 text-white shadow-card" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                      item.primary && !active && "bg-[#edf4fa] text-[#254c73] hover:bg-[#e4edf6]",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex shrink-0 items-center gap-2">
              <Link
                href="/admin/users"
                className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 shadow-card transition hover:-translate-y-0.5 hover:text-slate-950 sm:flex"
              >
                <Settings className="h-3.5 w-3.5" />
                后台
              </Link>
              <Link href="/signin" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-card transition hover:-translate-y-0.5 hover:text-slate-950">
                登录
              </Link>
            </div>
          </div>

          <nav className="mt-3 grid grid-cols-5 gap-1 rounded-[20px] border border-slate-200/80 bg-white/82 p-1 shadow-card backdrop-blur-xl md:hidden" aria-label="移动端主导航">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = isActivePath(pathname, item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex min-h-12 flex-col items-center justify-center gap-1 rounded-[16px] px-1 py-2 text-[11px] font-bold transition duration-200 active:scale-[0.98]",
                    active ? "bg-slate-950 text-white shadow-card" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                    item.primary && !active && "bg-[#edf4fa] text-[#254c73] hover:bg-[#e4edf6]",
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100dvh-4.25rem)] max-w-[1380px] flex-col px-3 pb-10 pt-4 md:px-6 md:pb-8">
        <div className="relative flex-1 overflow-visible rounded-[34px] border border-slate-200/80 bg-white/54 p-3 shadow-[0_28px_90px_rgba(31,49,70,0.08)] backdrop-blur-xl md:p-5">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-24 rounded-full bg-white/50 blur-3xl" />
          <div className="relative">
            <div className="mb-4 hidden items-center justify-between rounded-[22px] border border-slate-200/70 bg-white/78 px-4 py-3 shadow-card md:flex">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Studio desk</p>
                <p className="mt-1 text-sm font-black text-slate-950">一个安静的图片创作工作台</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                本地保存
              </div>
            </div>
            {children}
          </div>
        </div>

      </div>
    </div>
  );
}
