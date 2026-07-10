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
      {
        name: 'AccountRecharge',
        path: 'recharge',
        component: () => import('#/views/console/account/recharge.vue'),
        meta: {
          icon: 'lucide:zap',
          title: '积分充值',
        },
      },
      {
        name: 'AccountOrders',
        path: 'orders',
        component: () => import('#/views/console/account/orders.vue'),
        meta: {
          icon: 'lucide:receipt-text',
          title: '充值订单',
        },
      },
      {
        name: 'AccountTransactions',
        path: 'transactions',
        component: () => import('#/views/console/account/transactions.vue'),
        meta: {
          icon: 'lucide:list-ordered',
          title: '积分流水',
        },
      },
      {
        name: 'AccountProfile',
        path: 'profile',
        component: () => import('#/views/console/account/profile.vue'),
        meta: {
          icon: 'lucide:user-round-cog',
          title: '账号安全',
        },
      },
    ],
  },
];

export default routes;
