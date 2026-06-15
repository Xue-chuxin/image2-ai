#!/bin/bash
set -euo pipefail

APP_DIR="${APP_DIR:-$(cd "$(dirname "$0")" && pwd)}"
PORT="${PORT:-3000}"

cd "$APP_DIR"

echo "=== Image2 启动脚本 ==="
echo "应用目录：$APP_DIR"
echo "生产部署推荐优先使用：docker compose up -d --build"

if [ -f ".env.production" ]; then
  set -a
  # shellcheck disable=SC1091
  source ".env.production"
  set +a
fi

if [ "${RUN_DB_MIGRATIONS:-1}" = "1" ] && [ -n "${DATABASE_URL:-}" ]; then
  echo "执行数据库迁移..."
  npm run db:migrate
fi

if [ "${START_XVFB:-0}" = "1" ] && ! pgrep -x Xvfb >/dev/null 2>&1; then
  echo "启动 Xvfb 虚拟显示器..."
  nohup Xvfb :99 -screen 0 1920x1080x24 > /dev/null 2>&1 &
  export DISPLAY="${DISPLAY:-:99}"
fi

echo "启动 Next.js 生产模式，端口：$PORT"
npm run start -- --hostname 0.0.0.0 --port "$PORT"
