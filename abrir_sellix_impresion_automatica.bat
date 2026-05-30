@echo off
setlocal

set "SELLIX_URL=http://localhost:5173/"
set "SELLIX_PROFILE=%LocalAppData%\Sellix\chrome-kiosk-profile"
set "CHROME_EXE="

if exist "%ProgramFiles%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%ProgramFiles(x86)%\Google\Chrome\Application\chrome.exe"
if not defined CHROME_EXE if exist "%LocalAppData%\Google\Chrome\Application\chrome.exe" set "CHROME_EXE=%LocalAppData%\Google\Chrome\Application\chrome.exe"

if not defined CHROME_EXE (
    echo No se encontro Google Chrome instalado.
    echo Instala Chrome o ajusta esta ruta manualmente en este archivo.
    pause
    exit /b 1
)

start "Sellix Dev Server" cmd /k "npm run dev -- --host 127.0.0.1 --port 5173 --strictPort"
timeout /t 5 /nobreak >nul
powershell -NoProfile -ExecutionPolicy Bypass -Command "Get-CimInstance Win32_Process -Filter \"name = 'chrome.exe'\" | Where-Object { $_.CommandLine -like '*Sellix\\chrome-kiosk-profile*' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }" >nul 2>nul
start "Sellix" "%CHROME_EXE%" --user-data-dir="%SELLIX_PROFILE%" --no-first-run --disable-session-crashed-bubble --kiosk-printing --app="%SELLIX_URL%"
