import type { RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
  {
    meta: {
      authority: ['admin', 'user'],
      icon: 'lucide:wallet-cards',
      order: 10,
      title: '用户中心',
    },
    name: 'AccountCenter',
    path: '/account',
    children: [
      {
        name: 'AccountOverview',
        path: 'overview',
        component: () => import('#/views/console/account/overview.vue'),
        meta: {
          icon: 'lucide:gauge',
          title: '积分总览',
        },
      },
    ],
  },
];

export default routes;
