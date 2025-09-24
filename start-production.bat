@echo off
setlocal
chcp 65001 >NUL

set "NODE_ENV=production"
if not defined WEB_PORT set "WEB_PORT=3000"

if not exist "dist" (
  echo ERROR: Kein dist/-Ordner gefunden. Bitte vorher auf der Build-Maschine "npm run build" ausfuehren.
  exit /b 1
)

echo Starting server (production)...
node wrapper-server.cjs
endlocal
