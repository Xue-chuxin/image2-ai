import { NextResponse } from "next/server";

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
