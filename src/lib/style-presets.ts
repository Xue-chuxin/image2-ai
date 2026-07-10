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

export type BatchStyleTask = {
  presetId: string;
  presetName: string;
  promptZh: string;
  negativePrompt: string;
};

/**
 * 批量多风格生成：根据基础描述 + 选中的风格预设，构造「每个风格一个」的生成任务载荷。
 * 正向后缀以「，」追加到描述末尾，负向后缀并入负向词；后缀为空时保持基础文本。纯函数，便于单测。
 */
export function buildBatchStyleTasks(
  basePrompt: string,
  baseNegative: string,
  presets: Pick<StylePresetView, "id" | "name" | "promptSuffix" | "negativeSuffix">[],
): BatchStyleTask[] {
  const trimmedPrompt = (basePrompt || "").trim();
  const trimmedNegative = (baseNegative || "").trim();

  return presets.map((preset) => {
    const suffix = (preset.promptSuffix || "").trim();
    const promptZh = suffix ? (trimmedPrompt ? `${trimmedPrompt}，${suffix}` : suffix) : trimmedPrompt;

    const negativeSuffix = (preset.negativeSuffix || "").trim();
    const negativePrompt = negativeSuffix
      ? trimmedNegative
        ? `${trimmedNegative}，${negativeSuffix}`
        : negativeSuffix
      : trimmedNegative;

    return { presetId: preset.id, presetName: preset.name, promptZh, negativePrompt };
  });
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
