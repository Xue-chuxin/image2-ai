<script lang="ts" setup>
import type { Recordable } from '@vben/types';

import type { VbenFormSchema } from '@vben/common-ui';

import { computed, ref } from 'vue';

import { AuthenticationLogin, z } from '@vben/common-ui';
import { $t } from '@vben/locales';

import { message } from 'ant-design-vue';

import { useAuthStore } from '#/store';

defineOptions({ name: 'Login' });

const authStore = useAuthStore();

// 账号开启二步验证后，首次提交会要求补充邮箱验证码，此时追加验证码字段。
const twoFactorRequired = ref(false);

const formSchema = computed((): VbenFormSchema[] => {
  const schema: VbenFormSchema[] = [
    {
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入邮箱账号',
      },
      fieldName: 'username',
      label: '邮箱账号',
      rules: z
        .string()
        .min(1, { message: '请输入邮箱账号' })
        .email({ message: '请输入有效的邮箱地址' }),
    },
    {
      component: 'VbenInputPassword',
      componentProps: {
        placeholder: $t('authentication.password'),
      },
      fieldName: 'password',
      label: $t('authentication.password'),
      rules: z.string().min(6, { message: '密码至少 6 位' }),
    },
  ];

  if (twoFactorRequired.value) {
    schema.push({
      component: 'VbenInput',
      componentProps: {
        placeholder: '请输入邮箱收到的 6 位验证码',
      },
      fieldName: 'code',
      label: '邮箱验证码',
      rules: z
        .string()
        .min(6, { message: '请输入 6 位邮箱验证码' })
        .max(6, { message: '请输入 6 位邮箱验证码' }),
    });
  }

  return schema;
});

async function handleLogin(values: Recordable<any>) {
  const result = await authStore.authLogin(values);
  if (result?.twoFactorRequired) {
    twoFactorRequired.value = true;
    message.info('验证码已发送至你的邮箱，请输入验证码完成登录。');
  }
}
</script>

<template>
  <AuthenticationLogin
    :form-schema="formSchema"
    :loading="authStore.loginLoading"
    :show-code-login="false"
    :show-forget-password="false"
    :show-qrcode-login="false"
    :show-register="false"
    :show-remember-me="true"
    :show-third-party-login="false"
    sub-title="使用造图台账号登录，管理员可进入管理后台"
    title="登录造图台控制台"
    @submit="handleLogin"
  />
</template>
