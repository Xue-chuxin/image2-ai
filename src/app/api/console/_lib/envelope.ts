import { NextResponse } from "next/server";

import { getAppErrorMessage, getAppErrorStatus, isAppError } from "@/lib/app-error";
import { getAdminSession, getUserSession } from "@/lib/auth";

/** 控制台会话：管理员或普通用户任一 Cookie 会话均可访问用户中心能力 */
export async function getConsoleSession() {
  const [adminSession, userSession] = await Promise.all([getAdminSession(), getUserSession()]);
  const session = adminSession || userSession;
  if (!session) {
    return null;
  }
  return {
    userId: session.userId,
    email: session.email,
    isAdmin: Boolean(adminSession),
  };
}

/**
 * vben (@vben/request defaultResponseInterceptor) 约定的响应信封：
 * 成功 { code: 0, data }，失败按 HTTP 状态码 + error 文案处理。
 */
export function consoleOk<T>(data: T) {
  return NextResponse.json({ code: 0, data, error: null, message: "ok" });
}

export function consoleError(message: string, status = 400) {
  return NextResponse.json({ code: -1, data: null, error: message, message }, { status });
}

/**
 * 从异常构造 console 错误响应：仅 AppError 透传业务文案，其余异常记日志并返回兜底文案，
 * 避免把内部异常信息泄露给前端。
 */
export function consoleErrorFromException(error: unknown, fallback: string, fallbackStatus = 500) {
  if (!isAppError(error)) {
    console.error("[console-api-error]", error);
  }
  return consoleError(getAppErrorMessage(error, fallback), getAppErrorStatus(error, fallbackStatus));
}
