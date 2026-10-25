@echo off
chcp 65001 >nul
title NexaGuard · Vinculacion de Facebook
color 0A

echo ================================================================
echo    NexaGuard Social AutoPoster · Inicio de Sesion Facebook
echo ================================================================
echo.
echo Abriendo Google Chrome con el perfil del bot para Facebook...
echo Inicia sesion con tu cuenta. Tus cookies se guardaran automaticamente.
echo.

set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
)

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%~dp0user_data_fb" --window-size=1200,820 "https://www.facebook.com/"
exit
