#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

ENV_FILE=".env.production"
EXAMPLE_FILE=".env.example"

ASSUME_YES=0
CONFIG_ONLY=0

usage() {
  cat <<'USAGE'
Usage: ./install.sh [选项]

交互式 Docker 安装器：问答式生成 .env.production、自动生成密钥/密码、
正确拼接 DATABASE_URL、选对 compose 文件并一键起服务。

选项:
  --yes           非交互模式，全部使用默认值/环境变量，不再提问（便于自动化）。
  --config-only   只生成 .env.production 并打印将要执行的 compose 命令，
                  不真正 build/up（便于本地验证或「先看后起」）。
  -h, --help      显示本帮助。

可用环境变量（配合 --yes 使用）:
  SITE_URL        站点访问地址（默认 http://localhost:3000）
  ADMIN_EMAIL     管理员邮箱（默认 admin@example.com）
  ADMIN_PASSWORD  管理员密码（默认自动生成）
  DB_MODE         数据库模式：builtin（内置 Postgres，默认）或 external（已有数据库）
  DATABASE_URL    DB_MODE=external 时必填，完整的数据库连接串
USAGE
}

while [ $# -gt 0 ]; do
  case "$1" in
    --yes|-y)
      ASSUME_YES=1
      ;;
    --config-only)
      CONFIG_ONLY=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "未知参数: $1"
      usage
      exit 1
      ;;
  esac
  shift
done

# ---------------------------------------------------------------------------
# 工具函数
# ---------------------------------------------------------------------------

# 逐项覆盖 .env 文件里的某个 key（值按字面写入，规避 sed -i 的 GNU/BSD 差异 + 特殊字符）。
# 用 awk 精确匹配 ^KEY= 整行替换、没有则追加，输出到 mktemp 再 mv 回去。
set_env() { # key val file
  local tmp
  tmp="$(mktemp)"
  awk -v k="$1" -v v="$2" '
    $0 ~ "^"k"=" { print k"=\""v"\""; d=1; next } { print }
    END{ if(!d) print k"=\""v"\"" }' "$3" > "$tmp" && mv "$tmp" "$3"
}

# 生成一段 hex 随机串（默认 48 位十六进制，满足 ≥32 位且不含 / + =）。
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -hex 24
  elif [ -r /dev/urandom ] && command -v xxd >/dev/null 2>&1; then
    head -c 32 /dev/urandom | xxd -p | tr -d '\n'
  else
    echo "警告：未找到 openssl / xxd，回退使用较弱的随机源生成密钥，建议安装 openssl 后重新生成。" >&2
    echo "$(date +%s)$RANDOM$RANDOM$RANDOM$RANDOM" | tr -d '\n'
  fi
}

# 交互式提问，回车取默认值。--yes 模式下直接用默认值。
ask() { # prompt default -> echo answer
  local prompt="$1" default="$2" answer=""
  if [ "$ASSUME_YES" -eq 1 ]; then
    echo "$default"
    return
  fi
  if [ -n "$default" ]; then
    printf '%s [%s]: ' "$prompt" "$default" >&2
  else
    printf '%s: ' "$prompt" >&2
  fi
  read -r answer || answer=""
  if [ -z "$answer" ]; then
    echo "$default"
  else
    echo "$answer"
  fi
}

# 从 URL 中解析端口，解析不到则回退 3000。
port_from_url() { # url -> echo port
  local url="$1" hostport port
  # 去掉 scheme:// 前缀和路径
  hostport="${url#*://}"
  hostport="${hostport%%/*}"
  case "$hostport" in
    *:*)
      port="${hostport##*:}"
      if [ -n "$port" ] && [ "$port" -eq "$port" ] 2>/dev/null; then
        echo "$port"
        return
      fi
      ;;
  esac
  echo "3000"
}

# ---------------------------------------------------------------------------
# 1. 欢迎横幅
# ---------------------------------------------------------------------------

