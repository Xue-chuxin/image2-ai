import { GenerateWorkbench } from "@/components/generate-workbench";
import { getPublicAppSettings } from "@/lib/settings";
import { listActiveStylePresets, type StylePresetView } from "@/lib/style-presets";

const validRatios = new Set(["1:1", "3:4", "16:9", "9:16"]);
const validQualities = new Set(["standard", "high", "low"]);
const validImageCounts = new Set([1, 2, 4]);

function toArray(value?: string | string[]) {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function firstValue(value?: string | string[]) {
  if (Array.isArray(value)) {
    return value[0] || "";
  }

  return value || "";
}

export default async function GeneratePage({
  searchParams,
}: {
  searchParams?: Promise<{
    prompt?: string | string[];
    promptEn?: string | string[];
    negativePrompt?: string | string[];
    ratio?: string | string[];
    quality?: string | string[];
    imageCount?: string | string[];
    referenceImageIds?: string | string[];
    referenceImageUrls?: string | string[];
  }>;
}) {
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const publicSettings = await getPublicAppSettings();

  let stylePresets: StylePresetView[] = [];
  try {
    stylePresets = await listActiveStylePresets();
  } catch {
    stylePresets = [];
  }
  const initialPrompt = firstValue(resolvedSearchParams.prompt);
  const initialPromptEn = firstValue(resolvedSearchParams.promptEn);
  const initialNegativePrompt = firstValue(resolvedSearchParams.negativePrompt);

  const ratioParam = firstValue(resolvedSearchParams.ratio);
  const qualityParam = firstValue(resolvedSearchParams.quality);
  const imageCountParam = Number.parseInt(firstValue(resolvedSearchParams.imageCount), 10);
  const initialRatio = validRatios.has(ratioParam) ? ratioParam : "1:1";
  const initialQuality = validQualities.has(qualityParam) ? qualityParam : "standard";
  const initialImageCount = validImageCounts.has(imageCountParam) ? imageCountParam : 1;

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
    <main className="mx-auto w-full max-w-[1200px] space-y-5">
      <GenerateWorkbench
        initialPrompt={initialPrompt}
        initialPromptEn={initialPromptEn}
        initialNegativePrompt={initialNegativePrompt}
        initialRatio={initialRatio}
        initialQuality={initialQuality}
        initialImageCount={initialImageCount}
        initialReferenceImages={initialReferenceImages.filter((image) => image.id)}
        referenceImagesEnabled={publicSettings.referenceImagesEnabled}
        stylePresets={stylePresets}
      />
    </main>
  );
}
