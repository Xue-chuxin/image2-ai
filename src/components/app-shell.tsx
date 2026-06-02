"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Clock3, Home, ImagePlus, Library, Palette, UserRound } from "lucide-react";
import { clsx } from "clsx";

const navItems = [
  { href: "/", label: "首页", icon: Home },
  { href: "/prompts", label: "灵感", icon: Library },
  { href: "/generate", label: "创作", icon: ImagePlus, primary: true },
  { href: "/history", label: "记录", icon: Clock3 },
  { href: "/signin", label: "账户", icon: UserRound }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="liquid-glass sticky inset-x-0 top-0 z-40 w-full border-b border-white/60 px-4 py-3 md:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-ocean-700 shadow-card">
              <Palette className="h-5 w-5" />
            </div>
            <div>
              <p className="text-base font-black leading-none tracking-tight text-slate-950">造图台</p>
              <p className="mt-1 text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Image Studio</p>
            </div>
          </Link>

          <nav className="hidden items-center gap-1 rounded-2xl border border-slate-200 bg-white/80 p-1 md:flex">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition duration-200",
                    active ? "bg-slate-950 text-white shadow-card" : "text-slate-500 hover:bg-slate-50 hover:text-slate-950",
                    item.primary && !active && "bg-ocean-50 text-ocean-800 hover:bg-ocean-100 hover:text-ocean-900"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-500 sm:flex">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              草稿箱
            </div>
            <Link href="/signin" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-xs font-black text-slate-700 shadow-card">
              登录
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex min-h-[calc(100vh-4.75rem)] max-w-7xl flex-col px-3 py-4 md:px-6">
        <div className="liquid-glass relative flex-1 overflow-hidden rounded-[34px] p-3 md:p-5">
          <div className="liquid-mask" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-28 rounded-full bg-white/40 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-20 h-72 w-72 rounded-full bg-blue-100/40 blur-3xl" />
          <div className="relative">
            <div className="liquid-glass mb-4 hidden items-center justify-between rounded-[22px] px-4 py-3 md:flex">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-slate-400">Workspace</p>
                <p className="mt-1 text-sm font-black text-slate-950">图片创作工作区</p>
              </div>
              <div className="flex items-center gap-2 text-xs font-black text-slate-500">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                自动保存
              </div>
            </div>
            {children}
          </div>
        </div>

        <nav className="liquid-glass fixed inset-x-3 bottom-3 z-50 mx-auto max-w-md rounded-[26px] px-3 py-2 md:hidden">
          <div className="grid grid-cols-5 items-center gap-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={clsx(
                    "flex flex-col items-center justify-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-bold transition",
                    item.primary && "-mt-7 h-16 rounded-[22px] bg-slate-950 text-white shadow-card",
                    !item.primary && active && "bg-ocean-50 text-ocean-800",
                    !item.primary && !active && "text-slate-400"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
