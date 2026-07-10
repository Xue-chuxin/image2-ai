import { NextResponse } from "next/server";

import { getSessionCookieOptions, setUserSessionCookie } from "@/lib/auth";
import { AppError } from "@/lib/app-error";
import {
  OAUTH_LINK_COOKIE,
  OAUTH_STATE_COOKIE,
  bindOAuthAccountToUser,
  buildOAuthRedirectUri,
  fetchOAuthProfile,
  findOrCreateOAuthUser,
  isOAuthProvider,
  resolveOAuthBaseUrl,
  verifyOAuthLinkToken,
  verifyOAuthState,
} from "@/lib/oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SUCCESS_PATH = "/generate";
const PROFILE_PATH = "/console/#/account/profile";

function clearOAuthCookies(response: NextResponse, request: Request) {
  response.cookies.set(OAUTH_STATE_COOKIE, "", getSessionCookieOptions(request, 0));
  response.cookies.set(OAUTH_LINK_COOKIE, "", getSessionCookieOptions(request, 0));
}

function redirectWithError(baseUrl: string, message: string, request: Request) {
  const response = NextResponse.redirect(`${baseUrl}/signin?oauth_error=${encodeURIComponent(message)}`);
  clearOAuthCookies(response, request);
  return response;
}

function redirectToProfile(baseUrl: string, query: string, request: Request) {
  const response = NextResponse.redirect(`${baseUrl}${PROFILE_PATH}?${query}`);
  clearOAuthCookies(response, request);
  return response;
}

export async function GET(request: Request, { params }: { params: Promise<{ provider: string }> }) {
  const { provider } = await params;
  const baseUrl = resolveOAuthBaseUrl(request);

  if (!isOAuthProvider(provider)) {
    return redirectWithError(baseUrl, "不支持的登录方式。", request);
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const providerError = url.searchParams.get("error");

  if (providerError) {
    return redirectWithError(baseUrl, "第三方登录被取消或失败。", request);
  }

  if (!code || !state) {
    return redirectWithError(baseUrl, "登录回调参数缺失。", request);
  }

  const { cookies } = await import("next/headers");
  const cookieStore = await cookies();
  const stateCookie = cookieStore.get(OAUTH_STATE_COOKIE)?.value;
  const linkCookie = cookieStore.get(OAUTH_LINK_COOKIE)?.value;
  const isLinkMode = Boolean(linkCookie);

  // 双重校验：cookie 中的 state 必须与回调 state 一致，且签名/时效有效（防 CSRF）。
  if (!stateCookie || stateCookie !== state || !verifyOAuthState(state, provider)) {
    return isLinkMode
      ? redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent("绑定状态校验失败，请重试。")}`, request)
      : redirectWithError(baseUrl, "登录状态校验失败，请重试。", request);
  }

  // 绑定流程：把第三方账号绑定到发起绑定的当前用户，而不是登录。
  if (isLinkMode) {
    const boundUserId = verifyOAuthLinkToken(linkCookie, provider);
    if (!boundUserId) {
      return redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent("绑定已过期，请重新发起。")}`, request);
    }
    try {
      const redirectUri = buildOAuthRedirectUri(baseUrl, provider);
      const profile = await fetchOAuthProfile(provider, code, redirectUri);
      await bindOAuthAccountToUser(boundUserId, provider, profile);
      return redirectToProfile(baseUrl, "oauth_link=success", request);
    } catch (error) {
      const message = error instanceof AppError ? error.message : "绑定失败，请稍后再试。";
      return redirectToProfile(baseUrl, `oauth_link_error=${encodeURIComponent(message)}`, request);
    }
  }

  try {
    const redirectUri = buildOAuthRedirectUri(baseUrl, provider);
    const profile = await fetchOAuthProfile(provider, code, redirectUri);
    const user = await findOrCreateOAuthUser(provider, profile);

    const response = NextResponse.redirect(`${baseUrl}${SUCCESS_PATH}`);
    clearOAuthCookies(response, request);
    setUserSessionCookie(response, { id: user.id, email: user.email || "" }, request);
    return response;
  } catch (error) {
    const message = error instanceof AppError ? error.message : "第三方登录失败，请稍后再试。";
    return redirectWithError(baseUrl, message, request);
  }
}
