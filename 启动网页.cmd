@echo off
cd /d "%~dp0"
set "PY=python"
where python >nul 2>nul && goto run
where py >nul 2>nul && set "PY=py" && goto run
echo.
echo Python not found. Install Python 3 from python.org
echo and tick "Add python.exe to PATH", then run this again.
echo.
pause
exit

:run
start "star-isle-server" /min %PY% "server.py"
timeout /t 2 /nobreak >nul
start "" "http://127.0.0.1:8899/index.html"
exit
