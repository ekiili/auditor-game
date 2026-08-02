@echo off
rem Double-click to start the dev server and open the game in a browser.
rem
rem The URL is not written down here on purpose. Vite knows which port it
rem actually bound and it knows the base path from vite.config.js, so `--open`
rem opens the right address even when the default port is already taken. A
rem hardcoded http://localhost:5173/audit-game/ would silently be wrong on the
rem second run.
rem
rem This window is the server. Closing it, or pressing Ctrl+C in it, stops the
rem game.

cd /d "%~dp0"

if not exist "node_modules" (
  echo Installing dependencies for the first time. This happens once.
  echo.
  call npm install
  if errorlevel 1 goto failed
  echo.
)

call npm run dev -- --open
if errorlevel 1 goto failed
goto done

:failed
echo.
echo The dev server stopped with an error. The message above says why.
echo.
pause
exit /b 1

:done
