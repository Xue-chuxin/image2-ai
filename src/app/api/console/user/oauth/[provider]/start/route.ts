import { NextResponse } from "next/server";

import { getSessionCookieOptions, getUserSession } from "@/lib/auth";
import {
  OAUTH_LINK_COOKIE,
  OAUTH_STATE_COOKIE,
  buildAuthorizeUrl,
  buildOAuthRedirectUri,
  createOAuthLinkToken,
  createOAuthState,
  isOAuthProvider,
  resolveOAuthBaseUrl,
} from "@/lib/oauth";
import { getOAuthRuntimeConfig } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const OAUTH_TTL_SECONDS = 10 * 60;
const PROFILE_PATH = "/console/#/account/profile";

function redirectToProfile(baseUrl: string, query: string) {
  return NextResponse.redirect(`${baseUrl}${PROFILE_PATH}?${query}`);
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const baseUrl = resolveOAuthBaseUrl(request);

  if (!isOAuthProvider(provider)) {
    return redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent("不支持的登录方式。")}`);
  }

  // 绑定仅面向已登录的普通用户；管理员账号不支持第三方登录。
  const session = await getUserSession();
  if (!session) {
    return redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent("请先登录普通用户账号再绑定。")}`);
  }

  const runtime = await getOAuthRuntimeConfig();
  const config = runtime[provider];
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    return redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent("该第三方登录尚未开放。")}`);
  }

  const state = createOAuthState(provider);
  const linkToken = createOAuthLinkToken(session.userId, provider);
  const redirectUri = buildOAuthRedirectUri(baseUrl, provider);
  const authorizeUrl = buildAuthorizeUrl(provider, config, redirectUri, state);

  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set(OAUTH_STATE_COOKIE, state, getSessionCookieOptions(request, OAUTH_TTL_SECONDS));
  response.cookies.set(OAUTH_LINK_COOKIE, linkToken, getSessionCookieOptions(request, OAUTH_TTL_SECONDS));
  return response;
}