echo "============================================================"
echo "  Image2 AI 生图系统 · 一键 Docker 安装器"
echo "============================================================"
echo "本向导将帮你完成："
echo "  1) 检查 Docker / Docker Compose 环境"
echo "  2) 问答式收集站点地址、管理员账号、数据库模式"
echo "  3) 自动生成登录密钥与数据库密码、写好 .env.production"
echo "  4) 选对 compose 文件并一键启动服务"
echo ""

# ---------------------------------------------------------------------------
# 2. 前置检查
# ---------------------------------------------------------------------------

if ! command -v docker >/dev/null 2>&1; then
  echo "错误：未检测到 docker。请先安装 Docker：https://docs.docker.com/get-docker/"
  exit 1
fi

if ! docker compose version >/dev/null 2>&1; then
  echo "错误：未检测到 Docker Compose v2（docker compose）。"
  echo "请升级到自带 Compose v2 的 Docker，或参考：https://docs.docker.com/compose/install/"
  exit 1
fi

if [ ! -f "$EXAMPLE_FILE" ]; then
  echo "错误：未找到 ${EXAMPLE_FILE}，请在仓库根目录运行本脚本。"
  exit 1
fi

echo "环境检查通过：docker 与 docker compose 均可用。"
echo ""

# ---------------------------------------------------------------------------
# 3. .env.production 已存在处理
# ---------------------------------------------------------------------------

SKIP_GENERATE=0
if [ -f "$ENV_FILE" ]; then
  echo "检测到已存在的 ${ENV_FILE}。"
  choice="1"
  if [ "$ASSUME_YES" -eq 1 ]; then
    choice="1"
  else
    echo "  1) 覆盖（会先备份现有文件）"
    echo "  2) 保留沿用（跳过生成，直接起服务）"
    echo "  3) 退出"
    choice="$(ask "请选择" "1")"
  fi
  case "$choice" in
    2)
      SKIP_GENERATE=1
      echo "将保留现有 ${ENV_FILE}，跳过配置生成。"
      ;;
    3)
      echo "已退出。"
      exit 0
      ;;
    *)
      backup="${ENV_FILE}.bak.$(date +%Y%m%d-%H%M%S)"
      cp "$ENV_FILE" "$backup"
      echo "已备份现有文件到：$backup"
      ;;
  esac
  echo ""
fi

# ---------------------------------------------------------------------------
# 4-9. 收集配置并写入 .env.production
# ---------------------------------------------------------------------------

COMPOSE_ARGS=()
ADMIN_PASSWORD_GENERATED=0

