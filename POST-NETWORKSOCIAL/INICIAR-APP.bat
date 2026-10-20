@echo off
chcp 65001 >nul
title NexaGuard Social AutoPoster · Suite de Escritorio
color 0B

echo ================================================================
echo    NexaGuard Social AutoPoster · Windows 10 (64-bit)
echo    Automatizacion para Grupos de Facebook & Instagram
echo ================================================================
echo.

cd /d "%~dp0"

echo [1/2] Verificando entorno de ejecucion...
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js no fue encontrado en tu sistema.
    echo Por favor instala Node.js desde https://nodejs.org
    pause
    exit /b 1
)

echo [2/2] Iniciando aplicacion de escritorio en Windows...
echo El panel se abrira automaticamente en una ventana dedicada.
echo.

node server.js --open

pause
