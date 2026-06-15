import type { Metadata } from "next";
import type { ReactNode } from "react";
import "tdesign-react/es/style/index.css";
import "./globals.css";
import { AppShell } from "@/components/app-shell";
import { getPublicAppSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getPublicAppSettings();

  return {
    title: settings.browserTitle,
    description: settings.siteSubtitle
  };
}

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const settings = await getPublicAppSettings();

  return (
    <html lang="zh-CN">
      <body>
        <AppShell settings={settings}>{children}</AppShell>
      </body>
    </html>
  );
}
