@echo off
cd /d "%~dp0"
echo Starting Pondy City Stories on http://localhost:8080 ...
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8080
  node server.js
) else (
  where python >nul 2>nul
  if %errorlevel%==0 (
    start "" http://localhost:8080
    python server.py
  ) else (
    echo.
    echo Neither Node.js nor Python was found. Install Node.js from https://nodejs.org and run this again.
    pause
  )
)
