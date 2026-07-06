"use client";

import { useEffect, useState } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

type ThemePref = "light" | "dark" | "system";

const order: ThemePref[] = ["light", "dark", "system"];

function prefersDark() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(pref: ThemePref) {
  const dark = pref === "dark" || (pref === "system" && prefersDark());
  document.documentElement.classList.toggle("dark", dark);
}

export function ThemeToggle({ className }: { className?: string }) {
  const [pref, setPref] = useState<ThemePref>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = (localStorage.getItem("theme") as ThemePref | null) || "system";
    setPref(stored);
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) {
      return;
    }
    applyTheme(pref);
    localStorage.setItem("theme", pref);

    if (pref !== "system") {
      return;
    }
    // 跟随系统时，监听系统主题变化实时切换。
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => applyTheme("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [pref, mounted]);

  function cycle() {
    setPref((current) => order[(order.indexOf(current) + 1) % order.length]);
  }

  const meta =
    pref === "light"
      ? { Icon: Sun, label: "浅色模式" }
      : pref === "dark"
        ? { Icon: Moon, label: "暗色模式" }
        : { Icon: Monitor, label: "跟随系统" };
  const Icon = meta.Icon;

  return (
    <button
      type="button"
      onClick={cycle}
      aria-label={`主题：${meta.label}（点击切换）`}
      title={`主题：${meta.label}`}
      className={className}
      suppressHydrationWarning
    >
      {mounted ? <Icon size={17} /> : <Monitor size={17} />}
    </button>
  );
}
