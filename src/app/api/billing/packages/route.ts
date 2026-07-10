import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { listActiveCreditPackages } from "@/lib/billing";

export async function GET() {
  try {
    const packages = await listActiveCreditPackages();
    return NextResponse.json({
      ok: true,
      packages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取积分套餐失败"),
      },
      {
        status: 500,
      },
    );
  }
}
