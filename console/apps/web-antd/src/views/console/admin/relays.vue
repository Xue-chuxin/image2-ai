<script lang="ts" setup>
import { computed, onMounted, reactive, ref } from 'vue';

import {
  Alert,
  Button,
  Card,
  Empty,
  Spin,
  Tag,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminRelays' });

/** 中转站推荐条目（对齐 /api/admin/relays 返回的 relay-recommendations 序列化字段） */
interface RelayRecommendation {
  id: string;
  name: string;
  href: string;
  logoSrc: string;
  initials: string;
  description: string;
  tags: string[];
  accent: string;
  accentSoft: string;
}

const loading = ref(false);
const relays = ref<RelayRecommendation[]>([]);
/** logo 加载失败的条目：回退显示首字圆块 */
const failedLogoIds = reactive<Record<string, boolean>>({});

const relayCount = computed(() => relays.value.length);

async function loadRelays() {
  loading.value = true;
  try {
    const data = await adminRequestClient.get<{
      ok: boolean;
      relays: RelayRecommendation[];
    }>('/admin/relays');
    relays.value = data.relays ?? [];
  } catch {
    // adminRequestClient 已统一 message.error，这里只收敛 loading 态
  } finally {
    loading.value = false;
  }
}

function handleLogoError(id: string) {
  failedLogoIds[id] = true;
}

function openSite(item: RelayRecommendation) {
  window.open(item.href, '_blank', 'noopener,noreferrer');
}

onMounted(() => {
  loadRelays();
});
</script>

<template>
  <div class="p-5">
    <Card :bordered="false">
      <template #title>中转站推荐</template>
      <template #extra>
        <div class="flex items-center gap-2">
          <Tag color="blue">{{ relayCount }} 个入口</Tag>
          <Button :loading="loading" type="primary" @click="loadRelays">
            刷新
          </Button>
        </div>
      </template>

      <Alert
        class="mb-4"
        message="第三方中转站推荐"
        description="以下为常用的 OpenAI 兼容中转站入口，均为第三方服务、非本站官方运营，价格、模型与可用性请点击跳转自行查看，接入前请自行评估风险。"
        show-icon
        type="info"
      />

      <Spin :spinning="loading">
        <div
          v-if="relays.length > 0"
          class="grid grid-cols-1 gap-4 md:grid-cols-2"
        >
          <div
            v-for="item in relays"
            :key="item.id"
            class="flex gap-4 rounded-lg border p-4"
            :style="{ borderColor: item.accentSoft }"
          >
            <!-- logo：加载失败时回退为主题色首字块 -->
            <div class="shrink-0">
              <img
                v-if="item.logoSrc && !failedLogoIds[item.id]"
                :alt="item.name"
                :src="item.logoSrc"
                class="h-12 w-12 rounded object-cover"
                loading="lazy"
                @error="handleLogoError(item.id)"
              />
              <div
                v-else
                class="flex h-12 w-12 items-center justify-center rounded text-sm font-semibold"
                :style="{ backgroundColor: item.accentSoft, color: item.accent }"
              >
                {{ item.initials }}
              </div>
            </div>

            <div class="min-w-0 flex-1">
              <div class="flex items-center justify-between gap-2">
                <h3
                  class="truncate text-base font-semibold"
                  :style="{ color: item.accent }"
                >
                  {{ item.name }}
                </h3>
                <Button size="small" type="link" @click="openSite(item)">
                  访问站点
                </Button>
              </div>
              <p class="mt-1 text-sm text-gray-500">
                {{ item.description }}
              </p>
              <div class="mt-2 flex flex-wrap gap-1">
                <Tag
                  v-for="tag in item.tags"
                  :key="tag"
                  :color="item.accent"
                  class="!mr-0"
                >
                  {{ tag }}
                </Tag>
              </div>
            </div>
          </div>
        </div>

        <Empty v-else-if="!loading" description="暂无中转站推荐" />
      </Spin>
    </Card>
  </div>
</template>
