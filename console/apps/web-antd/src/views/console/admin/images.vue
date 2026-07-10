<script lang="ts" setup>
import type { TableColumnsType } from 'ant-design-vue';

import { computed, onMounted, reactive, ref } from 'vue';

import {
  Button,
  Card,
  Input,
  InputNumber,
  InputSearch,
  message,
  Modal,
  Select,
  Space,
  Switch,
  Table,
  TabPane,
  Tabs,
  Tag,
  Textarea,
} from 'ant-design-vue';

import { adminRequestClient } from '#/api/admin-request';

defineOptions({ name: 'AdminImages' });

/** 生成作品（用户公开画廊）序列化视图，对齐旧版 AdminGalleryImageView */
interface AdminGalleryImageView {
  authorEmail: null | string;
  authorName: string;
  category: string;
  createdAt: string;
  creditCost: number;
  id: string;
  isDeleted: boolean;
  isPublic: boolean;
  jobStatus: string;
  promptZh: string;
  provider: string;
  publishedAt: null | string;
  ratio: string;
  takenDownAt: null | string;
  takenDownReason: null | string;
  thumbnailUrl: string;
  url: string;
}

/** 运营精选序列化视图，对齐旧版 AdminCuratedGalleryImageView */
interface AdminCuratedGalleryImageView {
  authorName: string;
  category: string;
  id: string;
  isActive: boolean;
  isDeleted: boolean;
  negativePrompt: null | string;
  promptEn: null | string;
  promptZh: string;
  ratio: string;
  sortOrder: number;
  sourceName: null | string;
  sourceUrl: null | string;
  summary: string;
  tags: string[];
  takenDownAt: null | string;
  takenDownReason: null | string;
  thumbnailUrl: string;
  title: string;
  url: string;
}

interface CuratedFormState {
  authorName: string;
  category: string;
  id: string;
  imageUrl: string;
  isActive: boolean;
  negativePrompt: string;
  promptEn: string;
  promptZh: string;
  ratio: string;
  sortOrder: number | undefined;
  sourceName: string;
  sourceUrl: string;
  summary: string;
  tags: string;
  thumbnailUrl: string;
  title: string;
}

const STATUS_OPTIONS = [
  { label: '全部', value: 'all' },
  { label: '已公开', value: 'public' },
  { label: '未公开', value: 'private' },
  { label: '已下架', value: 'taken_down' },
  { label: '已删除', value: 'deleted' },
];

const CATEGORY_OPTIONS = [
  '写真',
  '商品',
  '角色',
  '界面',
  '建筑',
  '插画',
  '国风',
  '其他',
].map((value) => ({ label: value, value }));

const RATIO_OPTIONS = ['1:1', '3:4', '4:3', '9:16', '16:9'].map((value) => ({
  label: value,
  value,
}));

/** ---------------- 生成作品 ---------------- */

const images = ref<AdminGalleryImageView[]>([]);
const imagesLoading = ref(false);
const statusFilter = ref('all');
const query = ref('');

const imageColumns: TableColumnsType = [
  { key: 'preview', title: '预览', width: 90 },
  { key: 'work', title: '作品', width: 340 },
  { key: 'authorEmail', title: '作者邮箱', width: 200 },
  { dataIndex: 'category', key: 'category', title: '分类', width: 90 },
  { key: 'status', title: '状态', width: 100 },
  { key: 'publishedAt', title: '发布时间', width: 180 },
  { fixed: 'right', key: 'action', title: '操作', width: 150 },
];

function imageStatusMeta(record: AdminGalleryImageView) {
  if (record.isDeleted) return { color: 'red', text: '已删除' };
  if (record.takenDownAt) return { color: 'orange', text: '已下架' };
  if (record.isPublic) return { color: 'green', text: '已公开' };
  return { color: 'default', text: '未公开' };
}

/** 仅公开且未下架/未删除的作品可人工下架 */
function canTakeDownImage(record: AdminGalleryImageView) {
  return record.isPublic && !record.takenDownAt && !record.isDeleted;
}

async function loadImages() {
  imagesLoading.value = true;
  try {
    const params: Record<string, number | string> = { limit: 80 };
    if (statusFilter.value !== 'all') params.status = statusFilter.value;
    if (query.value.trim()) params.q = query.value.trim();
    const data = await adminRequestClient.get<{
      images: AdminGalleryImageView[];
      ok: boolean;
    }>('/admin/images', { params });
    images.value = data.images ?? [];
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    imagesLoading.value = false;
  }
}

function updateImageRow(updated: AdminGalleryImageView) {
  const index = images.value.findIndex((item) => item.id === updated.id);
  if (index >= 0) images.value.splice(index, 1, updated);
}

