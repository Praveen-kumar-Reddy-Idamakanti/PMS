@echo off
echo Starting Rocket.Chat with Docker...
echo.

echo Checking if Docker is running...
docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker is not installed or not running.
    echo Please install Docker Desktop and try again.
    pause
    exit /b 1
)

echo.
echo Starting Rocket.Chat services...
docker-compose -f docker-compose.rocket-chat.yml up -d

echo.
echo Rocket.Chat is starting up...
echo It will be available at: http://localhost:3000
echo.
echo Initial setup may take a few minutes.
echo Check the logs with: docker-compose -f docker-compose.rocket-chat.yml logs -f
echo.
echo To stop Rocket.Chat: docker-compose -f docker-compose.rocket-chat.yml down
echo.

pause



