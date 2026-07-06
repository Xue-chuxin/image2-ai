<script lang="ts" setup>
import { Card, Tag } from 'ant-design-vue';

defineOptions({ name: 'ConsoleDashboard' });

const planned = [
  { title: '运营数据看板', note: '用户 / 任务 / 作品 / 到账金额统计将迁移到这里' },
  { title: '系统设置', note: '站点、生图通道、存储、邮件配置' },
  { title: '用户与任务管理', note: '用户管理、积分调整、生图任务管理' },
  { title: '内容与账单', note: '图片管理、运营精选、套餐订单、支付诊断' },
];
</script>

<template>
  <div class="p-5">
    <Card :bordered="false" title="管理概览">
      <p class="text-base">
        管理后台正在从旧版页面迁移到控制台。迁移完成前，可以继续使用
        <a href="/admin" target="_blank">旧版管理后台</a>。
      </p>
    </Card>
    <div class="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
      <Card v-for="item in planned" :key="item.title" :bordered="false">
        <div class="flex items-center justify-between">
          <span class="text-base font-semibold">{{ item.title }}</span>
          <Tag color="processing">迁移中</Tag>
        </div>
        <p class="mt-2 text-sm text-gray-500">{{ item.note }}</p>
      </Card>
    </div>
  </div>
</template>
