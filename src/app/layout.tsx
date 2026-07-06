import type { Metadata } from "next";
import type { ReactNode } from "react";
import "tdesign-react/es/style/index.css";
import "./globals.css";
import "./admin-legacy.css";
import { AppShell, type ShellUser } from "@/components/app-shell";
import { getUserSession } from "@/lib/auth";
import { getUserCreditBalance } from "@/lib/credits";
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
      const balance = await getUserCreditBalance(userSession.userId);
      user.credits = balance.available;
    } catch {
      // 数据库暂不可用时仍允许页面渲染，仅不显示积分数字。
    }
  }

  return (
    <html lang="zh-CN">
      <body>
        <AppShell settings={settings} user={user}>
          {children}
        </AppShell>
      </body>
    </html>
  );
}
