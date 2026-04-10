@echo off
REM 户外广告派单系统 - 完整启动脚本

echo ========================================
echo 户外广告派单系统 - 启动脚本
echo ========================================
echo.

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [错误] 未找到 Node.js，请先安装 Node.js 18+
    pause
    exit /b 1
)

echo [1/5] 检查 Node 版本...
node --version
echo.

REM 后端启动
echo [2/5] 启动后端服务...
cd backend

REM 检查依赖
if not exist "node_modules" (
    echo 安装后端依赖...
    call npm install
)

REM 检查环境配置
if not exist ".env" (
    echo 创建默认环境配置...
    (
        echo PORT=3000
        echo NODE_ENV=development
        echo DB_HOST=localhost
        echo DB_NAME=outdoor_ad_system
        echo DB_USER=root
        echo DB_PASSWORD=
        echo JWT_SECRET=your_secret_key_change_in_production
    ) > .env
    echo 请编辑 backend/.env 配置数据库连接
)

REM 运行数据库迁移（可选）
if exist "migrations\20260409_add_indexes.js" (
    echo 运行数据库索引优化...
    node migrations/20260409_add_indexes.js
)

REM 启动后端
start "Backend Server" cmd /k "npm run dev"
echo 后端服务已启动: http://localhost:3000
echo API 文档: http://localhost:3000/api-docs
echo.

REM 等待后端启动
timeout /t 3 /nobreak >nul

REM 前端启动
echo [3/5] 启动前端服务...
cd ..\admin-web

REM 检查依赖
if not exist "node_modules" (
    echo 安装前端依赖...
    call npm install
)

REM 启动前端
start "Frontend Server" cmd /k "npm run dev"
echo 前端服务已启动: http://localhost:5173
echo.

echo [4/5] 等待服务就绪...
timeout /t 5 /nobreak >nul

echo.
echo ========================================
echo [5/5] 系统已启动完成！
echo ========================================
echo.
echo 访问地址:
echo   前端管理后台: http://localhost:5173
echo   后端 API:     http://localhost:3000
echo   API 文档:     http://localhost:3000/api-docs
echo.
echo 默认管理员账号:
echo   用户名: admin
echo   密码:   123456
echo.
echo 按任意键打开管理后台...
pause >nul

start http://localhost:5173

exit /b 0