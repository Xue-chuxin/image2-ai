import { NextResponse } from "next/server";

import { getSessionCookieOptions } from "@/lib/auth";
import {
  OAUTH_STATE_COOKIE,
  buildAuthorizeUrl,
  buildOAuthRedirectUri,
  createOAuthState,
  isOAuthProvider,
  resolveOAuthBaseUrl,
} from "@/lib/oauth";
import { getOAuthRuntimeConfig } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_STATE_TTL_SECONDS = 10 * 60;

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const baseUrl = resolveOAuthBaseUrl(request);

  if (!isOAuthProvider(provider)) {
    return NextResponse.redirect(`${baseUrl}/signin?oauth_error=${encodeURIComponent("不支持的登录方式。")}`);
  }

  const runtime = await getOAuthRuntimeConfig();
  const config = runtime[provider];
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    return NextResponse.redirect(`${baseUrl}/signin?oauth_error=${encodeURIComponent("该第三方登录尚未开放。")}`);
  }

  const state = createOAuthState(provider);
  const redirectUri = buildOAuthRedirectUri(baseUrl, provider);
  const authorizeUrl = buildAuthorizeUrl(provider, config, redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, getSessionCookieOptions(request, OAUTH_STATE_TTL_SECONDS));
  return response;
}
