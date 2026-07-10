<script lang="ts" setup>
import type { FormInstance } from 'ant-design-vue';
import type { Rule } from 'ant-design-vue/es/form';

import { computed, onMounted, reactive, ref } from 'vue';

import { useRoute } from 'vue-router';

import { useUserStore } from '@vben/stores';

import {
  Alert,
  Button,
  Card,
  Descriptions,
  DescriptionsItem,
  Empty,
  Form,
  FormItem,
  InputPassword,
  message,
  Popconfirm,
  Spin,
  Tag,
} from 'ant-design-vue';

import {
  changePasswordApi,
  getOAuthAccountsApi,
  type OAuthAccountsView,
  unbindOAuthAccountApi,
} from '#/api/console/billing';

defineOptions({ name: 'AccountProfile' });

const route = useRoute();
const userStore = useUserStore();

const email = computed(() => userStore.userInfo?.username ?? '--');
const displayName = computed(() => userStore.userInfo?.realName ?? '--');
const isAdmin = computed(() =>
  (userStore.userInfo?.roles ?? []).includes('admin'),
);

interface PasswordFormState {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

const formRef = ref<FormInstance>();
const submitting = ref(false);

const formState = reactive<PasswordFormState>({
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
});

const rules: Record<string, Rule[]> = {
  currentPassword: [
    { message: '请输入当前密码', required: true, trigger: 'blur' },
  ],
  newPassword: [
    { message: '请输入新密码', required: true, trigger: 'blur' },
    { message: '新密码长度不能少于 6 位', min: 6, trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (_rule: Rule, value: string) => {
        if (value && value === formState.currentPassword) {
          return Promise.reject(new Error('新密码不能与当前密码相同'));
        }
        return Promise.resolve();
      },
    },
  ],
  confirmPassword: [
    { message: '请再次输入新密码', required: true, trigger: 'blur' },
    {
      trigger: 'blur',
      validator: (_rule: Rule, value: string) => {
        if (value && value !== formState.newPassword) {
          return Promise.reject(new Error('两次输入的新密码不一致'));
        }
        return Promise.resolve();
      },
    },
  ],
};

async function handleSubmit() {
  submitting.value = true;
  try {
    await changePasswordApi({
      currentPassword: formState.currentPassword,
      newPassword: formState.newPassword,
    });
    message.success('密码已更新，下次登录使用新密码');
    formRef.value?.resetFields();
  } catch {
    // requestClient 已统一提示错误，这里仅恢复 loading 态
  } finally {
    submitting.value = false;
  }
}

const oauthLoading = ref(false);
const oauthData = ref<OAuthAccountsView | null>(null);
const unbindingProvider = ref('');

// 可绑定渠道 + 当前绑定状态合并成行，未绑定渠道也展示以便发起绑定。
const providerRows = computed(() => {
  const data = oauthData.value;
  if (!data) {
    return [];
  }
  return data.providers.map((option) => ({
    ...option,
    binding: data.bindings.find((item) => item.provider === option.provider) ?? null,
  }));
});

// 仅剩最后一种登录方式且未设置密码时，禁止解绑以免锁死账号。
function canUnbind(provider: string) {
  const data = oauthData.value;
  if (!data) {
    return false;
  }
  if (data.hasPassword) {
    return true;
  }
  const boundCount = data.bindings.length;
  const isBound = data.bindings.some((item) => item.provider === provider);
  return !(isBound && boundCount <= 1);
}

async function loadOAuthAccounts() {
  oauthLoading.value = true;
  try {
    oauthData.value = await getOAuthAccountsApi();
  } catch {
    // requestClient 已提示错误
  } finally {
    oauthLoading.value = false;
  }
}

function bindProvider(provider: string) {
  // 绑定需经浏览器跳转到第三方授权页，走整页导航而非 XHR。
  window.location.href = `/api/console/user/oauth/${provider}/start`;
}

async function unbindProvider(provider: string) {
  unbindingProvider.value = provider;
  try {
    await unbindOAuthAccountApi(provider);
    message.success('已解绑');
    await loadOAuthAccounts();
  } catch {
    // requestClient 已提示错误
  } finally {
    unbindingProvider.value = '';
  }
}

onMounted(() => {
  // 绑定回调通过 URL 查询参数回传结果。
  if (route.query.oauth_link === 'success') {
    message.success('第三方账号绑定成功');
  } else if (typeof route.query.oauth_link_error === 'string') {
    message.error(route.query.oauth_link_error);
  }
  if (!isAdmin.value) {
    loadOAuthAccounts();
  }
});
</script>

<template>
  <div class="p-5">
    <div class="grid grid-cols-1 gap-4">
      <Card :bordered="false" title="账号信息">
        <Descriptions :column="1" bordered size="middle">
          <DescriptionsItem label="邮箱">{{ email }}</DescriptionsItem>
          <DescriptionsItem label="显示名">
            {{ displayName }}
          </DescriptionsItem>
          <DescriptionsItem label="角色">
            <Tag v-if="isAdmin" color="gold">管理员</Tag>
            <Tag v-else color="blue">普通用户</Tag>
          </DescriptionsItem>
        </Descriptions>
      </Card>

