<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Input,
  InputNumber,
  InputPassword,
  InputSearch,
  message,
  Modal,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminUsers' });

/** 对齐旧版 src/lib/admin-users.ts 的 AdminUserView 序列化字段 */
interface AdminUserView {
  availableCredits: number;
  createdAt: string;
  displayName: null | string;
  email: null | string;
  frozenCredits: number;
  generationJobCount: number;
  id: string;
  lastLoginAt: null | string;
  paidRechargeOrderCount: number;
  rechargeOrderCount: number;
  role: string;
  updatedAt: string;
  uploadedImageCount: number;
}

const loading = ref(false);
const users = ref<AdminUserView[]>([]);
const query = ref('');
/** 行级操作 loading（删除等） */
const rowLoading = reactive<Record<string, boolean>>({});

/** 调整积分弹窗 */
const creditOpen = ref(false);
const creditUser = ref<AdminUserView | null>(null);
const creditAmount = ref<number | undefined>(undefined);
const creditReason = ref('');
const creditSubmitting = ref(false);

/** 编辑用户弹窗 */
const editOpen = ref(false);
const editUser = ref<AdminUserView | null>(null);
const editForm = reactive({
  displayName: '',
  email: '',
  password: '',
  role: 'USER' as 'ADMIN' | 'USER',
});
const editSubmitting = ref(false);

const ROLE_OPTIONS = [
  { label: '普通用户', value: 'USER' },
  { label: '管理员', value: 'ADMIN' },
];

const stats = computed(() => ({
  admins: users.value.filter((user) => user.role === 'ADMIN').length,
  availableCredits: users.value.reduce(
    (sum, user) => sum + user.availableCredits,
    0,
  ),
  frozenCredits: users.value.reduce((sum, user) => sum + user.frozenCredits, 0),
  total: users.value.length,
}));

function formatTime(value: null | string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '暂无';
}

function userLabel(user: AdminUserView) {
  return user.email || user.displayName || user.id;
}

const columns: TableColumnsType = [
  { key: 'identity', title: '用户', width: 260 },
  { key: 'role', title: '角色', width: 100 },
  {
    dataIndex: 'availableCredits',
    key: 'availableCredits',
    title: '可用积分',
    width: 100,
  },
  {
    dataIndex: 'frozenCredits',
    key: 'frozenCredits',
    title: '冻结积分',
    width: 100,
  },
  {
    dataIndex: 'generationJobCount',
    key: 'generationJobCount',
    title: '任务数',
    width: 90,
  },
  {
    dataIndex: 'rechargeOrderCount',
    key: 'rechargeOrderCount',
    title: '订单数',
    width: 90,
  },
  { key: 'activity', title: '注册时间', width: 220 },
  { fixed: 'right', key: 'action', title: '操作', width: 230 },
];

