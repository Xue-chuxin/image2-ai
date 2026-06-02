import { NextResponse } from "next/server";

import { clearAdminSessionCookie, clearUserSessionCookie } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  clearUserSessionCookie(response);
  return response;
}
