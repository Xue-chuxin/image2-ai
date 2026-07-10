import { describe, expect, it } from "vitest";

import { toHistoryCsv, toHistoryJson, type HistoryExportRow } from "@/lib/history-export";

function makeRow(overrides: Partial<HistoryExportRow> = {}): HistoryExportRow {
  return {
    id: "job_1",
    status: "COMPLETED",
    provider: "openai",
    promptZh: "一只猫",
    promptEn: "a cat",
    negativePrompt: "",
    ratio: "1:1",
    quality: "standard",
    imageCount: 1,
    creditCost: 10,
    errorMessage: "",
    createdAt: "2026-07-10T00:00:00.000Z",
    imageUrls: "https://a/1.png",
    ...overrides,
  };
}

describe("toHistoryCsv", () => {
  it("以 UTF-8 BOM 开头并包含中文表头", () => {
    const csv = toHistoryCsv([]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("任务ID");
    expect(csv).toContain("图片地址");
  });

  it("含逗号/引号/换行的字段被正确转义包裹", () => {
    const csv = toHistoryCsv([
      makeRow({ promptZh: '带,逗号"引号\n换行', imageUrls: "https://a/1.png | https://a/2.png" }),
    ]);
    // 逗号/引号/换行触发双引号包裹，内部引号翻倍
    expect(csv).toContain('"带,逗号""引号\n换行"');
    // 普通字段不加引号
    expect(csv).toContain("job_1");
  });

  it("每行以 CRLF 分隔，行数为表头+数据行", () => {
    const csv = toHistoryCsv([makeRow(), makeRow({ id: "job_2" })]);
    const rows = csv.split("\r\n");
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain("job_1");
    expect(rows[2]).toContain("job_2");
  });
});

describe("toHistoryJson", () => {
  it("返回可解析的格式化 JSON，字段与行一致", () => {
    const rows = [makeRow(), makeRow({ id: "job_2", status: "FAILED", errorMessage: "boom" })];
    const parsed = JSON.parse(toHistoryJson(rows)) as HistoryExportRow[];
    expect(parsed).toHaveLength(2);
    expect(parsed[1]).toMatchObject({ id: "job_2", status: "FAILED", errorMessage: "boom" });
  });
});