/** ---------------- 下架弹窗（生成作品 / 运营精选共用） ---------------- */

const takeDownState = reactive({
  id: '',
  loading: false,
  mode: 'generated' as 'curated' | 'generated',
  open: false,
  reason: '',
  summary: '',
});

function openTakeDownModal(
  mode: 'curated' | 'generated',
  record: { id: string; promptZh?: string; title?: string },
) {
  takeDownState.mode = mode;
  takeDownState.id = record.id;
  takeDownState.summary = record.title || record.promptZh || record.id;
  takeDownState.reason = mode === 'generated' ? '管理员下架' : '运营暂不展示';
  takeDownState.open = true;
}

async function confirmTakeDown() {
  const reason =
    takeDownState.reason.trim() ||
    (takeDownState.mode === 'generated' ? '管理员下架' : '运营暂不展示');
  takeDownState.loading = true;
  try {
    if (takeDownState.mode === 'generated') {
      const data = await adminRequestClient.post<{
        image: AdminGalleryImageView;
        ok: boolean;
      }>(`/admin/images/${takeDownState.id}/take-down`, { reason });
      if (data.image) updateImageRow(data.image);
      message.success('作品已下架。');
    } else {
      // RequestClient 未提供 patch 快捷方法，走通用 request
      const data = await adminRequestClient.request<{
        image: AdminCuratedGalleryImageView;
        ok: boolean;
      }>(`/admin/gallery/curated/${takeDownState.id}`, {
        data: { reason },
        method: 'PATCH',
      });
      if (data.image) updateCuratedRow(data.image);
      message.success('运营精选作品已下架。');
    }
    takeDownState.open = false;
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    takeDownState.loading = false;
  }
}

/** ---------------- 运营精选 ---------------- */

const curatedImages = ref<AdminCuratedGalleryImageView[]>([]);
const curatedLoading = ref(false);
const curatedSaving = ref(false);
/** 行级操作 loading（删除） */
const curatedRowLoading = reactive<Record<string, boolean>>({});

function emptyCuratedForm(): CuratedFormState {
  return {
    authorName: '造图台',
    category: '其他',
    id: '',
    imageUrl: '',
    isActive: true,
    negativePrompt: '',
    promptEn: '',
    promptZh: '',
    ratio: '1:1',
    sortOrder: 0,
    sourceName: '运营精选',
    sourceUrl: '',
    summary: '',
    tags: '',
    thumbnailUrl: '',
    title: '',
  };
}

const curatedForm = reactive<CuratedFormState>(emptyCuratedForm());

const curatedColumns: TableColumnsType = [
  { key: 'preview', title: '预览', width: 90 },
  { key: 'title', title: '精选作品', width: 280 },
  { dataIndex: 'category', key: 'category', title: '分类', width: 90 },
  { dataIndex: 'sortOrder', key: 'sortOrder', title: '排序', width: 80 },
  { key: 'status', title: '状态', width: 100 },
  { fixed: 'right', key: 'action', title: '操作', width: 190 },
];

function curatedStatusMeta(record: AdminCuratedGalleryImageView) {
  if (record.isDeleted) return { color: 'red', text: '已删除' };
  if (record.takenDownAt || !record.isActive) {
    return { color: 'orange', text: '已下架' };
  }
  return { color: 'green', text: '展示中' };
}

async function loadCuratedImages() {
  curatedLoading.value = true;
  try {
    const data = await adminRequestClient.get<{
      images: AdminCuratedGalleryImageView[];
      ok: boolean;
    }>('/admin/gallery/curated', { params: { limit: 80 } });
    curatedImages.value = data.images ?? [];
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    curatedLoading.value = false;
  }
}

function updateCuratedRow(updated: AdminCuratedGalleryImageView) {
  const index = curatedImages.value.findIndex(
    (item) => item.id === updated.id,
  );
  if (index >= 0) {
    curatedImages.value.splice(index, 1, updated);
  } else {
    curatedImages.value.unshift(updated);
  }
}

function resetCuratedForm() {
  Object.assign(curatedForm, emptyCuratedForm());
}

/** 编辑：把列表行回填到左侧表单 */
function editCuratedImage(record: AdminCuratedGalleryImageView) {
  Object.assign(curatedForm, {
    authorName: record.authorName,
    category: record.category,
    id: record.id,
    imageUrl: record.url,
    isActive: record.isActive && !record.takenDownAt && !record.isDeleted,
    negativePrompt: record.negativePrompt || '',
    promptEn: record.promptEn || '',
    promptZh: record.promptZh,
    ratio: record.ratio,
    sortOrder: record.sortOrder,
    sourceName: record.sourceName || '运营精选',
    sourceUrl: record.sourceUrl || '',
    summary: record.summary,
    tags: record.tags.join(', '),
    thumbnailUrl: record.thumbnailUrl === record.url ? '' : record.thumbnailUrl,
    title: record.title,
  } satisfies CuratedFormState);
}

