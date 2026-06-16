import { NextResponse } from "next/server";

import { clearAdminSessionCookie, clearUserSessionCookie } from "@/lib/auth";

export async function POST(request: Request) {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response, request);
  clearUserSessionCookie(response, request);
  return response;
}
