Write-Host "Starting Rocket.Chat Development Server..." -ForegroundColor Green
Write-Host ""

Set-Location "Rocket.Chat"

Write-Host "Checking if dependencies are installed..." -ForegroundColor Yellow
if (-not (Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    yarn install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Failed to install dependencies. Please check your Node.js and Yarn installation." -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

Write-Host ""
Write-Host "Starting Rocket.Chat server..." -ForegroundColor Green
Write-Host "The server will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

yarn dev

Read-Host "Press Enter to exit"