      <Card :bordered="false" title="修改密码">
        <Form
          ref="formRef"
          :label-col="{ span: 5 }"
          :model="formState"
          :rules="rules"
          :wrapper-col="{ span: 12 }"
          class="max-w-xl"
          @finish="handleSubmit"
        >
          <FormItem label="当前密码" name="currentPassword">
            <InputPassword
              v-model:value="formState.currentPassword"
              autocomplete="current-password"
              placeholder="请输入当前密码"
            />
          </FormItem>
          <FormItem label="新密码" name="newPassword">
            <InputPassword
              v-model:value="formState.newPassword"
              autocomplete="new-password"
              placeholder="至少 6 位字符"
            />
          </FormItem>
          <FormItem label="确认新密码" name="confirmPassword">
            <InputPassword
              v-model:value="formState.confirmPassword"
              autocomplete="new-password"
              placeholder="请再次输入新密码"
            />
          </FormItem>
          <FormItem :wrapper-col="{ offset: 5, span: 12 }">
            <Button :loading="submitting" html-type="submit" type="primary">
              更新密码
            </Button>
          </FormItem>
        </Form>
      </Card>

      <Card v-if="!isAdmin" :bordered="false" title="第三方账号绑定">
        <Spin :spinning="oauthLoading">
          <Empty
            v-if="!oauthLoading && providerRows.length === 0"
            description="管理员尚未开放任何第三方登录渠道"
          />
          <ul v-else class="divide-y divide-gray-100">
            <li
              v-for="row in providerRows"
              :key="row.provider"
              class="flex items-center justify-between gap-3 py-3"
            >
              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="font-medium">{{ row.label }}</span>
                  <Tag v-if="row.binding" color="green">已绑定</Tag>
                  <Tag v-else color="default">未绑定</Tag>
                </div>
                <p
                  v-if="row.binding"
                  class="mt-1 truncate text-xs text-gray-400"
                >
                  {{ row.binding.email || row.binding.displayName || '已授权' }}
                </p>
              </div>
              <Popconfirm
                v-if="row.binding"
                :disabled="!canUnbind(row.provider)"
                cancel-text="取消"
                ok-text="解绑"
                title="确认解绑该第三方账号？"
                @confirm="unbindProvider(row.provider)"
              >
                <Button
                  :disabled="!canUnbind(row.provider)"
                  :loading="unbindingProvider === row.provider"
                  danger
                  size="small"
                >
                  解绑
                </Button>
              </Popconfirm>
              <Button
                v-else
                size="small"
                type="primary"
                @click="bindProvider(row.provider)"
              >
                绑定
              </Button>
            </li>
          </ul>
          <p
            v-if="oauthData && !oauthData.hasPassword"
            class="mt-3 text-xs text-gray-400"
          >
            你尚未设置登录密码，请至少保留一种第三方登录方式，或先设置密码后再解绑。
          </p>
        </Spin>
      </Card>

      <Card :bordered="false" title="安全提示">
        <Alert
          description="修改密码后，已登录的会话在令牌过期前仍然有效；如怀疑账号泄露，请尽快修改密码并等待旧会话自然过期。"
          message="无状态会话说明"
          show-icon
          type="info"
        />
        <ul class="mt-4 list-disc space-y-2 pl-5 text-sm text-gray-500">
          <li>建议定期更换密码，避免与其他网站使用相同的密码。</li>
          <li>密码请包含字母与数字的组合，长度不少于 6 位。</li>
          <li>请勿将密码告知他人，平台工作人员不会索要您的密码。</li>
        </ul>
      </Card>
    </div>
  </div>
</template>
