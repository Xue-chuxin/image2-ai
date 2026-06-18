import type { Metadata } from "next";
import type { ReactNode } from "react";
import "tdesign-react/es/style/index.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getUserSession } from "@/lib/auth";
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

  return (
    <html lang="zh-CN">
      <body>
        <AppShell
          settings={settings}
          user={userSession ? { email: userSession.email } : null}
        >
          {children}
        </AppShell>
      </body>
    </html>
  );
}
