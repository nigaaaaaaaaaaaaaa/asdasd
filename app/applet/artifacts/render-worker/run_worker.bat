@echo off
setlocal

:: Set your environment variables here
set SUPABASE_URL=YOUR_SUPABASE_URL_HERE
set SUPABASE_SERVICE_ROLE_KEY=YOUR_SUPABASE_SERVICE_ROLE_KEY_HERE

:: Run the worker
python src\runner.py

endlocal
pause
