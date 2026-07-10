import { prisma } from "@/lib/db";

export type StylePresetView = {
  id: string;
  name: string;
  description: string | null;
  promptSuffix: string;
  negativeSuffix: string | null;
  coverUrl: string | null;
};

function toView(preset: {
  id: string;
  name: string;
  description: string | null;
  promptSuffix: string;
  negativeSuffix: string | null;
  coverUrl: string | null;
}): StylePresetView {
  return {
    id: preset.id,
    name: preset.name,
    description: preset.description,
    promptSuffix: preset.promptSuffix,
    negativeSuffix: preset.negativeSuffix,
    coverUrl: preset.coverUrl,
  };
}

/** 启用中的风格预设列表（按 sortOrder 升序，其次创建时间），供创作页一键套用。 */
export async function listActiveStylePresets(): Promise<StylePresetView[]> {
  const presets = await prisma.stylePreset.findMany({
    where: { isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      description: true,
      promptSuffix: true,
      negativeSuffix: true,
      coverUrl: true,
    },
  });
  return presets.map(toView);
}
