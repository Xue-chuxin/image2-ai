import { prisma } from "@/lib/db";

export type HistoryExportRow = {
  id: string;
  status: string;
  provider: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  errorMessage: string;
  createdAt: string;
  imageUrls: string;
};

const EXPORT_MAX_LIMIT = 1000;

// CSV 列顺序与表头（中文表头方便直接在 Excel/表格软件中阅读）。
const CSV_COLUMNS: { key: keyof HistoryExportRow; header: string }[] = [
  { key: "id", header: "任务ID" },
  { key: "status", header: "状态" },
  { key: "provider", header: "通道" },
  { key: "promptZh", header: "中文提示词" },
  { key: "promptEn", header: "英文提示词" },
  { key: "negativePrompt", header: "负向提示词" },
  { key: "ratio", header: "比例" },
  { key: "quality", header: "质量" },
  { key: "imageCount", header: "张数" },
  { key: "creditCost", header: "积分" },
  { key: "errorMessage", header: "错误信息" },
  { key: "createdAt", header: "创建时间" },
  { key: "imageUrls", header: "图片地址" },
];

// 逗号/引号/换行的字段需用双引号包裹，内部引号转义为两个引号（RFC 4180）。
function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  if (/[",\r\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/** 序列化为 CSV 文本（带 UTF-8 BOM，避免 Excel 打开中文乱码）。 */
export function toHistoryCsv(rows: HistoryExportRow[]): string {
  const lines = [CSV_COLUMNS.map((column) => csvEscape(column.header)).join(",")];
  for (const row of rows) {
    lines.push(CSV_COLUMNS.map((column) => csvEscape(row[column.key])).join(","));
  }
  return `\uFEFF${lines.join("\r\n")}`;
}

/** 序列化为格式化 JSON 文本。 */
export function toHistoryJson(rows: HistoryExportRow[]): string {
  return JSON.stringify(rows, null, 2);
}

function toExportRow(job: {
  id: string;
  status: string;
  provider: string;
  originalInput: string;
  polishedPromptZh: string | null;
  polishedPromptEn: string | null;
  negativePrompt: string | null;
  ratio: string;
  quality: string;
  imageCount: number;
  creditCost: number;
  errorMessage: string | null;
  createdAt: Date;
  images: { url: string; isDeleted: boolean }[];
}): HistoryExportRow {
  return {
    id: job.id,
    status: job.status,
    provider: job.provider,
    promptZh: job.polishedPromptZh || job.originalInput,
    promptEn: job.polishedPromptEn ?? "",
    negativePrompt: job.negativePrompt ?? "",
    ratio: job.ratio,
    quality: job.quality,
    imageCount: job.imageCount,
    creditCost: job.creditCost,
    errorMessage: job.errorMessage ?? "",
    createdAt: job.createdAt.toISOString(),
    imageUrls: job.images
      .filter((image) => !image.isDeleted)
      .map((image) => image.url)
      .join(" | "),
  };
}

/** 取回某用户的生成历史导出行（按创建时间倒序，仅本人数据）。 */
export async function getHistoryExportRows(
  userId: string,
  { limit = EXPORT_MAX_LIMIT }: { limit?: number } = {},
): Promise<HistoryExportRow[]> {
  const cleanLimit = Math.min(Math.max(Math.floor(limit), 1), EXPORT_MAX_LIMIT);
  const jobs = await prisma.generationJob.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: cleanLimit,
    include: { images: { select: { url: true, isDeleted: true } } },
  });
  return jobs.map(toExportRow);
}
