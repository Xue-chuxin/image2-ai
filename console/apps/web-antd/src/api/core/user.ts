import type { UserInfo } from '@vben/types';

import { requestClient } from '#/api/request';

/** 造图台控制台用户信息（在 vben UserInfo 基础上带积分余额） */
export type ConsoleUserInfo = UserInfo & {
  credits: null | number;
};

/**
 * 获取用户信息（Next.js 适配层，基于 Cookie 会话）
 */
export async function getUserInfoApi() {
  return requestClient.get<ConsoleUserInfo>('/console/user/info');
}
