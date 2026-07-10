import { describe, expect, it } from "vitest";

import { buildBatchStyleTasks } from "@/lib/style-presets";

const presets = [
  { id: "p1", name: "赛博朋克", promptSuffix: "赛博朋克霓虹风格", negativeSuffix: "低画质" },
  { id: "p2", name: "水彩", promptSuffix: "水彩插画风格", negativeSuffix: null },
];

describe("buildBatchStyleTasks", () => {
  it("为每个风格生成一条载荷，正向后缀以「，」追加、负向后缀并入", () => {
    const tasks = buildBatchStyleTasks("城市天台的少女", "多余手指", presets);
    expect(tasks).toEqual([
      { presetId: "p1", presetName: "赛博朋克", promptZh: "城市天台的少女，赛博朋克霓虹风格", negativePrompt: "多余手指，低画质" },
      { presetId: "p2", presetName: "水彩", promptZh: "城市天台的少女，水彩插画风格", negativePrompt: "多余手指" },
    ]);
  });

  it("基础负向词为空时，仅保留风格负向后缀；无负向后缀时保持为空", () => {
    const tasks = buildBatchStyleTasks("湖边小屋", "", presets);
    expect(tasks[0].negativePrompt).toBe("低画质");
    expect(tasks[1].negativePrompt).toBe("");
  });

  it("基础描述为空时，正向词退化为纯后缀；首尾空白会被裁剪", () => {
    const tasks = buildBatchStyleTasks("  ", "  ", [presets[0]]);
    expect(tasks[0].promptZh).toBe("赛博朋克霓虹风格");
    expect(tasks[0].negativePrompt).toBe("低画质");
  });

  it("空后缀风格保持基础描述不变", () => {
    const tasks = buildBatchStyleTasks("海边日落", "", [{ id: "p3", name: "原图", promptSuffix: "  ", negativeSuffix: null }]);
    expect(tasks[0].promptZh).toBe("海边日落");
  });
});
