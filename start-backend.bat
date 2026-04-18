@echo off
echo 正在启动后端服务...

REM 先停止所有已有的后端进程
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

REM 启动后端
cd backend
if exist node_modules\.bin\pm2 (
    call npx pm2 start ecosystem.config.js
    call npx pm2 logs backend --lines 20
) else (
    echo 安装 PM2...
    call npm install pm2 -g
    call npx pm2 start ecosystem.config.js
    call npx pm2 logs backend --lines 20
)
