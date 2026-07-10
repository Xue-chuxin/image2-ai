import { NextResponse } from "next/server";

export type AppErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "RATE_LIMITED"
  | "INSUFFICIENT_CREDITS"
  | "PROVIDER_CONFIG"
  | "CONFLICT";

export class AppError extends Error {
  code: AppErrorCode;
  status: number;

  constructor(code: AppErrorCode, message: string, status: number) {
    super(message);
    this.name = "AppError";
    this.code = code;
    this.status = status;
  }
}

export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

// 只有 AppError 才把 message 透传给客户端；其他异常（Prisma、网络、内部错误）
// 一律返回通用兜底文案，避免把数据库连接串、堆栈等内部信息泄露给前端。
export function getAppErrorMessage(error: unknown, fallback: string) {
  return isAppError(error) ? error.message : fallback;
}

export function getAppErrorStatus(error: unknown, fallbackStatus = 500) {
  return isAppError(error) ? error.status : fallbackStatus;
}

export function jsonError(
  error: unknown,
  fallback: string,
  fallbackStatus = 500,
  init?: { headers?: HeadersInit },
) {
  if (!isAppError(error)) {
    // 非业务异常记录完整对象到服务端日志，方便排查，但不回传给客户端。
    console.error("[api-error]", error);
  }

  const message = getAppErrorMessage(error, fallback);
  const status = getAppErrorStatus(error, fallbackStatus);
  const code = isAppError(error) ? error.code : undefined;

  return NextResponse.json(
    {
      ok: false,
      error: message,
      code,
    },
    {
      status,
      headers: init?.headers,
    },
  );
}
