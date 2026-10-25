@echo off
chcp 65001 >nul
title NexaGuard · Vinculacion de Facebook
color 0A

echo ================================================================
echo    NexaGuard Social AutoPoster · Inicio de Sesion Facebook
echo ================================================================
echo.
echo Abriendo ventana dedicada de Facebook en tu pantalla...
echo Por favor ingresa tu correo y contrasena en la ventana que aparece.
echo.

set CHROME_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
if not exist "%CHROME_PATH%" (
    set CHROME_PATH=C:\Program Files (x86)\Google\Chrome\Application\chrome.exe
)

start "" "%CHROME_PATH%" --remote-debugging-port=9222 --user-data-dir="%~dp0user_data_fb" --window-size=1080,780 --no-first-run --no-default-browser-check --app="https://www.facebook.com/login.php"

timeout /t 3 /nobreak >nul
exit
