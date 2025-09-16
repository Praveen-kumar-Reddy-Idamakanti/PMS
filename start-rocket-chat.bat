@echo off
echo Starting Rocket.Chat Development Server...
echo.

cd "Rocket.Chat"

echo Checking if dependencies are installed...
if not exist "node_modules" (
    echo Installing dependencies...
    yarn install
    if errorlevel 1 (
        echo Failed to install dependencies. Please check your Node.js and Yarn installation.
        pause
        exit /b 1
    )
)

echo.
echo Starting Rocket.Chat server...
echo The server will be available at: http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.

yarn dev

pause



