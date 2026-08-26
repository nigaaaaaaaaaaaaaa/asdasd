@echo off
setlocal

echo ========================================
echo BlockMovie Render Worker
echo ========================================
echo.

REM Set your Supabase details here
set "SUPABASE_URL=YOUR_SUPABASE_URL_HERE"
set "SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE"

REM Make sure we are running from the render-worker folder
cd /d "%~dp0"

echo Starting render worker...
echo.

python src\runner.py

echo.
echo Render worker stopped.
pause
endlocal
