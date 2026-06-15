import { GenerateWorkbench } from "@/components/generate-workbench";
import { BlurText, SpotlightCard } from "@/components/front/react-bits";

function toArray(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

export default async function GeneratePage({
  searchParams,
}: {
  searchParams?: Promise<{
    prompt?: string;
    referenceImageIds?: string | string[];
    referenceImageUrls?: string | string[];
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const initialPrompt = resolvedSearchParams.prompt || "";
  const referenceIds = toArray(resolvedSearchParams.referenceImageIds);
  const referenceUrls = toArray(resolvedSearchParams.referenceImageUrls);
  const initialReferenceImages = referenceIds.slice(0, 4).map((id, index) => ({
    id,
    url: referenceUrls[index] || "",
    thumbnailUrl: referenceUrls[index] || null,
    mimeType: "image/*",
    fileSize: 0,
    width: null,
    height: null,
  }));

  return (
    <main className="space-y-5 pb-28">
      <SpotlightCard className="p-5" spotlightColor="rgba(14, 165, 233, 0.16)">
        <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">Create</p>
        <BlurText as="h1" text="创作工作台" className="mt-2 text-3xl font-black text-slate-950" delay={0.04} />
        <p className="mt-2 text-sm leading-6 text-slate-500">
          先用 DeepSeek 整理画面描述，再提交图片生成任务。正式版首发先开放文字生图。
        </p>
      </SpotlightCard>
      <GenerateWorkbench initialPrompt={initialPrompt} initialReferenceImages={initialReferenceImages.filter((image) => image.id)} referenceImagesEnabled={false} />
    </main>
  );
}
