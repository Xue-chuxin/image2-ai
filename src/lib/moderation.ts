import { getModerationRuntimeConfig } from "@/lib/settings";

export type ModerationTextInput = {
  value?: string | null;
  label?: string;
};

export type ModerationResult =
  | {
      ok: true;
    }
  | {
      ok: false;
      message: string;
      field?: string;
    };

function normalizeForMatch(value: string) {
  return value.trim().toLocaleLowerCase();
}

function parseForbiddenWords(value: string) {
  const seen = new Set<string>();
  return value
    .split(/\r?\n/)
    .map((word) => word.trim())
    .filter(Boolean)
    .filter((word) => {
      const key = normalizeForMatch(word);
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
}

export async function checkModerationText(inputs: ModerationTextInput[]): Promise<ModerationResult> {
  const config = await getModerationRuntimeConfig();

  if (!config.enabled) {
    return { ok: true };
  }

  const forbiddenWords = parseForbiddenWords(config.forbiddenWords);
  if (!forbiddenWords.length) {
    return { ok: true };
  }

  for (const input of inputs) {
    const value = input.value?.trim();
    if (!value) {
      continue;
    }

    const normalizedValue = normalizeForMatch(value);
    const matched = forbiddenWords.some((word) => normalizedValue.includes(normalizeForMatch(word)));

    if (matched) {
      return {
        ok: false,
        message: config.blockMessage,
        field: input.label,
      };
    }
  }

  return { ok: true };
}
