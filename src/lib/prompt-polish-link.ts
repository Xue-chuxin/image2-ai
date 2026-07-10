const VALID_RATIOS = new Set(["1:1", "3:4", "16:9", "9:16"]);

export type PolishGenerateFields = {
  promptZh?: string;
  promptEn?: string;
  negativePrompt?: string;
  recommendedRatio?: string;
};

/**
 * 把润色结果转成「去创作」链接。仅带上非空字段，比例仅当落在 /generate 支持的取值内才带上，
 * 其余交给创作页的默认值处理。
 */
export function buildPolishGenerateHref(fields: PolishGenerateFields): string {
  const params = new URLSearchParams();
  const promptZh = (fields.promptZh || "").trim();
  const promptEn = (fields.promptEn || "").trim();
  const negativePrompt = (fields.negativePrompt || "").trim();
  const ratio = (fields.recommendedRatio || "").trim();

  if (promptZh) {
    params.set("prompt", promptZh);
  }
  if (promptEn) {
    params.set("promptEn", promptEn);
  }
  if (negativePrompt) {
    params.set("negativePrompt", negativePrompt);
  }
  if (VALID_RATIOS.has(ratio)) {
    params.set("ratio", ratio);
  }

  const query = params.toString();
  return query ? `/generate?${query}` : "/generate";
}
