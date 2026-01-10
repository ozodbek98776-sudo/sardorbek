@echo off
echo Sardor Furnitura Tunnel ishga tushirilmoqda...
echo.

REM Tunnel ishga tushirish
cloudflared tunnel --config config.yml run sardor-furnitura

pause