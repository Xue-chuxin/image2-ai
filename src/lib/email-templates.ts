import { getPublicAppSettings } from "@/lib/settings";

/**
 * 邮件模板体系：统一系统邮件的品牌外观（页头/正文卡片/页脚），
 * 各类邮件只需提供标题与正文片段，即可套用一致的样式。
 * HTML 采用邮件客户端兼容写法（表格布局 + 内联样式）。
 */

export type EmailBrand = {
  siteName: string;
  siteUrl: string;
  logoUrl: string;
};

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const BRAND_COLOR = "#2563eb";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** 仅接受绝对 http(s) 地址的 logo，相对路径在邮件客户端无法渲染。 */
function resolveAbsoluteLogo(logoUrl: string, siteUrl: string) {
  const clean = logoUrl.trim();
  if (/^https?:\/\//i.test(clean)) {
    return clean;
  }
  if (siteUrl && clean.startsWith("/")) {
    return `${siteUrl.replace(/\/$/, "")}${clean}`;
  }
  return "";
}

/** 读取站点品牌信息（站点名/logo/公网地址），供所有邮件模板复用。 */
export async function getEmailBrand(): Promise<EmailBrand> {
  const settings = await getPublicAppSettings();
  const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  return {
    siteName: settings.siteTitle,
    siteUrl,
    logoUrl: settings.siteLogoUrl,
  };
}

type LayoutInput = {
  brand: EmailBrand;
  heading: string;
  // 正文 HTML 片段（内部已转义/受信任），按顺序拼接进正文卡片。
  bodyHtml: string;
  // 页脚补充说明（纯文本），可选。
  footerNote?: string;
};

/** 渲染统一品牌 HTML 外壳。 */
export function renderEmailLayout({ brand, heading, bodyHtml, footerNote }: LayoutInput) {
  const siteName = escapeHtml(brand.siteName);
  const logo = resolveAbsoluteLogo(brand.logoUrl, brand.siteUrl);
  const headerInner = logo
    ? `<img src="${escapeHtml(logo)}" alt="${siteName}" height="32" style="height:32px;display:inline-block;" />`
    : `<span style="font-size:20px;font-weight:800;color:${BRAND_COLOR};">${siteName}</span>`;
  const siteLink = brand.siteUrl
    ? `<a href="${escapeHtml(brand.siteUrl)}" style="color:${BRAND_COLOR};text-decoration:none;">${escapeHtml(brand.siteUrl)}</a>`
    : siteName;
  const footer = footerNote
    ? `<p style="margin:0 0 8px;">${escapeHtml(footerNote)}</p>`
    : "";

  return [
    '<!DOCTYPE html>',
    '<html lang="zh-CN"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /></head>',
    '<body style="margin:0;padding:0;background:#f5f5f7;">',
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f7;padding:24px 12px;">`,
    '<tr><td align="center">',
    '<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="max-width:480px;width:100%;background:#ffffff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;">',
    `<tr><td style="padding:20px 28px;border-bottom:1px solid #f0f0f0;">${headerInner}</td></tr>`,
    '<tr><td style="padding:28px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#1f2933;font-size:15px;line-height:1.7;">',
    `<h1 style="margin:0 0 16px;font-size:18px;color:#111827;">${escapeHtml(heading)}</h1>`,
    bodyHtml,
    '</td></tr>',
    `<tr><td style="padding:18px 28px;border-top:1px solid #f0f0f0;color:#9ca3af;font-size:12px;line-height:1.6;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;">`,
    footer,
    `<p style="margin:0;">此邮件由 ${siteLink} 系统自动发送，请勿直接回复。</p>`,
    '</td></tr>',
    '</table>',
    '</td></tr></table>',
    '</body></html>',
  ].join("");
}

/** 渲染统一品牌纯文本版（页头站点名 + 正文行 + 页脚）。 */
export function renderTextLayout(brand: EmailBrand, lines: string[], footerNote?: string) {
  const parts = [`【${brand.siteName}】`, ""].concat(lines);
  parts.push("");
  if (footerNote) {
    parts.push(footerNote);
  }
  parts.push(`此邮件由 ${brand.siteName}${brand.siteUrl ? `（${brand.siteUrl}）` : ""} 系统自动发送，请勿直接回复。`);
  return parts.join("\n");
}

