@echo off
chcp 65001 >nul
setlocal

echo ============================================
echo   AD Workflow - Starting Dev Services
echo ============================================
echo.

:: Start backend
echo [1/2] Starting backend server...
start "Backend Server" cmd /k "chcp 65001 >nul && set NODE_OPTIONS=--no-warnings && cd /d %~dp0backend && npm run dev"
timeout /t 2 >nul

:: Start frontend
echo [2/2] Starting admin frontend...
start "Admin Frontend" cmd /k "chcp 65001 >nul && set NODE_OPTIONS=--no-warnings && cd /d %~dp0admin-web && npm run dev"

echo.
echo All services starting...
echo   Backend : http://localhost:3000
echo   Frontend: http://localhost:5173
echo.
