import type { Metadata } from "next";
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

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const settings = await getPublicAppSettings();

  return (
    <html lang="zh-CN">
      <body>
        <AppShell settings={settings}>{children}</AppShell>
      </body>
    </html>
  );
}
