import { getAppErrorMessage } from "@/lib/app-error";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/auth";
import { listAdminCreditPackages, upsertCreditPackage } from "@/lib/billing";

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeNumber(value: unknown) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const packages = await listAdminCreditPackages();
    return NextResponse.json({
      ok: true,
      packages,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "读取套餐失败"),
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ ok: false, error: "请先登录管理员账号。" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const pkg = await upsertCreditPackage({
      id: normalizeString(body.id) || undefined,
      name: normalizeString(body.name),
      description: normalizeString(body.description) || null,
      credits: normalizeNumber(body.credits),
      bonusCredits: normalizeNumber(body.bonusCredits),
      priceCents: Math.round(normalizeNumber(body.priceYuan) * 100 || normalizeNumber(body.priceCents)),
      currency: normalizeString(body.currency) || "CNY",
      packageType: normalizeString(body.packageType) || "RECHARGE",
      durationDays: normalizeNumber(body.durationDays),
      sortOrder: normalizeNumber(body.sortOrder),
      isActive: body.isActive === false ? false : true,
    });

    return NextResponse.json({
      ok: true,
      package: pkg,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: getAppErrorMessage(error, "保存套餐失败"),
      },
      {
        status: 400,
      },
    );
  }
}
