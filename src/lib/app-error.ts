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

export function getAppErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function getAppErrorStatus(error: unknown, fallbackStatus = 500) {
  return isAppError(error) ? error.status : fallbackStatus;
}

export function jsonError(error: unknown, fallback: string, fallbackStatus = 500) {
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
    },
  );
}
