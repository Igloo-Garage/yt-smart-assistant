@echo off

cd /d "%~dp0server"
taskkill /f /im deno.exe 2>nul
echo ==========================================
echo   YT-Smart-Assistant Server Starting...
echo ==========================================

.\deno run --allow-net --allow-run --allow-read --allow-write --allow-env server.ts

pause