async function saveCuratedImage() {
  if (
    !curatedForm.title.trim() ||
    !curatedForm.summary.trim() ||
    !curatedForm.imageUrl.trim() ||
    !curatedForm.promptZh.trim()
  ) {
    message.warning('请填写标题、简介、图片地址和中文提示词。');
    return;
  }
  curatedSaving.value = true;
  try {
    const data = await adminRequestClient.post<{
      image: AdminCuratedGalleryImageView;
      ok: boolean;
    }>('/admin/gallery/curated', {
      authorName: curatedForm.authorName.trim(),
      category: curatedForm.category,
      id: curatedForm.id || undefined,
      imageUrl: curatedForm.imageUrl.trim(),
      isActive: curatedForm.isActive,
      negativePrompt: curatedForm.negativePrompt.trim(),
      promptEn: curatedForm.promptEn.trim(),
      promptZh: curatedForm.promptZh.trim(),
      ratio: curatedForm.ratio,
      sortOrder: Number(curatedForm.sortOrder ?? 0),
      sourceName: curatedForm.sourceName.trim(),
      sourceUrl: curatedForm.sourceUrl.trim(),
      summary: curatedForm.summary.trim(),
      tags: curatedForm.tags,
      thumbnailUrl: curatedForm.thumbnailUrl.trim(),
      title: curatedForm.title.trim(),
    });
    if (data.image) updateCuratedRow(data.image);
    resetCuratedForm();
    message.success('运营精选作品已保存。');
  } catch {
    // 错误已由 adminRequestClient 统一提示
  } finally {
    curatedSaving.value = false;
  }
}

function deleteCuratedImage(record: AdminCuratedGalleryImageView) {
  Modal.confirm({
    cancelText: '再想想',
    content: '确认删除这个运营精选作品吗？它会从公开作品流移除。',
    okText: '确认删除',
    okType: 'danger',
    title: '删除运营精选',
    onOk: async () => {
      curatedRowLoading[record.id] = true;
      try {
        const data = await adminRequestClient.delete<{
          image: AdminCuratedGalleryImageView;
          ok: boolean;
        }>(`/admin/gallery/curated/${record.id}`);
        if (data.image) updateCuratedRow(data.image);
        if (curatedForm.id === record.id) resetCuratedForm();
        message.success('运营精选作品已删除。');
      } finally {
        curatedRowLoading[record.id] = false;
      }
    },
  });
}

/** ---------------- 概览统计 ---------------- */

const stats = computed(() => ({
  curated: curatedImages.value.filter(
    (item) => item.isActive && !item.takenDownAt && !item.isDeleted,
  ).length,
  deleted: images.value.filter((item) => item.isDeleted).length,
  publicCount: images.value.filter(
    (item) => item.isPublic && !item.takenDownAt && !item.isDeleted,
  ).length,
  takenDown: images.value.filter((item) => item.takenDownAt).length,
  total: images.value.length,
}));

const statItems = computed(() => [
  { label: '全部作品', value: stats.value.total },
  { label: '已公开', value: stats.value.publicCount },
  { label: '运营精选', value: stats.value.curated },
  { label: '已下架', value: stats.value.takenDown },
  { label: '已删除', value: stats.value.deleted },
]);

function formatTime(value: null | string) {
  return value ? new Date(value).toLocaleString('zh-CN') : '未发布';
}

onMounted(() => {
  loadImages();
  loadCuratedImages();
});
</script>

