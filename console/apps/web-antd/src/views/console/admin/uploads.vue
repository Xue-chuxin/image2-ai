<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, ref } from 'vue';

import {
  Button,
  Card,
  Input,
  Statistic,
  Table,
  Tag,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminUploads' });

/** 对齐旧版 AdminUploadedImageView 序列化字段 */
interface AdminUploadedImageView {
  id: string;
  url: string;
  thumbnailUrl: null | string;
  mimeType: string;
  fileSize: number;
  width: null | number;
  height: null | number;
  purpose: string;
  isDeleted: boolean;
  createdAt: string;
  userId: string;
  userEmail: null | string;
  userDisplayName: null | string;
}

interface UploadsPayload {
  ok: boolean;
  images: AdminUploadedImageView[];
}

const loading = ref(false);
const query = ref('');
const images = ref<AdminUploadedImageView[]>([]);

/** 文件大小格式化：>=1MB 显示 MB，否则 KB */
function formatSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleString('zh-CN');
}

/** 总大小统计（自动选 KB/MB 单位） */
const totalSizeStat = computed(() => {
  const totalSize = images.value.reduce((sum, image) => sum + image.fileSize, 0);
  if (totalSize >= 1024 * 1024) {
    return { unit: 'MB', value: Number((totalSize / 1024 / 1024).toFixed(1)) };
  }
  return { unit: 'KB', value: Math.max(1, Math.round(totalSize / 1024)) };
});

async function loadImages() {
  loading.value = true;
  try {
    const params: Record<string, number | string> = { limit: 160 };
    const q = query.value.trim();
    if (q) {
      params.q = q;
    }
    const data = await adminRequestClient.get<UploadsPayload>(
      '/admin/uploads',
      { params },
    );
    images.value = data.images ?? [];
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

const columns: TableColumnsType = [
  { key: 'preview', title: '预览', width: 90 },
  { key: 'id', title: '资源', width: 300 },
  { key: 'user', title: '用户', width: 220 },
  { key: 'purpose', title: '用途', width: 110 },
  { key: 'file', title: '文件', width: 160 },
  { key: 'dimension', title: '尺寸', width: 120 },
  { key: 'createdAt', title: '上传时间', width: 180 },
];

onMounted(() => {
  loadImages();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-3">
      <Card :bordered="false">
        <Statistic title="上传图" :value="images.length" suffix="张" />
      </Card>
      <Card :bordered="false">
        <Statistic
          title="总大小"
          :value="totalSizeStat.value"
          :suffix="totalSizeStat.unit"
        />
      </Card>
    </div>

    <Card :bordered="false">
      <template #title>上传资源</template>
      <template #extra>
        <Button :loading="loading" @click="loadImages">刷新</Button>
      </template>

      <div class="mb-4 flex flex-wrap items-center gap-2">
        <Input
          v-model:value="query"
          allow-clear
          class="w-80"
          placeholder="用户邮箱、上传图 ID、URL"
          @press-enter="loadImages"
        />
        <Button :loading="loading" type="primary" @click="loadImages">
          搜索
        </Button>
      </div>

      <Table
        :columns="columns"
        :data-source="images"
        :loading="loading"
        :pagination="{ pageSize: 15, showSizeChanger: false }"
        :scroll="{ x: 1180 }"
        row-key="id"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'preview'">
            <a
              v-if="record.thumbnailUrl || record.url"
              :href="record.url"
              rel="noreferrer"
              target="_blank"
              title="点击打开原图"
            >
              <img
                :src="record.thumbnailUrl || record.url"
                alt="上传图预览"
                class="h-12 w-12 rounded object-cover"
              />
            </a>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template v-else-if="column.key === 'id'">
            <div class="flex flex-col gap-1">
              <code class="break-all text-xs">{{ record.id }}</code>
              <a
                :href="record.url"
                class="break-all text-xs text-gray-400 hover:text-blue-500"
                rel="noreferrer"
                target="_blank"
              >
                {{ record.url }}
              </a>
            </div>
          </template>

          <template v-else-if="column.key === 'user'">
            {{ record.userEmail || record.userDisplayName || record.userId }}
          </template>

          <template v-else-if="column.key === 'purpose'">
            <Tag>{{ record.purpose || '—' }}</Tag>
          </template>

          <template v-else-if="column.key === 'file'">
            <div class="flex flex-col items-start gap-1">
              <Tag>{{ record.mimeType }}</Tag>
              <span class="text-xs text-gray-400">
                {{ formatSize(record.fileSize) }}
              </span>
            </div>
          </template>

          <template v-else-if="column.key === 'dimension'">
            <span v-if="record.width && record.height">
              {{ record.width }}×{{ record.height }}
            </span>
            <span v-else class="text-gray-400">—</span>
          </template>

          <template v-else-if="column.key === 'createdAt'">
            {{ formatTime(record.createdAt) }}
          </template>
        </template>
      </Table>
    </Card>
  </div>
</template>
