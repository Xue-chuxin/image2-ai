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
];

export default routes;
