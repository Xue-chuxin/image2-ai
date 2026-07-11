import { createHmac, randomBytes, timingSafeEqual } from "crypto";

import { AppError } from "@/lib/app-error";
import { getAuthSecret } from "@/lib/auth-secret";
import { getOAuthRuntimeConfig, type OAuthProviderName, type OAuthProviderRuntimeConfig } from "@/lib/settings";

export const OAUTH_STATE_COOKIE = "image2_oauth_state";
export const OAUTH_LINK_COOKIE = "image2_oauth_link";
const OAUTH_STATE_TTL_SECONDS = 10 * 60;
const OAUTH_LINK_TTL_SECONDS = 10 * 60;
const NEW_USER_INITIAL_CREDITS = (() => {
  const value = Number(process.env.NEW_USER_INITIAL_CREDITS || 0);
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
})();

export type OAuthProfile = {
  providerAccountId: string;
  email: string | null;
  displayName: string | null;
  avatarUrl: string | null;
};

type ProviderDefinition = {
  label: string;
  authorizeUrl: string;
  tokenUrl: string;
  scope: string;
  fetchProfile: (accessToken: string) => Promise<OAuthProfile>;
};

function normalizeEmail(email?: string | null) {
  const value = email?.trim().toLowerCase();
  return value || null;
}

async function fetchGithubProfile(accessToken: string): Promise<OAuthProfile> {
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    Accept: "application/vnd.github+json",
    "User-Agent": "image2-app",
  };

  const userResponse = await fetch("https://api.github.com/user", { headers });
  if (!userResponse.ok) {
    throw new AppError("PROVIDER_CONFIG", "读取 GitHub 用户信息失败。", 502);
  }
  const user = (await userResponse.json()) as {
    id?: number;
    login?: string;
    name?: string;
    email?: string;
    avatar_url?: string;
  };

  if (!user.id) {
    throw new AppError("PROVIDER_CONFIG", "GitHub 未返回有效用户标识。", 502);
  }

  let email = normalizeEmail(user.email);
  if (!email) {
    // 公开邮箱为空时，取主邮箱且必须已验证，避免绑定到未验证邮箱。
    const emailResponse = await fetch("https://api.github.com/user/emails", { headers });
    if (emailResponse.ok) {
      const emails = (await emailResponse.json()) as Array<{ email: string; primary: boolean; verified: boolean }>;
      const primary = emails.find((item) => item.primary && item.verified) || emails.find((item) => item.verified);
      email = normalizeEmail(primary?.email);
    }
  }

  return {
    providerAccountId: String(user.id),
    email,
    displayName: user.name || user.login || null,
    avatarUrl: user.avatar_url || null,
  };
}

async function fetchGoogleProfile(accessToken: string): Promise<OAuthProfile> {
  const response = await fetch("https://openidconnect.googleapis.com/v1/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new AppError("PROVIDER_CONFIG", "读取 Google 用户信息失败。", 502);
  }
  const profile = (await response.json()) as {
    sub?: string;
    email?: string;
    email_verified?: boolean;
    name?: string;
    picture?: string;
  };

  if (!profile.sub) {
    throw new AppError("PROVIDER_CONFIG", "Google 未返回有效用户标识。", 502);
  }

  return {
    providerAccountId: profile.sub,
    // 仅在邮箱已验证时使用，未验证则视为无邮箱（新建独立账号）。
    email: profile.email_verified ? normalizeEmail(profile.email) : null,
    displayName: profile.name || null,
    avatarUrl: profile.picture || null,
  };
}

const providers: Record<OAuthProviderName, ProviderDefinition> = {
  github: {
    label: "GitHub",
    authorizeUrl: "https://github.com/login/oauth/authorize",
    tokenUrl: "https://github.com/login/oauth/access_token",
    scope: "read:user user:email",
    fetchProfile: fetchGithubProfile,
  },
  google: {
    label: "Google",
    authorizeUrl: "https://accounts.google.com/o/oauth2/v2/auth",
    tokenUrl: "https://oauth2.googleapis.com/token",
    scope: "openid email profile",
    fetchProfile: fetchGoogleProfile,
  },
};

export function isOAuthProvider(value: string): value is OAuthProviderName {
  return value === "github" || value === "google";
}

/** 优先用 NEXT_PUBLIC_SITE_URL（部署方配置的公网地址），否则从代理头/请求推断。 */
export function resolveOAuthBaseUrl(request: Request) {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    return configured.replace(/\/+$/, "");
  }
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim() || "https";
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

export function buildOAuthRedirectUri(baseUrl: string, provider: OAuthProviderName) {
  return `${baseUrl}/api/auth/oauth/${provider}/callback`;
}

export function getOAuthProviderLabel(provider: OAuthProviderName) {
  return providers[provider].label;
}

