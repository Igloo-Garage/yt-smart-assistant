@echo off
:: %~dp0 代表脚本当前所在的路径
:: cd /d 意思是“切换目录”
cd /d "%~dp0server"

echo ==========================================
echo   YT-Smart-Assistant Server Starting...
echo ==========================================

:: 现在我们在 server 文件夹里了，直接运行 server.ts 即可
deno run --allow-net --allow-run --allow-read --allow-write --allow-env server.ts

:: 防止报错后窗口秒关，你看不到错误信息
pause