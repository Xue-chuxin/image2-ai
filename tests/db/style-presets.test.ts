import { describe, expect, it } from "vitest";

import { listActiveStylePresets } from "@/lib/style-presets";

import { createStylePreset } from "./helpers";

const hasDb = Boolean(process.env.DATABASE_URL_TEST);

describe.skipIf(!hasDb)("style-presets DB 集成", () => {
  it("只返回启用中的预设，按 sortOrder 升序", async () => {
    await createStylePreset({ name: "停用", isActive: false, sortOrder: 0 });
    await createStylePreset({ name: "后", sortOrder: 20 });
    await createStylePreset({ name: "先", sortOrder: 10 });

    const list = await listActiveStylePresets();
    expect(list.map((p) => p.name)).toEqual(["先", "后"]);
  });

  it("返回视图字段（含正/负向后缀），无预设时为空数组", async () => {
    expect(await listActiveStylePresets()).toEqual([]);

    await createStylePreset({
      name: "赛博",
      promptSuffix: "赛博朋克风格",
      negativeSuffix: "模糊",
    });

    const [preset] = await listActiveStylePresets();
    expect(preset).toMatchObject({
      name: "赛博",
      promptSuffix: "赛博朋克风格",
      negativeSuffix: "模糊",
    });
    expect(typeof preset.id).toBe("string");
  });
});