<template>
  <div class="p-5">
    <div class="mb-4 grid grid-cols-2 gap-4 md:grid-cols-5">
      <Card v-for="item in statItems" :key="item.label" :bordered="false">
        <p class="text-sm text-gray-500">{{ item.label }}</p>
        <p class="mt-1 text-2xl font-semibold">{{ item.value }}</p>
      </Card>
    </div>

    <Card :bordered="false">
      <Tabs default-active-key="generated">
        <TabPane key="generated" tab="生成作品">
          <div class="mb-4 flex flex-wrap items-center gap-3">
            <span class="text-sm text-gray-500">状态</span>
            <Select
              v-model:value="statusFilter"
              :options="STATUS_OPTIONS"
              class="w-32"
              @change="loadImages"
            />
            <InputSearch
              v-model:value="query"
              :loading="imagesLoading"
              allow-clear
              class="w-72"
              enter-button="搜索"
              placeholder="邮箱、任务 ID、提示词"
              @search="loadImages"
            />
            <Button :loading="imagesLoading" @click="loadImages">刷新</Button>
          </div>

          <Table
            :columns="imageColumns"
            :data-source="images"
            :loading="imagesLoading"
            :pagination="{ pageSize: 10, showSizeChanger: false }"
            :scroll="{ x: 1150 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'preview'">
                <img
                  v-if="record.thumbnailUrl || record.url"
                  :src="record.thumbnailUrl || record.url"
                  alt="作品预览"
                  class="h-12 w-12 rounded object-cover"
                />
                <span v-else class="text-xs text-gray-400">无图</span>
              </template>

              <template v-else-if="column.key === 'work'">
                <p class="line-clamp-2 mb-1 text-sm">{{ record.promptZh }}</p>
                <p class="text-xs text-gray-400">
                  {{ record.provider }} · {{ record.ratio }} ·
                  {{ record.jobStatus }} · {{ record.creditCost }} 积分
                </p>
                <p v-if="record.takenDownReason" class="text-xs text-red-500">
                  下架原因：{{ record.takenDownReason }}
                </p>
              </template>

              <template v-else-if="column.key === 'authorEmail'">
                <span class="text-sm">
                  {{ record.authorEmail || record.authorName || '—' }}
                </span>
              </template>

              <template v-else-if="column.key === 'status'">
                <Tag
                  :color="imageStatusMeta(record as AdminGalleryImageView).color"
                >
                  {{ imageStatusMeta(record as AdminGalleryImageView).text }}
                </Tag>
              </template>

              <template v-else-if="column.key === 'publishedAt'">
                {{ formatTime(record.publishedAt) }}
              </template>

              <template v-else-if="column.key === 'action'">
                <Space>
                  <Button
                    :href="record.url"
                    size="small"
                    target="_blank"
                    type="link"
                  >
                    打开
                  </Button>
                  <Button
                    v-if="canTakeDownImage(record as AdminGalleryImageView)"
                    danger
                    size="small"
                    type="link"
                    @click="
                      openTakeDownModal(
                        'generated',
                        record as AdminGalleryImageView,
                      )
                    "
                  >
                    下架
                  </Button>
                </Space>
              </template>
            </template>

            <template #emptyText>暂无作品记录</template>
          </Table>
        </TabPane>

        <TabPane key="curated" tab="运营精选">
          <div class="grid gap-4 lg:grid-cols-[420px_1fr]">
            <Card size="small">
              <template #title>
                {{ curatedForm.id ? '编辑精选作品' : '新增精选作品' }}
              </template>

              <div class="space-y-3">
                <div>
                  <p class="mb-1 text-sm text-gray-500">
                    标题 <span class="text-red-500">*</span>
                  </p>
                  <Input
                    v-model:value="curatedForm.title"
                    placeholder="蓝白产品海报"
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">
                    简介 <span class="text-red-500">*</span>
                  </p>
                  <Textarea
                    v-model:value="curatedForm.summary"
                    :auto-size="{ maxRows: 4, minRows: 2 }"
                    placeholder="一句话介绍这幅作品"
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">
                    图片地址 <span class="text-red-500">*</span>
                  </p>
                  <Input
                    v-model:value="curatedForm.imageUrl"
                    placeholder="https://..."
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">缩略图地址</p>
                  <Input
                    v-model:value="curatedForm.thumbnailUrl"
                    placeholder="留空则使用原图"
                  />
                </div>

                <div class="grid grid-cols-3 gap-2">
                  <div>
                    <p class="mb-1 text-sm text-gray-500">分类</p>
                    <Select
                      v-model:value="curatedForm.category"
                      :options="CATEGORY_OPTIONS"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-gray-500">比例</p>
                    <Select
                      v-model:value="curatedForm.ratio"
                      :options="RATIO_OPTIONS"
                      class="w-full"
                    />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-gray-500">排序</p>
                    <InputNumber
                      v-model:value="curatedForm.sortOrder"
                      class="w-full"
                    />
                  </div>
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">
                    中文提示词 <span class="text-red-500">*</span>
                  </p>
                  <Textarea
                    v-model:value="curatedForm.promptZh"
                    :auto-size="{ maxRows: 6, minRows: 3 }"
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">英文提示词</p>
                  <Textarea
                    v-model:value="curatedForm.promptEn"
                    :auto-size="{ maxRows: 4, minRows: 2 }"
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">过滤指令（负面词）</p>
                  <Textarea
                    v-model:value="curatedForm.negativePrompt"
                    :auto-size="{ maxRows: 4, minRows: 2 }"
                  />
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">标签（逗号分隔）</p>
                  <Input
                    v-model:value="curatedForm.tags"
                    placeholder="蓝白, 产品, 留白"
                  />
                </div>

                <div class="grid grid-cols-2 gap-2">
                  <div>
                    <p class="mb-1 text-sm text-gray-500">作者</p>
                    <Input v-model:value="curatedForm.authorName" />
                  </div>
                  <div>
                    <p class="mb-1 text-sm text-gray-500">来源名称</p>
                    <Input v-model:value="curatedForm.sourceName" />
                  </div>
                </div>

                <div>
                  <p class="mb-1 text-sm text-gray-500">来源链接</p>
                  <Input
                    v-model:value="curatedForm.sourceUrl"
                    placeholder="可留空"
                  />
                </div>

                <div class="flex items-center gap-2">
                  <span class="text-sm text-gray-500">展示到作品流</span>
                  <Switch v-model:checked="curatedForm.isActive" />
                </div>

                <Space>
                  <Button
                    :loading="curatedSaving"
                    type="primary"
                    @click="saveCuratedImage"
                  >
                    {{ curatedForm.id ? '保存修改' : '添加精选' }}
                  </Button>
                  <Button @click="resetCuratedForm">重置</Button>
                  <Button :loading="curatedLoading" @click="loadCuratedImages">
                    刷新精选
                  </Button>
                </Space>
              </div>
            </Card>

            <Table
              :columns="curatedColumns"
              :data-source="curatedImages"
              :loading="curatedLoading"
              :pagination="{ pageSize: 10, showSizeChanger: false }"
              :scroll="{ x: 850 }"
              row-key="id"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'preview'">
                  <img
                    v-if="record.thumbnailUrl || record.url"
                    :src="record.thumbnailUrl || record.url"
                    alt="精选预览"
                    class="h-12 w-12 rounded object-cover"
                  />
                  <span v-else class="text-xs text-gray-400">无图</span>
                </template>

                <template v-else-if="column.key === 'title'">
                  <p class="mb-1 text-sm font-medium">{{ record.title }}</p>
                  <p class="line-clamp-2 text-xs text-gray-400">
                    {{ record.summary }}
                  </p>
                  <p v-if="record.takenDownReason" class="text-xs text-red-500">
                    下架原因：{{ record.takenDownReason }}
                  </p>
                </template>

                <template v-else-if="column.key === 'status'">
                  <Tag
                    :color="
                      curatedStatusMeta(record as AdminCuratedGalleryImageView)
                        .color
                    "
                  >
                    {{
                      curatedStatusMeta(record as AdminCuratedGalleryImageView)
                        .text
                    }}
                  </Tag>
                </template>

                <template v-else-if="column.key === 'action'">
                  <Space>
                    <Button
                      size="small"
                      type="link"
                      @click="
                        editCuratedImage(record as AdminCuratedGalleryImageView)
                      "
                    >
                      编辑
                    </Button>
                    <Button
                      v-if="
                        !record.isDeleted &&
                        !record.takenDownAt &&
                        record.isActive
                      "
                      size="small"
                      type="link"
                      @click="
                        openTakeDownModal(
                          'curated',
                          record as AdminCuratedGalleryImageView,
                        )
                      "
                    >
                      下架
                    </Button>
                    <Button
                      v-if="!record.isDeleted"
                      :loading="curatedRowLoading[record.id]"
                      danger
                      size="small"
                      type="link"
                      @click="
                        deleteCuratedImage(
                          record as AdminCuratedGalleryImageView,
                        )
                      "
                    >
                      删除
                    </Button>
                  </Space>
                </template>
              </template>

              <template #emptyText>暂无运营精选作品</template>
            </Table>
          </div>
        </TabPane>
      </Tabs>
    </Card>

    <Modal
      v-model:open="takeDownState.open"
      :confirm-loading="takeDownState.loading"
      :title="takeDownState.mode === 'generated' ? '下架作品' : '下架运营精选'"
      cancel-text="取消"
      ok-text="确认下架"
      ok-type="danger"
      @ok="confirmTakeDown"
    >
      <div class="mb-3 text-sm text-gray-500">
        即将下架：
        <p class="line-clamp-2 font-medium text-gray-700">
          {{ takeDownState.summary }}
        </p>
      </div>
      <Input
        v-model:value="takeDownState.reason"
        placeholder="请输入下架原因"
      />
    </Modal>
  </div>
</template>
