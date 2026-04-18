#!/bin/bash

# ============================================
# 广告工程全流程管理系统 - 部署脚本
# ============================================

set -e

echo "========================================"
echo "开始部署..."
echo "========================================"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "错误: 未安装 Node.js"
    exit 1
fi

echo "Node 版本: $(node -v)"
echo "NPM 版本: $(npm -v)"

# 1. 安装依赖
echo ""
echo "[1/6] 安装后端依赖..."
cd backend
npm install --production

echo ""
echo "[2/6] 安装前端依赖..."
cd ../admin-web
npm install

# 2. 构建前端
echo ""
echo "[3/6] 构建管理后台..."
npm run build

# 3. 运行数据库迁移
echo ""
echo "[4/6] 运行数据库迁移..."
cd ../backend
npx sequelize-cli db:migrate

# 4. 运行配置种子（默认配置）
echo ""
echo "[5/6] 填充默认配置..."
npx sequelize-cli db:seed:all

# 5. PM2 启动后端
echo ""
echo "[6/6] 启动后端服务..."
pm2 start ecosystem.config.js --env production
pm2 save

echo ""
echo "========================================"
echo "部署完成！"
echo "========================================"
echo ""
echo "访问地址:"
echo "  - 后端 API: http://你的服务器IP:3000"
echo "  - 管理后台: 配置 Nginx 指向 admin-web/dist"
echo ""
echo "常用命令:"
echo "  - 查看日志: pm2 logs backend"
echo "  - 重启服务: pm2 restart backend"
echo "  - 停止服务: pm2 stop backend"
echo ""
