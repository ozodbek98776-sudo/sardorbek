@echo off
echo Tezkor tunnel (test uchun)...
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3003
echo.

REM Tezkor tunnel - test uchun
cloudflared tunnel --url http://localhost:5173

pause