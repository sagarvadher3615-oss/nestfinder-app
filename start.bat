@echo off
echo.
echo ======================================
echo    NestFinder App - Starting...
echo ======================================
echo.

docker info >nul 2>&1
if %errorlevel% neq 0 (
  echo ERROR: Docker is not running.
  echo Please open Docker Desktop and try again.
  pause
  exit /b 1
)

echo Docker is running!
echo.
echo Building and starting all services (2-3 mins first time)...
echo.

docker compose up --build -d

echo.
echo ======================================
echo    NestFinder is ready!
echo ======================================
echo.
echo    Open in browser: http://localhost:8081
echo.
echo    Demo accounts:
echo    Tenant:   tenant@nestfinder.app   / Demo123!
echo    Landlord: landlord@nestfinder.app / Demo123!
echo.
echo    To stop: docker compose down
echo ======================================
echo.

timeout /t 5 >nul
start http://localhost:8081
