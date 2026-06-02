import { createCipheriv, createDecipheriv, createHash, randomBytes, timingSafeEqual } from "crypto";

const ENCRYPTION_PREFIX = "enc:v1";

function getKeyMaterial(secret: string) {
  return createHash("sha256").update(secret).digest();
}

export function hasSettingsEncryptionKey() {
  return Boolean(process.env.SETTINGS_ENCRYPTION_KEY && process.env.SETTINGS_ENCRYPTION_KEY.length >= 16);
}

export function encryptSecret(value: string) {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;

  if (!secret || secret.length < 16) {
    throw new Error("缺少 SETTINGS_ENCRYPTION_KEY，无法保存敏感配置。");
  }

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKeyMaterial(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [ENCRYPTION_PREFIX, iv.toString("base64url"), tag.toString("base64url"), encrypted.toString("base64url")].join(":");
}

export function decryptSecret(value: string) {
  const secret = process.env.SETTINGS_ENCRYPTION_KEY;

  if (!value.startsWith(`${ENCRYPTION_PREFIX}:`)) {
    return value;
  }

  if (!secret || secret.length < 16) {
    return "";
  }

  const [, , ivValue, tagValue, encryptedValue] = value.split(":");
  const decipher = createDecipheriv("aes-256-gcm", getKeyMaterial(secret), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));

  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}

export function safeEqual(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return timingSafeEqual(leftBuffer, rightBuffer);
}