if [ "$SKIP_GENERATE" -eq 0 ]; then
  # 4. 站点访问地址
  site_url="$(ask "站点访问地址 (NEXT_PUBLIC_SITE_URL)" "${SITE_URL:-http://localhost:3000}")"
  app_port="$(port_from_url "$site_url")"

  # 5. 管理员邮箱
  admin_email="$(ask "管理员邮箱 (ADMIN_EMAIL)" "${ADMIN_EMAIL:-admin@example.com}")"

  # 6. 管理员密码（回车＝自动生成）
  admin_password="${ADMIN_PASSWORD:-}"
  if [ "$ASSUME_YES" -eq 0 ]; then
    admin_password="$(ask "管理员密码 (ADMIN_PASSWORD，回车＝自动生成)" "")"
  fi
  if [ -z "$admin_password" ]; then
    admin_password="$(gen_secret)"
    ADMIN_PASSWORD_GENERATED=1
  fi

  # 7. 数据库模式
  db_mode="${DB_MODE:-builtin}"
  if [ "$ASSUME_YES" -eq 0 ]; then
    echo ""
    echo "数据库模式："
    echo "  1) 内置 Postgres（推荐，随 compose 一起启动数据库）"
    echo "  2) 已有数据库（连接你自己的 PostgreSQL / RDS）"
    db_choice="$(ask "请选择" "1")"
    case "$db_choice" in
      2) db_mode="external" ;;
      *) db_mode="builtin" ;;
    esac
  fi

  postgres_password=""
  database_url=""
  if [ "$db_mode" = "external" ]; then
    database_url="${DATABASE_URL:-}"
    if [ "$ASSUME_YES" -eq 0 ]; then
      echo "请粘贴完整的 DATABASE_URL。若数据库在宿主机上，请把主机名写成 host.docker.internal。"
      echo "示例：postgresql://user:password@host.docker.internal:5432/image2_app"
      database_url="$(ask "DATABASE_URL" "$database_url")"
    fi
    if [ -z "$database_url" ]; then
      echo "错误：已有数据库模式下必须提供 DATABASE_URL。"
      exit 1
    fi
    COMPOSE_ARGS=(-f docker-compose.web.yml)
  else
    postgres_password="$(gen_secret)"
    database_url="postgresql://image2_app:${postgres_password}@postgres:5432/image2_app"
    COMPOSE_ARGS=()
  fi

  # 8. 生成密钥
  auth_secret="$(gen_secret)"
  settings_key="$(gen_secret)"

  # 9. 写 .env.production
  echo ""
  echo "正在生成 $ENV_FILE ..."
  cp "$EXAMPLE_FILE" "$ENV_FILE"
  set_env "AUTH_SECRET" "$auth_secret" "$ENV_FILE"
  set_env "SETTINGS_ENCRYPTION_KEY" "$settings_key" "$ENV_FILE"
  set_env "NEXT_PUBLIC_SITE_URL" "$site_url" "$ENV_FILE"
  set_env "APP_PORT" "$app_port" "$ENV_FILE"
  set_env "ADMIN_EMAIL" "$admin_email" "$ENV_FILE"
  set_env "ADMIN_PASSWORD" "$admin_password" "$ENV_FILE"
  set_env "DATABASE_URL" "$database_url" "$ENV_FILE"
  if [ "$db_mode" = "builtin" ]; then
    set_env "POSTGRES_PASSWORD" "$postgres_password" "$ENV_FILE"
  fi
  echo "$ENV_FILE 已生成。"
else
  # 保留沿用：根据现有文件推断 compose 文件（默认内置库）。
  admin_email="$(grep -E '^ADMIN_EMAIL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"')"
  site_url="$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$ENV_FILE" | head -n1 | cut -d= -f2- | tr -d '"')"
  admin_password=""
  COMPOSE_ARGS=()
fi

# ---------------------------------------------------------------------------
# 10. 起服务（或仅打印命令）
# ---------------------------------------------------------------------------

echo ""
compose_display="docker compose --env-file $ENV_FILE"
if [ "${#COMPOSE_ARGS[@]}" -gt 0 ]; then
  compose_display="$compose_display ${COMPOSE_ARGS[*]}"
fi

if [ "$CONFIG_ONLY" -eq 1 ]; then
  echo "[--config-only] 已跳过构建与启动。将要执行的命令是："
  echo "  $compose_display up -d --build"
else
  echo "正在构建并启动服务（首次构建镜像可能需要数分钟）..."
  echo "  $compose_display up -d --build"
  docker compose --env-file "$ENV_FILE" "${COMPOSE_ARGS[@]}" up -d --build
fi

# ---------------------------------------------------------------------------
# 11. 结尾摘要
# ---------------------------------------------------------------------------

echo ""
echo "============================================================"
echo "  安装完成"
echo "============================================================"
echo "站点地址：${site_url:-http://localhost:3000}"
echo "管理员邮箱：${admin_email:-admin@example.com}"
if [ "$SKIP_GENERATE" -eq 0 ]; then
  if [ "$ADMIN_PASSWORD_GENERATED" -eq 1 ]; then
    echo "管理员密码（自动生成，请立即保存）：$admin_password"
  else
    echo "管理员密码：$admin_password"
  fi
else
  echo "管理员密码：沿用现有 ${ENV_FILE}（如遗忘请查看该文件）"
fi
echo ""
echo "下一步："
echo "  1) 打开站点，用上面的管理员邮箱/密码登录。"
echo "  2) 到 /console 配置生图 API Key（后台加密保存）。"
echo ""
echo "常用命令："
echo "  查看日志：$compose_display logs -f web"
echo "  停止服务：$compose_display down"
echo ""
