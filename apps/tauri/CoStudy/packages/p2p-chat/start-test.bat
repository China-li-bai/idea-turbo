@echo off
echo 🚀 启动 P2P Chat 测试服务...

REM 检查 Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 需要安装 Node.js
    pause
    exit /b 1
)

REM 检查 npm
where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ 错误: 需要安装 npm
    pause
    exit /b 1
)

REM 进入目录
cd /d "%~dp0"

REM 安装依赖（如果需要）
if not exist "node_modules" (
    echo 📦 安装依赖...
    npm install
)

REM 启动开发服务器
echo 🌐 启动开发服务器...
echo 📍 测试地址: http://localhost:5173
echo 📋 请查看 TESTING.md 了解详细测试步骤
echo.
echo 💡 提示:
echo   - 点击顶部导航栏切换测试页面
echo   - 使用两个浏览器标签页测试 P2P 连接
echo   - 观察右侧日志了解连接状态
echo.

npm run dev

pause