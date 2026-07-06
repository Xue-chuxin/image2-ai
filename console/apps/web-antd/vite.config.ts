import { defineConfig } from '@vben/vite-config';

export default defineConfig(async () => {
  return {
    application: {},
    vite: {
      server: {
        proxy: {
          '/api': {
            changeOrigin: true,
            // 开发模式代理到 Next.js 后端（同仓库根目录 npm run dev）
            target: 'http://localhost:3000',
            ws: true,
          },
        },
      },
    },
  };
});
