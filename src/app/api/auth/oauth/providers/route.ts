import { NextResponse } from "next/server";

import { listEnabledOAuthProviders } from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const providers = await listEnabledOAuthProviders();
    return NextResponse.json({ ok: true, providers }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: true, providers: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
