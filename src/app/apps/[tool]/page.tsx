import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { TextToolStudio } from "@/components/text-tool-studio";
import { getTextTool, toTextToolClientView, TEXT_TOOLS } from "@/lib/text-tools";

export const dynamic = "force-dynamic";

export function generateStaticParams() {
  return TEXT_TOOLS.map((tool) => ({ tool: tool.slug }));
}

export default async function TextToolPage({ params }: { params: Promise<{ tool: string }> }) {
  const { tool: slug } = await params;
  const tool = getTextTool(slug);
  if (!tool) {
    notFound();
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink">{tool.name}</h1>
          <p className="text-sm leading-6 text-ink-secondary">{tool.description}</p>
        </div>
        <Link
          href="/apps"
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
        >
          <ArrowLeft size={15} />
          应用中心
        </Link>
      </section>
      <TextToolStudio tool={toTextToolClientView(tool)} />
    </main>
  );
}
