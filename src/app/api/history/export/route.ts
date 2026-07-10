import { NextResponse } from "next/server";

import { getAppErrorMessage } from "@/lib/app-error";
import { getUserSession } from "@/lib/auth";
import { getHistoryExportRows, toHistoryCsv, toHistoryJson } from "@/lib/history-export";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const session = await getUserSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录。" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const format = searchParams.get("format") === "json" ? "json" : "csv";

  try {
    const rows = await getHistoryExportRows(session.userId);
    const stamp = new Date().toISOString().slice(0, 10);

    if (format === "json") {
      return new NextResponse(toHistoryJson(rows), {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Content-Disposition": `attachment; filename="history-${stamp}.json"`,
        },
      });
    }

    return new NextResponse(toHistoryCsv(rows), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="history-${stamp}.csv"`,
      },
    });
  } catch (error) {
    return NextResponse.json({ ok: false, error: getAppErrorMessage(error, "导出失败。") }, { status: 500 });
  }
}
