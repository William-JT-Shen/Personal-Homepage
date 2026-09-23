@echo off
title PRISM 网站启动器
cd /d "%~dp0"

echo ============================================
echo         PRISM 个人网站 - 一键启动
echo ============================================
echo.

rem 检查 Node.js 是否已安装
where node >nul 2>nul
if errorlevel 1 (
    echo [错误] 未检测到 Node.js！
    echo 请先到 https://nodejs.org/zh-cn 下载并安装 Node.js（22 或更高版本）。
    echo.
    pause
    exit /b 1
)

rem 首次运行时自动安装依赖
if not exist "node_modules" (
    echo [首次运行] 正在安装依赖，可能需要几分钟，请稍候...
    echo.
    call npm install
    if errorlevel 1 (
        echo.
        echo [错误] 依赖安装失败，请检查网络后重试。
        pause
        exit /b 1
    )
)

rem 检查 3000 端口是否已有服务器在运行
netstat -ano | findstr ":3000 " | findstr "LISTENING" >nul 2>nul
if not errorlevel 1 (
    echo [提示] 网站服务器已在运行，正在为你打开浏览器...
    start http://localhost:3000
    echo.
    echo 如果浏览器没有自动打开，请手动访问： http://localhost:3000
    ping -n 6 127.0.0.1 >nul
    exit /b 0
)

rem 启动开发服务器（在新窗口中运行）
echo 正在启动网站服务器，请稍候...
start "PRISM 网站服务器" cmd /k "npm run dev"

rem 等待服务器启动完成后自动打开浏览器
ping -n 9 127.0.0.1 >nul
start http://localhost:3000

echo.
echo ============================================
echo  网站已启动！浏览器应已自动打开。
echo  如果页面还没加载出来，请稍等几秒后刷新。
echo.
echo  地址： http://localhost:3000
echo.
echo  - 修改 content 文件夹里的内容后，刷新浏览器即可看到效果
echo  - 要停止网站，请关闭 "PRISM 网站服务器" 窗口
echo ============================================
echo.
echo 按任意键关闭本窗口（不会停止网站）...
pause >nul
