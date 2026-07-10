/**
 * 旧版管理接口客户端：现有 Next.js /api/admin/* 使用 `{ ok: boolean, error?, ...payload }`
 * 信封（而非 vben 的 `{ code, data }`），这里单独建一个 RequestClient 适配。
 * 认证走同源 HTTP-only Cookie，无需 Authorization 头。
 */
import { useAppConfig } from '@vben/hooks';
import { preferences } from '@vben/preferences';
import {
  errorMessageResponseInterceptor,
  RequestClient,
} from '@vben/request';
import { useAccessStore } from '@vben/stores';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

const { apiURL } = useAppConfig(import.meta.env, import.meta.env.PROD);

function createAdminRequestClient(baseURL: string) {
  const client = new RequestClient({ baseURL });

  client.addRequestInterceptor({
    fulfilled: async (config) => {
      config.headers['Accept-Language'] = preferences.app.locale;
      return config;
    },
  });

  // 解包 { ok } 信封：ok=false 抛错；成功返回整个 body（各接口负载字段名不同）
  client.addResponseInterceptor({
    fulfilled: (response) => {
      const { data, status } = response;
      if (status >= 200 && status < 300) {
        if (data && typeof data === 'object' && data.ok === false) {
          throw Object.assign(new Error(data.error || '请求失败'), {
            response,
          });
        }
        return data;
      }
      throw Object.assign(new Error(String(status)), { response });
    },
  });

  // 401 → 会话失效，走统一重新登录
  client.addResponseInterceptor({
    rejected: async (error) => {
      if (error?.response?.status === 401) {
        const accessStore = useAccessStore();
        const authStore = useAuthStore();
        accessStore.setAccessToken(null);
        await authStore.logout();
      }
      throw error;
    },
  });

  client.addResponseInterceptor(
    errorMessageResponseInterceptor((msg: string, error) => {
      const responseData = error?.response?.data ?? {};
      const errorMessage =
        responseData?.error ?? responseData?.message ?? error?.message ?? '';
      message.error(errorMessage || msg);
    }),
  );

  return client;
}

export const adminRequestClient = createAdminRequestClient(apiURL);
