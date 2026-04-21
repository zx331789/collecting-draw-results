#!/bin/bash

# Fly.io 部署脚本
# 用法：sh fly-deploy.sh

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# ──────────────────────────────────────────
# 工具检查
# ──────────────────────────────────────────
if ! command -v flyctl &>/dev/null && ! command -v fly &>/dev/null; then
  echo "错误：未找到 flyctl，请先安装：brew install flyctl"
  exit 1
fi

FLY="$(command -v flyctl 2>/dev/null || command -v fly)"

if ! $FLY auth whoami &>/dev/null; then
  echo "未登录，请先执行：fly auth login"
  exit 1
fi

# ──────────────────────────────────────────
# 构建
# ──────────────────────────────────────────
if [ ! -d "$PROJECT_ROOT/build" ]; then
  echo "build 目录不存在，开始构建..."
  pnpm build
else
  read -p "是否重新构建 TypeScript？(y/N): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "重新构建..."
    pnpm build
  fi
fi

# ──────────────────────────────────────────
# 首次初始化 / 直接部署
# ──────────────────────────────────────────
if [ ! -f "$PROJECT_ROOT/fly.toml" ]; then
  echo ""
  echo "未检测到 fly.toml，开始首次初始化..."
  echo "提示："
  echo "  - App name：自定义，例如 netdisk-session-service"
  echo "  - Region：nrt（东京）或 hkg（香港）"
  echo "  - Database：选 No"
  echo "  - Overwrite Dockerfile：选 No"
  echo ""
  $FLY launch --no-deploy

  # 自动修正 fly.toml 中的内部端口为 3010
  if [ -f "$PROJECT_ROOT/fly.toml" ]; then
    sed -i.bak 's/internal_port = [0-9]*/internal_port = 3010/' "$PROJECT_ROOT/fly.toml" && rm -f "$PROJECT_ROOT/fly.toml.bak"
    echo "已将 fly.toml internal_port 设置为 3010"
  fi

  echo ""
  echo "──────────────────────────────────────────"
  echo "请设置必要的环境变量（Secrets）："
  echo "──────────────────────────────────────────"
  echo ""
  read -p "MONGODB_URI（必填）: " MONGODB_URI
  if [ -z "$MONGODB_URI" ]; then
    echo "错误：MONGODB_URI 不能为空"
    exit 1
  fi

  read -p "API_KEY（选填，直接回车跳过）: " API_KEY
  read -p "LOGIN_PROXY_URL（选填，直接回车跳过）: " LOGIN_PROXY_URL
  read -p "CORS_ORIGIN（选填，默认 *）: " CORS_ORIGIN
  CORS_ORIGIN="${CORS_ORIGIN:-*}"

  SECRET_ARGS="MONGODB_URI=$MONGODB_URI PORT=3010 CORS_ORIGIN=$CORS_ORIGIN"
  [ -n "$API_KEY" ] && SECRET_ARGS="$SECRET_ARGS API_KEY=$API_KEY"
  [ -n "$LOGIN_PROXY_URL" ] && SECRET_ARGS="$SECRET_ARGS LOGIN_PROXY_URL=$LOGIN_PROXY_URL"

  echo ""
  echo "写入 Secrets..."
  eval "$FLY secrets set $SECRET_ARGS"
fi

# ──────────────────────────────────────────
# 部署
# ──────────────────────────────────────────
echo ""
echo "开始部署到 Fly.io..."
$FLY deploy

echo ""
echo "部署完成！"
echo ""
echo "常用命令："
echo "  fly status   - 查看运行状态"
echo "  fly logs     - 查看实时日志"
echo "  fly open     - 打开应用域名"
