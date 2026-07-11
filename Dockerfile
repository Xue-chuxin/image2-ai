# syntax=docker/dockerfile:1
FROM node:20-bookworm-slim AS deps

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY package.json package-lock.json ./
RUN --mount=type=cache,target=/root/.npm \
    npm ci --ignore-scripts

FROM node:22-bookworm-slim AS console-builder

WORKDIR /console

# 控制台（vben）要求 Node >= 22，使用 corepack 提供的 pnpm 构建
RUN corepack enable pnpm

COPY console/ ./
# 挂载持久化 pnpm store：网络波动导致某次安装超时后，重试可复用已下载的包，
# 不必从零开始（对海外主机与国内增量构建都有益）。
RUN --mount=type=cache,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile
RUN pnpm run build:antd

FROM node:20-bookworm-slim AS builder

WORKDIR /app

ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

FROM node:20-bookworm-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    libgtk-3-0 \
    libnss3 \
    libnspr4 \
    libasound2 \
    libgbm1 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libpango-1.0-0 \
    libcairo2 \
    libatk-bridge2.0-0 \
    libatspi2.0-0 \
    libcups2 \
    libxfixes3 \
    libdbus-1-3 \
    libx11-xcb1 \
    libxcb-dri3-0 \
    libxcb1 \
    fonts-liberation \
    && rm -rf /var/lib/apt/lists/*

ENV CHROME_EXECUTABLE_PATH=/usr/bin/chromium
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/package-lock.json ./package-lock.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=console-builder /console/apps/web-antd/dist ./public/console
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/scripts ./scripts
COPY scripts/docker-entrypoint.sh /app/scripts/docker-entrypoint.sh

RUN chmod +x /app/scripts/docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["/app/scripts/docker-entrypoint.sh"]
CMD ["npm", "run", "start:prod"]
