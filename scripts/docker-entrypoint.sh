#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ]; then
  echo "Running Prisma migrations..."
  npx prisma migrate deploy
else
  echo "DATABASE_URL is not set. Skip Prisma migrations."
fi

exec "$@"
