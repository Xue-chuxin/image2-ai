import { AppError } from "@/lib/app-error";
import { isUsableSecret } from "@/lib/app-crypto";

/**
 * 统一获取用于签名/派生的 AUTH_SECRET。
 * 生产环境缺失或仍为示例值时直接抛错，避免回退到可预测的 "change-me"，
 * 否则邮箱验证码、OAuth state、二步验证等基于 HMAC 的 token 可被伪造。
 * 非生产环境为方便本地开发，允许回退到固定占位值。
 */
export function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET || "";
  if (process.env.NODE_ENV === "production" && !isUsableSecret(secret)) {
    throw new AppError(
      "PROVIDER_CONFIG",
      "AUTH_SECRET 缺失或仍为示例值，生产环境必须配置至少 32 位随机密钥。",
      500,
    );
  }
  return secret || "change-me";
}
