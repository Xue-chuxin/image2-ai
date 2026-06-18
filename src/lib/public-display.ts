const CHINESE_TEXT_RE = /[\u3400-\u9fff]/;

export function hasChineseText(value?: string | null) {
  return CHINESE_TEXT_RE.test(value || "");
}

export function cleanPublicChineseText(value?: string | null) {
  const clean = (value || "")
    .replace(/https?:\/\/\S+/gi, " ")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/\b(prompt|negative prompt|provider|className|function|const|let|var|return|import|export|interface|type|props)\b\s*[:：=]?/gi, " ")
    .replace(/[A-Za-z_][A-Za-z0-9_./:-]*/g, " ")
    .replace(/,/g, "，")
    .replace(/\./g, "。")
    .replace(/!/g, "！")
    .replace(/\?/g, "？")
    .replace(/:/g, "：")
    .replace(/;/g, "；")
    .replace(/[{}\[\]<>"'`$\\|]/g, " ")
    .replace(/[^\u3400-\u9fff0-9，。！？、；：（）《》“”‘’/\-\s]/g, " ")
    .replace(/\s*([，。！？、；：])\s*/g, "$1")
    .replace(/[，、；：]{2,}/g, "，")
    .replace(/[。！？]{2,}/g, "。")
    .replace(/\s+/g, " ")
    .replace(/^[，。！？、；：\s]+/g, "")
    .replace(/[，、；：\s]+$/g, "")
    .trim();

  return hasChineseText(clean) ? clean : "";
}

export function toPublicChineseText(
  candidates: Array<string | null | undefined>,
  fallback: string,
  maxLength?: number,
) {
  for (const candidate of candidates) {
    const clean = cleanPublicChineseText(candidate);
    if (clean) {
      return maxLength && clean.length > maxLength ? `${clean.slice(0, maxLength)}…` : clean;
    }
  }

  return fallback;
}

export function toPublicChineseTags(values: string[], fallbackValues: string[] = [], limit = 6) {
  const tags = [...fallbackValues, ...values]
    .map((value) => toPublicChineseText([value], "", 18))
    .filter(Boolean);

  return Array.from(new Set(tags)).slice(0, limit);
}
