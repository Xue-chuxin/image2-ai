#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'USAGE'
Usage: bash scripts/update.sh [source|docker|docker-web]

Modes:
  source      Pull latest code, install dependencies, run Prisma migration, build.
  docker      Pull latest code, rebuild full Docker Compose stack.
  docker-web  Pull latest code, rebuild docker-compose.web.yml only.

Optional:
  IMAGE2_ENV_FILE=.env.production bash scripts/update.sh source
USAGE
}

MODE="${1:-source}"

if [ "$MODE" = "-h" ] || [ "$MODE" = "--help" ]; then
  usage
  exit 0
fi

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

ENV_FILE="${IMAGE2_ENV_FILE:-}"
if [ -z "$ENV_FILE" ]; then
  if [ -f ".env.production" ]; then
    ENV_FILE=".env.production"
  elif [ -f ".env.local" ]; then
    ENV_FILE=".env.local"
  elif [ -f ".env" ]; then
    ENV_FILE=".env"
  fi
fi

ensure_clean_worktree() {
  local status
  status="$(git status --porcelain --untracked-files=all)"

  if [ -n "$status" ]; then
    echo "当前工作区存在未提交改动，升级已停止。"
    echo "请先提交、合并或备份自己的二开改动后再执行升级。"
    git status --short
    exit 1
  fi
}

load_env_file() {
  if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    set -a
    # shellcheck disable=SC1090
    . "$ENV_FILE"
    set +a
    echo "已加载环境变量文件: $ENV_FILE"
  else
    echo "未找到环境变量文件，继续使用当前 shell 环境。"
  fi
}

pull_latest() {
  ensure_clean_worktree
  echo "拉取最新代码..."
  git pull --ff-only
}

docker_compose() {
  if [ -n "$ENV_FILE" ] && [ -f "$ENV_FILE" ]; then
    docker compose --env-file "$ENV_FILE" "$@"
  else
    docker compose "$@"
  fi
}

run_source_update() {
  load_env_file
  pull_latest

  echo "安装依赖..."
  npm ci

  echo "生成 Prisma Client..."
  npm run prisma:generate

  echo "执行数据库迁移..."
  npm run db:migrate

  echo "构建生产版本..."
  npm run build

  echo "源码升级流程已完成，请按你的部署方式重启服务。"
}

run_docker_update() {
  pull_latest

  echo "重建并启动 Docker Compose 服务..."
  docker_compose up -d --build
  docker_compose logs --tail=80 web

  echo "Docker Compose 升级流程已完成。"
}

run_docker_web_update() {
  pull_latest

  echo "重建并启动 Web 服务..."
  docker_compose -f docker-compose.web.yml up -d --build
  docker_compose -f docker-compose.web.yml logs --tail=80 web

  echo "Docker Web 升级流程已完成。"
}

case "$MODE" in
  source)
    run_source_update
    ;;
  docker)
    run_docker_update
    ;;
  docker-web)
    run_docker_web_update
    ;;
  *)
    usage
    exit 1
    ;;
esac
