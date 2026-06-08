@echo off
:: ChoreChart Firebase Edition - Local Startup Script

echo ======================================================
echo    Starting ChoreChart Local Server on Port 8000...   
echo ======================================================
echo    Serving files from the 'public' folder...
echo    Opening application in browser...

:: Open URL in default browser
start http://localhost:8000

:: Run python HTTP server (checks for 'python3' first, falls back to 'python')
where python3 >nul 2>nul
if %errorlevel%==0 (
    python3 -m http.server --directory public 8000
) else (
    python -m http.server --directory public 8000
)
pause
