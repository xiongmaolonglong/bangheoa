#!/bin/bash
# 户外广告派单系统 - 完整启动脚本 (Linux/Mac)

echo "========================================"
echo "户外广告派单系统 - 启动脚本"
echo "========================================"
echo

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "[错误] 未找到 Node.js，请先安装 Node.js 18+"
    exit 1
fi

echo "[1/5] 检查 Node 版本..."
node --version
echo

# 后端启动
echo "[2/5] 启动后端服务..."
cd backend

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装后端依赖..."
    npm install
fi

# 检查环境配置
if [ ! -f ".env" ]; then
    echo "创建默认环境配置..."
    cat > .env << EOF
PORT=3000
NODE_ENV=development
DB_HOST=localhost
DB_NAME=outdoor_ad_system
DB_USER=root
DB_PASSWORD=
JWT_SECRET=your_secret_key_change_in_production
EOF
    echo "请编辑 backend/.env 配置数据库连接"
fi

# 运行数据库迁移
if [ -f "migrations/20260409_add_indexes.js" ]; then
    echo "运行数据库索引优化..."
    node migrations/20260409_add_indexes.js
fi

# 启动后端
npm run dev &
BACKEND_PID=$!
echo "后端服务已启动 (PID: $BACKEND_PID): http://localhost:3000"
echo "API 文档: http://localhost:3000/api-docs"
echo

# 等待后端启动
sleep 3

# 前端启动
echo "[3/5] 启动前端服务..."
cd ../admin-web

# 检查依赖
if [ ! -d "node_modules" ]; then
    echo "安装前端依赖..."
    npm install
fi

# 启动前端
npm run dev &
FRONTEND_PID=$!
echo "前端服务已启动 (PID: $FRONTEND_PID): http://localhost:5173"
echo

echo "[4/5] 等待服务就绪..."
sleep 5

echo
echo "========================================"
echo "[5/5] 系统已启动完成！"
echo "========================================"
echo
echo "访问地址:"
echo "  前端管理后台: http://localhost:5173"
echo "  后端 API:     http://localhost:3000"
echo "  API 文档:     http://localhost:3000/api-docs"
echo
echo "默认管理员账号:"
echo "  用户名: admin"
echo "  密码:   admin123"
echo
echo "按 Ctrl+C 停止所有服务"

# 等待中断信号
trap "echo '停止服务...'; kill $BACKEND_PID $FRONTEND_PID; exit 0" INT TERM
wait