/** 注册验证码邮件 */
export function buildVerificationCodeEmail(brand: EmailBrand, options: { code: string }): RenderedEmail {
  const { code } = options;
  const heading = `注册 ${brand.siteName} 账号`;
  const bodyHtml = [
    `<p style="margin:0 0 16px;">你正在注册 ${escapeHtml(brand.siteName)} 账号，请在页面输入以下验证码完成注册：</p>`,
    `<p style="margin:0 0 16px;font-size:30px;font-weight:800;letter-spacing:8px;color:${BRAND_COLOR};">${escapeHtml(code)}</p>`,
    '<p style="margin:0;color:#6b7280;">验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。</p>',
  ].join("");
  const text = renderTextLayout(brand, [
    `你正在注册 ${brand.siteName} 账号。`,
    "",
    `验证码：${code}`,
    "",
    "验证码 10 分钟内有效。如果不是你本人操作，请忽略这封邮件。",
  ]);

  return {
    subject: `${brand.siteName}注册验证码`,
    text,
    html: renderEmailLayout({ brand, heading, bodyHtml }),
  };
}

/** SMTP 配置测试邮件 */
export function buildTestEmail(brand: EmailBrand): RenderedEmail {
  const heading = "SMTP 发信测试";
  const bodyHtml = [
    `<p style="margin:0 0 12px;">如果你收到这封邮件，说明 <strong>${escapeHtml(brand.siteName)} 的 SMTP 发信配置已经生效</strong>。</p>`,
    '<p style="margin:0;color:#6b7280;">现在可以正常发送注册验证码、会员提醒等系统邮件了。</p>',
  ].join("");
  const text = renderTextLayout(brand, [
    `如果你收到这封邮件，说明 ${brand.siteName} 的 SMTP 发信配置已经生效。`,
    "现在可以正常发送注册验证码、会员提醒等系统邮件了。",
  ]);

  return {
    subject: `${brand.siteName}邮件测试`,
    text,
    html: renderEmailLayout({ brand, heading, bodyHtml }),
  };
}

/** 会员到期提醒邮件（到期前提醒 / 已到期提醒共用，由 expired 区分） */
export function buildMembershipReminderEmail(
  brand: EmailBrand,
  options: { packageName: string; expiresAt: Date; daysRemaining: number; expired: boolean },
): RenderedEmail {
  const { packageName, expiresAt, daysRemaining, expired } = options;
  const expireText = expiresAt.toLocaleString("zh-CN");
  const rechargeUrl = brand.siteUrl ? `${brand.siteUrl}/console/#/account/recharge` : "";
  const heading = expired ? "你的会员已到期" : `会员将在 ${daysRemaining} 天后到期`;

  const leadHtml = expired
    ? `<p style="margin:0 0 12px;">你的「${escapeHtml(packageName)}」会员已于 <strong>${escapeHtml(expireText)}</strong> 到期，会员专享权益已暂停。</p>`
    : `<p style="margin:0 0 12px;">你的「${escapeHtml(packageName)}」会员将于 <strong>${escapeHtml(expireText)}</strong> 到期，还剩 <strong>${daysRemaining}</strong> 天。</p>`;
  const ctaHtml = rechargeUrl
    ? `<p style="margin:0 0 8px;"><a href="${escapeHtml(rechargeUrl)}" style="display:inline-block;background:${BRAND_COLOR};color:#ffffff;text-decoration:none;padding:10px 22px;border-radius:8px;font-weight:600;">前往续费</a></p>`
    : "";
  const bodyHtml = [
    leadHtml,
    '<p style="margin:0 0 16px;color:#6b7280;">续费后会员有效期将自动顺延，出图折扣、每日赠送积分与更高频率上限等权益随即恢复。</p>',
    ctaHtml,
  ].join("");

  const text = renderTextLayout(brand, [
    expired
      ? `你的「${packageName}」会员已于 ${expireText} 到期，会员专享权益已暂停。`
      : `你的「${packageName}」会员将于 ${expireText} 到期，还剩 ${daysRemaining} 天。`,
    "续费后会员有效期将自动顺延，出图折扣、每日赠送积分与更高频率上限等权益随即恢复。",
    ...(rechargeUrl ? ["", `续费地址：${rechargeUrl}`] : []),
  ]);

  return {
    subject: expired ? `${brand.siteName}会员已到期` : `${brand.siteName}会员即将到期提醒`,
    text,
    html: renderEmailLayout({ brand, heading, bodyHtml }),
  };
}
