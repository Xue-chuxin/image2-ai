<script lang="ts" setup>
import { computed } from 'vue';

import { useUserStore } from '@vben/stores';

import { Card, Statistic, Tag } from 'ant-design-vue';

defineOptions({ name: 'AccountOverview' });

const userStore = useUserStore();

const credits = computed(() => {
  const value = (userStore.userInfo as { credits?: null | number } | null)
    ?.credits;
  return typeof value === 'number' ? value : null;
});
</script>

<template>
  <div class="p-5">
    <Card :bordered="false" title="积分总览">
      <div class="flex flex-wrap items-center gap-10">
        <Statistic
          :value="credits === null ? '--' : credits"
          title="可用积分"
        />
        <div>
          <p class="text-sm text-gray-500">
            充值套餐、订单列表和积分流水正在迁移到控制台。
          </p>
          <p class="mt-1 text-sm text-gray-500">
            迁移完成前可以先在
            <a href="/account" target="_blank">前台账户页</a>
            完成充值。
          </p>
        </div>
        <Tag color="processing">建设中</Tag>
      </div>
    </Card>
  </div>
</template>
