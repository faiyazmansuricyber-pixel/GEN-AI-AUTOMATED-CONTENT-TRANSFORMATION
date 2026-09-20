@echo off
title Content Transformation Platform - Launcher
echo ========================================================
echo   Content Transformation Platform - Starting Services...
echo ========================================================
echo.

echo [1/3] Starting Backend API Server (FastAPI on Port 8000)...
start "Backend Server - DO NOT CLOSE" cmd /k "cd /d "%~dp0backend" && python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"

echo [2/3] Starting Frontend Dev Server (Next.js on Port 3000)...
start "Frontend Server - DO NOT CLOSE" cmd /k "cd /d "%~dp0frontend" && npm run dev -- -p 3000"

echo [3/3] Waiting for servers to initialize...
ping 127.0.0.1 -n 6 >nul

echo Launching Content Transformation Platform in default browser...
start http://localhost:3000

echo.
echo ========================================================
echo   Both Backend and Frontend servers are now running!
echo   IMPORTANT: Keep both server terminal windows OPEN.
echo ========================================================
