@echo off
setlocal
title Content Transformation Platform - Launcher
echo ========================================================
echo   Content Transformation Platform - Starting Services
echo ========================================================
echo.

where python >nul 2>nul
if errorlevel 1 (
    echo ERROR: Python was not found on PATH.
    echo Install Python and ensure the python command is available.
    goto failed
)

where npm >nul 2>nul
if errorlevel 1 (
    echo ERROR: npm was not found on PATH.
    echo Install Node.js and ensure npm is available.
    goto failed
)

where curl.exe >nul 2>nul
if errorlevel 1 (
    echo ERROR: curl.exe was not found on PATH; service readiness cannot be verified.
    goto failed
)

echo Checking backend Python dependencies...
pushd "%~dp0backend"
python -c "import fastapi, uvicorn, multipart, google.genai, pypdf, docx, pptx, PIL, cv2, dotenv"
if errorlevel 1 (
    popd
    echo ERROR: Backend dependencies are missing.
    echo Run: python -m pip install -r backend\requirements.txt
    goto failed
)
popd

echo.
echo Checking backend API at 127.0.0.1:8000...
curl.exe --silent --show-error --fail http://127.0.0.1:8000/api/health >nul 2>nul
if errorlevel 1 (
    echo Starting FastAPI in a separate console...
    start "Backend Server - DO NOT CLOSE" /D "%~dp0backend" cmd /k "python -m uvicorn main:app --host 127.0.0.1 --port 8000 --reload"
    call :wait_for_url http://127.0.0.1:8000/api/health
    if errorlevel 1 (
        echo ERROR: Backend did not become healthy within 30 seconds.
        echo Check the Backend Server console for startup errors or a port conflict.
        goto failed
    )
) else (
    echo Backend is already healthy.
)

echo.
echo Checking frontend at localhost:3000...
curl.exe --silent --show-error --fail http://localhost:3000 >nul 2>nul
if errorlevel 1 (
    echo Starting Next.js in a separate console...
    start "Frontend Server - DO NOT CLOSE" /D "%~dp0frontend" cmd /k "npm run dev -- -p 3000"
    call :wait_for_url http://localhost:3000
    if errorlevel 1 (
        echo ERROR: Frontend did not respond within 30 seconds.
        echo Check the Frontend Server console for startup errors or a port conflict.
        goto failed
    )
) else (
    echo Frontend is already responding.
)

echo.
echo Backend:  http://127.0.0.1:8000/api/health
echo Frontend: http://localhost:3000
echo Both services passed their readiness checks.
start "" http://localhost:3000
exit /b 0

:wait_for_url
for /L %%I in (1,1,30) do (
    curl.exe --silent --fail "%~1" >nul 2>nul
    if not errorlevel 1 exit /b 0
    timeout /t 1 /nobreak >nul
)
exit /b 1

:failed
echo.
echo Startup did not complete. Resolve the error above and run start_all.bat again.
pause
exit /b 1
