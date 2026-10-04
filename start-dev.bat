@echo off
echo ========================================================
echo Starting DentCare Dental Clinic Management System
echo ========================================================

:: 1. Check / Start MySQL
netstat -ano | findstr :3306 >nul
if %errorlevel% neq 0 (
    echo [1/3] Starting MySQL Server 8.4...
    start "MySQL Server" /min "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysqld.exe" --datadir="%~dp0backend\data\mysql_data" --console
    timeout /t 3 >nul
) else (
    echo [1/3] MySQL is already running on port 3306.
)

:: 2. Start Backend
echo [2/3] Starting Spring Boot Backend (port 8080)...
start "DentCare Backend" cmd /k "cd /d %~dp0backend && mvnw.cmd spring-boot:run"

:: 3. Start Frontend
echo [3/3] Starting Frontend (port 3000)...
start "DentCare Frontend" cmd /k "cd /d %~dp0frontend && npm.cmd run dev"

echo.
echo DentCare is starting up!
echo Frontend URL: http://localhost:3000
echo Backend API:  http://localhost:8080
echo.
echo Default Admin Login:
echo   Email:    admin@dentcare.com
echo   Password: Admin1234
echo ========================================================
pause