/** state = `${nonce}.${provider}.${exp}`，用 HMAC 防篡改；同时写入 cookie 做双重校验（CSRF）。 */
export function createOAuthState(provider: OAuthProviderName) {
  const nonce = randomBytes(16).toString("hex");
  const exp = Math.floor(Date.now() / 1000) + OAUTH_STATE_TTL_SECONDS;
  const payload = `${nonce}.${provider}.${exp}`;
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

export function verifyOAuthState(value: string | undefined, expectedProvider: OAuthProviderName) {
  if (!value) {
    return false;
  }
  const parts = value.split(".");
  if (parts.length !== 4) {
    return false;
  }
  const [nonce, provider, expValue, signature] = parts;
  const payload = `${nonce}.${provider}.${expValue}`;
  const expected = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return false;
  }
  if (provider !== expectedProvider) {
    return false;
  }
  return Number(expValue) >= Math.floor(Date.now() / 1000);
}

/** 绑定流程令牌：`${userId}.${provider}.${exp}` + HMAC，写入 cookie 记录“为谁绑定”。 */
export function createOAuthLinkToken(userId: string, provider: OAuthProviderName) {
  const exp = Math.floor(Date.now() / 1000) + OAUTH_LINK_TTL_SECONDS;
  const payload = `${userId}.${provider}.${exp}`;
  const signature = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  return `${payload}.${signature}`;
}

/** 校验绑定令牌，成功返回 userId，失败返回 null。 */
export function verifyOAuthLinkToken(value: string | undefined, expectedProvider: OAuthProviderName): string | null {
  if (!value) {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 4) {
    return null;
  }
  const [userId, provider, expValue, signature] = parts;
  const payload = `${userId}.${provider}.${expValue}`;
  const expected = createHmac("sha256", getAuthSecret()).update(payload).digest("base64url");
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length || !timingSafeEqual(signatureBuffer, expectedBuffer)) {
    return null;
  }
  if (provider !== expectedProvider) {
    return null;
  }
  if (Number(expValue) < Math.floor(Date.now() / 1000)) {
    return null;
  }
  return userId;
}

export function buildAuthorizeUrl(
  provider: OAuthProviderName,
  config: OAuthProviderRuntimeConfig,
  redirectUri: string,
  state: string,
) {
  const definition = providers[provider];
  const url = new URL(definition.authorizeUrl);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", definition.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("response_type", "code");
  if (provider === "google") {
    url.searchParams.set("access_type", "online");
    url.searchParams.set("prompt", "select_account");
  }
  return url.toString();
}

async function exchangeCodeForToken(
  provider: OAuthProviderName,
  config: OAuthProviderRuntimeConfig,
  code: string,
  redirectUri: string,
) {
  const definition = providers[provider];
  const body = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: "authorization_code",
  });

  const response = await fetch(definition.tokenUrl, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
  });

  if (!response.ok) {
    throw new AppError("PROVIDER_CONFIG", "换取访问令牌失败。", 502);
  }

  const data = (await response.json()) as { access_token?: string; error?: string };
  if (!data.access_token) {
    throw new AppError("PROVIDER_CONFIG", "第三方未返回访问令牌。", 502);
  }
  return data.access_token;
}

export async function fetchOAuthProfile(
  provider: OAuthProviderName,
  code: string,
  redirectUri: string,
): Promise<OAuthProfile> {
  const runtime = await getOAuthRuntimeConfig();
  const config = runtime[provider];
  if (!config.enabled || !config.clientId || !config.clientSecret) {
    throw new AppError("PROVIDER_CONFIG", "该第三方登录未启用或未配置完整。", 400);
  }

  const accessToken = await exchangeCodeForToken(provider, config, code, redirectUri);
  return providers[provider].fetchProfile(accessToken);
}

function createUserId() {
  return `usr_${randomBytes(12).toString("hex")}`;
}

/**
 * 根据 OAuth 资料查找或创建用户：
 * 1) 命中 (provider, providerAccountId) → 复用已绑定账号。
 * 2) 邮箱已验证且匹配到既有用户 → 绑定到该账号。
 * 3) 否则新建普通用户（发放新用户积分）。
 * 拒绝绑定/登录到管理员账号，管理员请走后台登录。
 */
