@echo off
echo Sardor Furnitura loyihasini ishga tushirish...
echo.

echo 1. Server ishga tushirilmoqda (Port 3003)...
start "Server" cmd /k "cd server && npm run dev"

timeout /t 3 /nobreak >nul

echo 2. Client ishga tushirilmoqda (Port 5173)...
start "Client" cmd /k "cd client && npm run dev"

echo.
echo Loyiha ishga tushdi!
echo Frontend: http://localhost:5173
echo Backend: http://localhost:3003
echo.
echo Brauzeringizda http://localhost:5173 ga boring
echo.

pause