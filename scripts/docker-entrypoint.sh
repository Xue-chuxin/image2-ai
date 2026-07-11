#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  # 数据库容器可能还没就绪（首次启动/重启），对迁移做有限次重试，避免容器直接崩溃退出。
  attempt=1
  max_attempts="${PRISMA_MIGRATE_MAX_ATTEMPTS:-10}"
  retry_delay="${PRISMA_MIGRATE_RETRY_DELAY:-3}"
  until npx prisma migrate deploy; do
    if [ "$attempt" -ge "$max_attempts" ]; then
      echo "Prisma migrations failed after ${attempt} attempts. Giving up."
      exit 1
    fi
    echo "Database not ready yet (attempt ${attempt}/${max_attempts}). Retrying in ${retry_delay}s..."
    attempt=$((attempt + 1))
    sleep "$retry_delay"
  done
else
  echo "DATABASE_URL is not set. Skip Prisma migrations."
fi

exec "$@"