export async function findOrCreateOAuthUser(provider: OAuthProviderName, profile: OAuthProfile) {
  const { prisma } = await import("@/lib/db");

  const existingAccount = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider,
        providerAccountId: profile.providerAccountId,
      },
    },
    include: { user: true },
  });

  if (existingAccount) {
    if (existingAccount.user.role === "ADMIN") {
      throw new AppError("FORBIDDEN", "管理员账号请前往后台登录。", 403);
    }
    await prisma.user.update({ where: { id: existingAccount.userId }, data: { lastLoginAt: new Date() } });
    return existingAccount.user;
  }

  const email = profile.email;
  if (email) {
    const userByEmail = await prisma.user.findUnique({ where: { email } });
    if (userByEmail) {
      if (userByEmail.role === "ADMIN") {
        throw new AppError("FORBIDDEN", "管理员账号请前往后台登录。", 403);
      }
      await prisma.$transaction([
        prisma.oAuthAccount.create({
          data: {
            userId: userByEmail.id,
            provider,
            providerAccountId: profile.providerAccountId,
            email,
            displayName: profile.displayName,
            avatarUrl: profile.avatarUrl,
          },
        }),
        prisma.user.update({ where: { id: userByEmail.id }, data: { lastLoginAt: new Date() } }),
      ]);
      return userByEmail;
    }
  }

  const displayName = profile.displayName || email?.split("@")[0] || "新用户";
  const userId = createUserId();

  return prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        id: userId,
        email,
        displayName,
        avatarUrl: profile.avatarUrl,
        role: "USER",
        lastLoginAt: new Date(),
      },
    });

    await tx.oAuthAccount.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId: profile.providerAccountId,
        email,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      },
    });

    await tx.creditAccount.create({
      data: { userId: user.id, available: NEW_USER_INITIAL_CREDITS, frozen: 0 },
    });

    if (NEW_USER_INITIAL_CREDITS > 0) {
      await tx.creditTransaction.create({
        data: {
          userId: user.id,
          type: "GRANT",
          amount: NEW_USER_INITIAL_CREDITS,
          balance: NEW_USER_INITIAL_CREDITS,
          memo: "第三方登录新用户赠送积分",
        },
      });
    }

    return user;
  });
}

export async function listEnabledOAuthProviders() {
  const runtime = await getOAuthRuntimeConfig();
  return (Object.keys(providers) as OAuthProviderName[])
    .filter((provider) => runtime[provider].enabled && runtime[provider].clientId && runtime[provider].clientSecret)
    .map((provider) => ({ provider, label: providers[provider].label }));
}

export type OAuthBindingView = {
  provider: OAuthProviderName;
  label: string;
  email: string | null;
  displayName: string | null;
  createdAt: string;
};

/** 列出当前用户已绑定的第三方账号（仅识别受支持的 provider）。 */
export async function listUserOAuthBindings(userId: string): Promise<OAuthBindingView[]> {
  const { prisma } = await import("@/lib/db");
  const rows = await prisma.oAuthAccount.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
  });
  return rows
    .filter((row) => isOAuthProvider(row.provider))
    .map((row) => ({
      provider: row.provider as OAuthProviderName,
      label: getOAuthProviderLabel(row.provider as OAuthProviderName),
      email: row.email,
      displayName: row.displayName,
      createdAt: row.createdAt.toISOString(),
    }));
}

/**
 * 把第三方账号绑定到指定用户：
 * - 该第三方账号已被别的用户绑定 → 冲突报错。
 * - 该用户已绑定同一 provider 的其它账号 → 需先解绑，避免一个 provider 多个绑定。
 * - 已绑定到本人 → 幂等返回。
 * 拒绝为管理员账号绑定。
 */
export async function bindOAuthAccountToUser(userId: string, provider: OAuthProviderName, profile: OAuthProfile) {
  const { prisma } = await import("@/lib/db");
  const label = getOAuthProviderLabel(provider);

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (!user) {
    throw new AppError("NOT_FOUND", "用户不存在。", 404);
  }
  if (user.role === "ADMIN") {
    throw new AppError("FORBIDDEN", "管理员账号不支持第三方登录绑定。", 403);
  }

  const existing = await prisma.oAuthAccount.findUnique({
    where: {
      provider_providerAccountId: { provider, providerAccountId: profile.providerAccountId },
    },
  });
  if (existing) {
    if (existing.userId === userId) {
      return; // 已绑定到本人，幂等。
    }
    throw new AppError("CONFLICT", `该 ${label} 账号已被其他用户绑定。`, 409);
  }

  const sameProvider = await prisma.oAuthAccount.findFirst({ where: { userId, provider } });
  if (sameProvider) {
    throw new AppError("CONFLICT", `你已绑定其它 ${label} 账号，请先解绑后再绑定。`, 409);
  }

  await prisma.oAuthAccount.create({
    data: {
      userId,
      provider,
      providerAccountId: profile.providerAccountId,
      email: profile.email,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    },
  });
}

/**
 * 解绑第三方账号。若用户未设置登录密码且这是最后一种登录方式，则拒绝以免锁死账号。
 */
export async function unbindUserOAuthAccount(userId: string, provider: OAuthProviderName) {
  const { prisma } = await import("@/lib/db");
  const [user, bindings] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } }),
    prisma.oAuthAccount.findMany({ where: { userId }, select: { provider: true } }),
  ]);

  if (!user) {
    throw new AppError("NOT_FOUND", "用户不存在。", 404);
  }
  if (!bindings.some((item) => item.provider === provider)) {
    throw new AppError("NOT_FOUND", "未找到该第三方绑定。", 404);
  }

  const remaining = bindings.filter((item) => item.provider !== provider).length;
  if (!user.passwordHash && remaining <= 0) {
    throw new AppError(
      "CONFLICT",
      "解绑后将无法登录，请先设置登录密码或保留至少一种登录方式。",
      409,
    );
  }

  await prisma.oAuthAccount.deleteMany({ where: { userId, provider } });
}
