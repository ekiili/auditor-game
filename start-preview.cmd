@echo off
rem Double-click to build the production bundle and serve it, then open the
rem game in a browser at the base path.
rem
rem This is the artifact that gets deployed, served the way GitHub Pages will
rem serve it: under /auditor-game/. Vite preview reads that base from
rem vite.config.js, so `--open` opens the base path rather than the server
rem root, where nothing is served.
rem
rem The build here is exactly `npm run build` with no extra flags, so the
rem bundle this serves is the same bundle a plain build produces.
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

echo Building...
echo.
call npm run build
if errorlevel 1 goto failed

echo.
call npm run preview -- --open
if errorlevel 1 goto failed
goto done

:failed
echo.
echo The build or the preview server stopped with an error. The message above
echo says why.
echo.
pause
exit /b 1

:done
