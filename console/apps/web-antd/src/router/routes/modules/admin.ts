import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['admin'],
      icon: 'lucide:layout-dashboard',
      order: -1,
      title: '管理概览',
    },
    name: 'Dashboard',
    path: '/dashboard',
    component: () => import('#/views/console/dashboard/index.vue'),
  },
  {
    meta: {
      authority: ['admin'],
      icon: 'lucide:shield-check',
      order: 5,
      title: '管理后台',
    },
    name: 'AdminCenter',
    path: '/admin-center',
    children: [
      {
        name: 'AdminSettings',
        path: 'settings',
        component: () => import('#/views/console/admin/settings.vue'),
        meta: {
          icon: 'lucide:settings-2',
          title: '系统设置',
        },
      },
      {
        name: 'AdminUsers',
        path: 'users',
        component: () => import('#/views/console/admin/users.vue'),
        meta: {
          icon: 'lucide:users-round',
          title: '用户管理',
        },
      },
      {
        name: 'AdminJobs',
        path: 'jobs',
        component: () => import('#/views/console/admin/jobs.vue'),
        meta: {
          icon: 'lucide:list-checks',
          title: '任务管理',
        },
      },
      {
        name: 'AdminImages',
        path: 'images',
        component: () => import('#/views/console/admin/images.vue'),
        meta: {
          icon: 'lucide:images',
          title: '图片管理',
        },
      },
      {
        name: 'AdminUploads',
        path: 'uploads',
        component: () => import('#/views/console/admin/uploads.vue'),
        meta: {
          icon: 'lucide:upload-cloud',
          title: '上传管理',
        },
      },
      {
        name: 'AdminBilling',
        path: 'billing',
        component: () => import('#/views/console/admin/billing.vue'),
        meta: {
          icon: 'lucide:credit-card',
          title: '账单管理',
        },
      },
      {
        name: 'AdminPayments',
        path: 'payments',
        component: () => import('#/views/console/admin/payments.vue'),
        meta: {
          icon: 'lucide:activity',
          title: '支付诊断',
        },
      },
      {
        name: 'AdminHealth',
        path: 'health',
        component: () => import('#/views/console/admin/health.vue'),
        meta: {
          icon: 'lucide:heart-pulse',
          title: '系统自检',
        },
      },
      {
        name: 'AdminRelays',
        path: 'relays',
        component: () => import('#/views/console/admin/relays.vue'),
        meta: {
          icon: 'lucide:waypoints',
          title: '中转站推荐',
        },
      },
    ],
  },
];

export default routes;
