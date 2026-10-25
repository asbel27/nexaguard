@echo off
chcp 65001 >nul
title NexaGuard · Vinculacion de Instagram
color 0D

echo ================================================================
echo    NexaGuard Social AutoPoster · Inicio de Sesion Instagram
echo ================================================================
echo.
echo Abriendo ventana dedicada de Instagram en tu pantalla...
echo.

set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
)

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%~dp0user_data_fb" --window-size=1080,780 --no-first-run --no-default-browser-check --app="https://www.instagram.com/accounts/login/"

timeout /t 3 /nobreak >nul
exit