async function loadUsers() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      users: AdminUserView[];
    }>('/admin/users', {
      params: {
        limit: 80,
        q: query.value.trim() || undefined,
      },
    });
    users.value = data.users ?? [];
  } catch {
    // adminRequestClient 已统一提示错误，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

/** 用最新用户数据替换列表中的对应行 */
function updateRow(updated: AdminUserView) {
  const index = users.value.findIndex((item) => item.id === updated.id);
  if (index === -1) {
    users.value.unshift(updated);
  } else {
    users.value.splice(index, 1, updated);
  }
}

/** 调整积分：管理员行按钮禁用，只对普通用户开放 */
function openCredit(user: AdminUserView) {
  if (user.role !== 'USER') {
    message.warning('管理员账号不可调整积分。');
    return;
  }
  creditUser.value = user;
  creditAmount.value = undefined;
  creditReason.value = '';
  creditOpen.value = true;
}

async function submitCredit() {
  if (!creditUser.value) {
    return;
  }
  const amount = Math.trunc(Number(creditAmount.value ?? 0));
  if (!Number.isFinite(amount) || amount === 0) {
    message.warning('请输入非 0 的整数积分。');
    return;
  }
  if (Math.abs(amount) > 100_000) {
    message.warning('单次调整积分不能超过 100000。');
    return;
  }

  const userId = creditUser.value.id;
  creditSubmitting.value = true;
  try {
    const data = await adminRequestClient.post<{
      ok: boolean;
      user: AdminUserView;
    }>(`/admin/users/${userId}/credits`, {
      amount,
      reason: creditReason.value.trim(),
    });
    updateRow(data.user);
    creditOpen.value = false;
    message.success('积分已调整，并已写入积分流水。');
  } catch {
    // 错误已由 adminRequestClient 提示
  } finally {
    creditSubmitting.value = false;
  }
}

function openEdit(user: AdminUserView) {
  editUser.value = user;
  editForm.email = user.email || '';
  editForm.displayName = user.displayName || '';
  editForm.role = user.role === 'ADMIN' ? 'ADMIN' : 'USER';
  editForm.password = '';
  editOpen.value = true;
}

async function submitEdit() {
  if (!editUser.value) {
    return;
  }
  if (!editForm.email.trim()) {
    message.warning('请填写用户邮箱。');
    return;
  }
  const password = editForm.password.trim();
  if (password && password.length < 6) {
    message.warning('密码至少需要 6 位。');
    return;
  }

  const userId = editUser.value.id;
  editSubmitting.value = true;
  try {
    const data = await adminRequestClient.request<{
      ok: boolean;
      user: AdminUserView;
    }>(`/admin/users/${userId}`, {
      method: 'PATCH',
      data: {
        displayName: editForm.displayName,
        email: editForm.email.trim(),
        password,
        role: editForm.role,
      },
    });
    updateRow(data.user);
    editOpen.value = false;
    message.success('用户资料已更新。');
  } catch {
    // 错误已由 adminRequestClient 提示
  } finally {
    editSubmitting.value = false;
  }
}

function handleDelete(user: AdminUserView) {
  Modal.confirm({
    cancelText: '取消',
    content: `确认删除用户 ${userLabel(user)} 吗？相关任务、图片、积分流水和订单也会一并删除。`,
    okText: '确认删除',
    okType: 'danger',
    title: '删除用户',
    onOk: async () => {
      rowLoading[user.id] = true;
      try {
        await adminRequestClient.delete<{
          deleted: { id: string };
          ok: boolean;
        }>(`/admin/users/${user.id}`);
        users.value = users.value.filter((item) => item.id !== user.id);
        message.success('用户已删除。');
      } finally {
        rowLoading[user.id] = false;
      }
    },
  });
}

onMounted(() => {
  loadUsers();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
      <Card :bordered="false">
        <Statistic :value="stats.total" title="当前列表" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.admins" title="管理员" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.availableCredits" title="可用积分合计" />
      </Card>
      <Card :bordered="false">
        <Statistic :value="stats.frozenCredits" title="冻结积分合计" />
      </Card>
    </div>

    <Card :bordered="false">
      <template #title>用户运营</template>
      <template #extra>
        <Button :loading="loading" type="primary" @click="loadUsers">
          刷新
        </Button>
      </template>

      <div class="mb-4">
        <InputSearch
          v-model:value="query"
          allow-clear
          class="max-w-md"
          enter-button="搜索"
          placeholder="邮箱、昵称或用户 ID"
          @search="loadUsers"
        />
      </div>

      <Table
        :columns="columns"
        :data-source="users"
        :loading="loading"
        :locale="{ emptyText: '没有找到匹配用户' }"
        :pagination="{ pageSize: 10, showSizeChanger: false }"
        :scroll="{ x: 1250 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'identity'">
            <div class="flex flex-col gap-1">
              <span class="font-medium">
                {{ userLabel(record as AdminUserView) }}
              </span>
              <code class="text-xs text-gray-400">{{ record.id }}</code>
            </div>
          </template>

          <template v-else-if="column.key === 'role'">
            <Tag :color="record.role === 'ADMIN' ? 'gold' : 'blue'">
              {{ record.role === 'ADMIN' ? '管理员' : '普通用户' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'activity'">
            <div class="flex flex-col gap-1 text-xs">
              <span>注册：{{ formatTime(record.createdAt) }}</span>
              <span class="text-gray-400">
                最近登录：{{ formatTime(record.lastLoginAt) }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'action'">
            <Space>
              <Tooltip
                v-if="record.role !== 'USER'"
                title="管理员账号不可调整积分"
              >
                <span class="cursor-not-allowed">
                  <Button disabled size="small" type="link">调整积分</Button>
                </span>
              </Tooltip>
              <Button
                v-else
                size="small"
                type="link"
                @click="openCredit(record as AdminUserView)"
              >
                调整积分
              </Button>
              <Button
                size="small"
                type="link"
                @click="openEdit(record as AdminUserView)"
              >
                编辑
              </Button>
              <Button
                danger
                :loading="rowLoading[record.id]"
                size="small"
                type="link"
                @click="handleDelete(record as AdminUserView)"
              >
                删除
              </Button>
            </Space>
          </template>
        </template>
      </Table>
    </Card>

    <Modal
      v-model:open="creditOpen"
      :confirm-loading="creditSubmitting"
      cancel-text="取消"
      ok-text="确认调整"
      title="手动调整积分"
      @ok="submitCredit"
    >
      <div v-if="creditUser" class="flex flex-col gap-4 py-2">
        <p class="text-sm text-gray-500">
          正在为「{{ userLabel(creditUser) }}」调整积分：正数增加、负数扣减，
          调整会写入积分流水。当前可用积分 {{ creditUser.availableCredits }}。
        </p>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">调整数量</span>
          <InputNumber
            v-model:value="creditAmount"
            :max="100000"
            :min="-100000"
            :precision="0"
            class="w-full"
            placeholder="例如 100 或 -50"
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">调整原因</span>
          <Input
            v-model:value="creditReason"
            :maxlength="120"
            placeholder="留空默认为「运营后台手动调整」"
          />
        </div>
      </div>
    </Modal>

    <Modal
      v-model:open="editOpen"
      :confirm-loading="editSubmitting"
      cancel-text="取消"
      ok-text="保存用户"
      title="编辑用户"
      @ok="submitEdit"
    >
      <div class="flex flex-col gap-4 py-2">
        <p class="text-sm text-gray-500">
          密码留空表示不修改。管理员账号受保护，不能删除或降级最后一个管理员。
        </p>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">邮箱</span>
          <Input v-model:value="editForm.email" placeholder="user@example.com" />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">昵称</span>
          <Input v-model:value="editForm.displayName" placeholder="可留空" />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">角色</span>
          <Select
            v-model:value="editForm.role"
            :options="ROLE_OPTIONS"
            class="w-full"
          />
        </div>
        <div class="flex flex-col gap-2">
          <span class="text-sm font-medium">重置密码</span>
          <InputPassword
            v-model:value="editForm.password"
            placeholder="留空不修改，填写则至少 6 位"
          />
        </div>
      </div>
    </Modal>
  </div>
</template>
