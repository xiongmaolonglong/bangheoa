#!/bin/bash
# 一键启动开发服务 - Git Bash 版本
# 用法: bash dev.sh

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

# 检查端口是否已被占用
check_port() {
  if netstat -an 2>/dev/null | grep -q ":$1 "; then
    return 0  # 端口已被占用
  fi
  return 1
}

echo "========================================="
echo "  广告工程管理系统 - 开发服务"
echo "========================================="
echo ""

# 启动后端
if check_port 3000; then
  echo "[后端] 已在运行中 (端口 3000)"
else
  echo "[后端] 启动中..."
  cd "$ROOT_DIR/backend"
  npm run dev &
  echo "[后端] 已启动 (PID: $!)"
fi

sleep 2

# 启动前端
if check_port 5173; then
  echo "[前端] 已在运行中 (端口 5173)"
else
  echo "[前端] 启动中..."
  cd "$ROOT_DIR/admin-web"
  npm run dev &
  echo "[前端] 已启动 (PID: $!)"
fi

echo ""
echo "========================================="
echo "  服务已就绪，可关闭此终端"
echo "  后端: http://localhost:3000"
echo "  前端: http://localhost:5173"
echo "========================================="

wait
