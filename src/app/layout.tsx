import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { AppShell, type ShellUser } from "@/components/app-shell";
import { getUserSession } from "@/lib/auth";
import { getUserCreditBalance } from "@/lib/credits";
import { prisma } from "@/lib/db";
import { getPublicAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();

  return {
    title: settings.browserTitle,
    description: settings.siteSubtitle,
    icons: {
      icon: settings.siteFaviconUrl,
      shortcut: settings.siteFaviconUrl,
      apple: settings.siteLogoUrl,
    },
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const [settings, userSession] = await Promise.all([getPublicAppSettings(), getUserSession()]);

  let user: ShellUser | null = null;
  if (userSession) {
    user = { email: userSession.email };
    try {
      const [balance, profile] = await Promise.all([
        getUserCreditBalance(userSession.userId),
        prisma.user.findUnique({
          where: { id: userSession.userId },
          select: { displayName: true, avatarUrl: true },
        }),
      ]);
      user.credits = balance.available;
      user.displayName = profile?.displayName ?? null;
      user.avatarUrl = profile?.avatarUrl ?? null;
    } catch {
      // 数据库暂不可用时仍允许页面渲染，仅不显示积分数字。
    }
  }

  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <head>
        {/* 在样式应用前根据本地偏好设置暗色 class，避免明暗闪烁（FOUC）。 */}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");var d=t==="dark"||((!t||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d)document.documentElement.classList.add("dark");}catch(e){}})();`,
          }}
        />
      </head>
      <body>
        <AppShell settings={settings} user={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
