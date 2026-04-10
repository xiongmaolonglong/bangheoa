@echo off
chcp 65001 >nul
echo ========================================
echo 户外广告派单系统 - 快速启动
echo ========================================
echo.

REM 杀掉旧进程
echo [1/3] 清理旧进程...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5173" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5174" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":5175" ^| findstr "LISTENING"') do taskkill /F /PID %%a >nul 2>nul

REM 启动后端
echo [2/3] 启动后端服务...
start "Backend" cmd /k "cd /d %~dp0backend && npm run dev"

REM 启动前端
echo [3/3] 启动前端服务...
start "Frontend" cmd /k "cd /d %~dp0admin-web && npm run dev"

echo.
echo ========================================
echo 系统已启动！
echo   前端: http://localhost:5173 (或 5174/5175)
echo   后端: http://localhost:3000
echo ========================================
echo.
echo 提示: 如果端口被占用，系统会自动切换到其他端口
