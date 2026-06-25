@echo off
chcp 65001 >nul
title Black En Admin Panel

echo ================================
echo   Black En Admin Panel - Start
echo ================================
echo.

set ROOT=%~dp0
set BACKEND=%ROOT%backend
set FRONTEND=%ROOT%frontend

:: 1. Start PostgreSQL
echo [1/3] Starting PostgreSQL...
docker start postgres 2>nul
if %errorlevel% neq 0 (
    docker run -d --name postgres ^
        -e POSTGRES_USER=admin ^
        -e POSTGRES_PASSWORD=admin123 ^
        -e POSTGRES_DB=blacken_admin ^
        -p 5432:5432 ^
        postgres:16-alpine
)
echo       PostgreSQL: OK
echo.

:: 2. Build and Start Backend
echo [2/3] Starting Backend (Go + Gin)...
cd /d "%BACKEND%"
go build -o server.exe .
if exist server.exe (
    start "BlackEn-Backend" cmd /c "server.exe"
    echo       Backend: http://localhost:8080/api
) else (
    echo       ERROR: Build failed!
    pause
    exit /b 1
)
echo.

:: 3. Start Frontend
echo [3/3] Starting Frontend (React + Vite)...
cd /d "%FRONTEND%"
start "BlackEn-Frontend" cmd /c "npx vite --host"
timeout /t 5 >nul
echo       Frontend: http://localhost:5173
echo.

echo ================================
echo   All systems running!
echo   Frontend: http://localhost:5173
echo   Backend:  http://localhost:8080/api
echo   Login:    admin / 123456
echo ================================
echo.
pause
