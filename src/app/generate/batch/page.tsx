import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { BatchStyleGenerator } from "@/components/batch-style-generator";
import { getUserSession } from "@/lib/auth";
import { listActiveStylePresets, type StylePresetView } from "@/lib/style-presets";

export const dynamic = "force-dynamic";

export default async function BatchGeneratePage() {
  const session = await getUserSession();

  if (!session) {
    return (
      <main className="mx-auto w-full max-w-[1200px]">
        <div className="flex justify-center py-10 md:py-16">
          <div className="w-full max-w-md rounded-2xl border border-line bg-panel p-8 text-center shadow-card">
            <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-500">
              <LockKeyhole className="h-6 w-6" />
            </span>
            <h1 className="mt-4 text-lg font-bold text-ink">请先登录</h1>
            <p className="mt-2 text-sm leading-6 text-ink-secondary">批量多风格生成需要登录后使用，并会按所选风格数量消耗生成额度。</p>
            <Link
              href="/signin?next=/generate/batch"
              className="mt-5 inline-flex items-center justify-center rounded-xl bg-brand-500 px-5 py-2.5 text-sm font-bold text-white shadow-chip transition hover:bg-brand-600"
            >
              去登录
            </Link>
          </div>
        </div>
      </main>
    );
  }

  let stylePresets: StylePresetView[] = [];
  try {
    stylePresets = await listActiveStylePresets();
  } catch {
    stylePresets = [];
  }

  return (
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <section className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-ink">批量多风格生成</h1>
          <p className="text-sm leading-6 text-ink-secondary">一段描述，一次性套用多个风格分别出图，快速对比不同风格的效果。</p>
        </div>
        <Link
          href="/generate"
          className="inline-flex items-center rounded-xl border border-line bg-panel px-4 py-2 text-sm font-semibold text-ink-secondary transition hover:bg-page"
        >
          单张创作
        </Link>
      </section>
      <BatchStyleGenerator stylePresets={stylePresets} />
    </main>
  );
}
