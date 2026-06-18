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

get_web_container_id() {
  docker_compose "$@" ps --all -q web 2>/dev/null | awk 'NR == 1 { print; exit }' || true
}

container_has_mount() {
  local container_id="$1"
  local destination="$2"

  docker inspect "$container_id" --format '{{range .Mounts}}{{println .Destination}}{{end}}' 2>/dev/null | grep -Fxq "$destination"
}

prepare_storage_backup() {
  local mode="$1"
  shift

  local container_id
  container_id="$(get_web_container_id "$@")"

  if [ -z "$container_id" ]; then
    echo "未发现旧 Web 容器，跳过图片目录迁移备份。"
    return
  fi

  if container_has_mount "$container_id" "/app/public/storage/generated" || container_has_mount "$container_id" "/app/public/storage/uploads"; then
    echo "Web 容器已使用新的图片存储挂载路径，跳过图片目录迁移备份。"
    return
  fi

  if ! container_has_mount "$container_id" "/app/public/generated" && ! container_has_mount "$container_id" "/app/public/uploads"; then
    echo "未检测到旧版图片 volume 挂载路径，跳过图片目录迁移备份。"
    return
  fi

  local backup_root
  backup_root="${IMAGE2_STORAGE_BACKUP_DIR:-$ROOT_DIR/.image2-storage-backups}"

  local backup_dir
  backup_dir="$backup_root/$(date +%Y%m%d-%H%M%S)-$mode"
  mkdir -p "$backup_dir"

  echo "检测到旧版图片 volume 挂载路径，正在备份旧容器内 /app/public/storage ..."
  if docker cp "$container_id:/app/public/storage/." "$backup_dir/"; then
    IMAGE2_STORAGE_MIGRATION_BACKUP="$backup_dir"
    echo "图片目录已备份到: $backup_dir"
  else
    echo "图片目录备份失败，升级已停止。请先手动备份旧容器内 /app/public/storage 后再重试。"
    exit 1
  fi
}

restore_storage_backup() {
  if [ -z "${IMAGE2_STORAGE_MIGRATION_BACKUP:-}" ]; then
    return
  fi

  local container_id
  container_id="$(get_web_container_id "$@")"

  if [ -z "$container_id" ]; then
    echo "未找到重建后的 Web 容器，无法回填图片备份。备份保留在: $IMAGE2_STORAGE_MIGRATION_BACKUP"
    exit 1
  fi

  if [ -z "$(find "$IMAGE2_STORAGE_MIGRATION_BACKUP" -mindepth 1 -print -quit)" ]; then
    echo "图片备份目录为空，无需回填。"
    return
  fi

  echo "正在把图片备份回填到新容器 /app/public/storage ..."
  if docker cp "$IMAGE2_STORAGE_MIGRATION_BACKUP/." "$container_id:/app/public/storage/"; then
    echo "图片目录已回填到新的 storage volume。备份仍保留在: $IMAGE2_STORAGE_MIGRATION_BACKUP"
  else
    echo "图片目录回填失败。备份保留在: $IMAGE2_STORAGE_MIGRATION_BACKUP"
    exit 1
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
  prepare_storage_backup "docker"

  echo "重建并启动 Docker Compose 服务..."
  docker_compose up -d --build
  restore_storage_backup
  docker_compose logs --tail=80 web

  echo "Docker Compose 升级流程已完成。"
}

run_docker_web_update() {
  pull_latest
  prepare_storage_backup "docker-web" -f docker-compose.web.yml

  echo "重建并启动 Web 服务..."
  docker_compose -f docker-compose.web.yml up -d --build
  restore_storage_backup -f docker-compose.web.yml
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
