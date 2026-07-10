<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import { Button, Card, Input, Statistic, Table, Tag, Tooltip } from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminModerationLogs' });

interface ModerationLogView {
  id: string;
  userId: null | string;
  userEmail: null | string;
  method: 'keyword' | 'semantic';
  field: null | string;
  category: null | string;
  prompt: string;
  createdAt: string;
}

interface LogsPayload {
  ok: boolean;
  logs: ModerationLogView[];
}

const loading = ref(false);
const query = ref('');
const logs = ref<ModerationLogView[]>([]);

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

const keywordCount = computed(
  () => logs.value.filter((log) => log.method === 'keyword').length,
);
const semanticCount = computed(
  () => logs.value.filter((log) => log.method === 'semantic').length,
);

async function loadLogs() {
  loading.value = true;
  try {
    const params: Record<string, number | string> = { limit: 200 };
    const q = query.value.trim();
    if (q) {
      params.q = q;
    }
    const data = await adminRequestClient.get<LogsPayload>(
      '/admin/moderation/logs',
      { params },
    );
    logs.value = data.logs ?? [];
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

const columns: TableColumnsType = [
  { key: 'createdAt', title: '时间', width: 180 },
  { key: 'user', title: '用户', width: 220 },
  { key: 'method', title: '方式', width: 100 },
  { key: 'category', title: '命中/类别', width: 160 },
  { key: 'field', title: '命中项', width: 120 },
  { key: 'prompt', title: '提示词', minWidth: 260 },
];

onMounted(() => {
  loadLogs();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
      <Card :bordered="false">
        <Statistic title="拦截记录" :value="logs.length" suffix="条" />
      </Card>
      <Card :bordered="false">
        <Statistic title="关键词命中" :value="keywordCount" suffix="条" />
      </Card>
      <Card :bordered="false">
        <Statistic title="语义命中" :value="semanticCount" suffix="条" />
      </Card>
    </div>

    <Card :bordered="false">
      <template #title>内容审核审计日志</template>
      <template #extra>
        <Button :loading="loading" @click="loadLogs">刷新</Button>
      </template>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <Input
          v-model:value="query"
          allow-clear
          class="w-80"
          placeholder="用户邮箱、违规类别、命中词、提示词"
          @press-enter="loadLogs"
        />
        <Button :loading="loading" type="primary" @click="loadLogs">
          搜索
        </Button>
      </div>

      <Table
        :columns="columns"
        :data-source="logs"
        :loading="loading"
        :pagination="{ pageSize: 15, showSizeChanger: false }"
        :scroll="{ x: 1040 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>

          <template v-else-if="column.key === 'user'">
            {{ record.userEmail || record.userId || '匿名' }}
          </template>

          <template v-else-if="column.key === 'method'">
            <Tag :color="record.method === 'semantic' ? 'purple' : 'orange'">
              {{ record.method === 'semantic' ? '语义' : '关键词' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'category'">
            <span v-if="record.category">{{ record.category }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template v-else-if="column.key === 'field'">
            <span v-if="record.field">{{ record.field }}</span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template v-else-if="column.key === 'prompt'">
            <Tooltip :title="record.prompt">
              <span class="line-clamp-2 break-all text-xs text-gray-500">
                {{ record.prompt }}
              </span>
            </Tooltip>
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
