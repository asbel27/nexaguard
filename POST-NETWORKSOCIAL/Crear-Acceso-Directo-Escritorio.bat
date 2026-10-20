@echo off
chcp 65001 >nul
title Crear Acceso Directo de NexaGuard en el Escritorio
cd /d "%~dp0"

set "EXE_PATH=%~dp0NexaGuard-Social-AutoPoster.exe"
set "DESKTOP_DIR=%USERPROFILE%\Desktop"
set "SHORTCUT_PATH=%DESKTOP_DIR%\NexaGuard Social AutoPoster.lnk"

powershell -Command "$WshShell = New-Object -comObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('%SHORTCUT_PATH%'); $Shortcut.TargetPath = '%EXE_PATH%'; $Shortcut.WorkingDirectory = '%~dp0'; $Shortcut.IconLocation = '%~dp0app_icon.ico'; $Shortcut.Description = 'NexaGuard Social AutoPoster para Facebook & Instagram'; $Shortcut.Save()"

if exist "%SHORTCUT_PATH%" (
    echo.
    echo ================================================================
    echo  [OK] Acceso directo creado exitosamente en tu Escritorio:
    echo  "%SHORTCUT_PATH%"
    echo ================================================================
) else (
    echo [ERROR] No se pudo crear el acceso directo.
)

pause

