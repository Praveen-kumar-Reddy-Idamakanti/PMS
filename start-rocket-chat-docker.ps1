Write-Host "Starting Rocket.Chat with Docker..." -ForegroundColor Green
Write-Host ""

Write-Host "Checking if Docker is running..." -ForegroundColor Yellow
try {
    docker --version | Out-Null
    Write-Host "Docker is available" -ForegroundColor Green
} catch {
    Write-Host "Docker is not installed or not running." -ForegroundColor Red
    Write-Host "Please install Docker Desktop and try again." -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Write-Host ""
Write-Host "Starting Rocket.Chat services..." -ForegroundColor Yellow
docker-compose -f docker-compose.rocket-chat.yml up -d

Write-Host ""
Write-Host "Rocket.Chat is starting up..." -ForegroundColor Green
Write-Host "It will be available at: http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Initial setup may take a few minutes." -ForegroundColor Yellow
Write-Host "Check the logs with: docker-compose -f docker-compose.rocket-chat.yml logs -f" -ForegroundColor Gray
Write-Host ""
Write-Host "To stop Rocket.Chat: docker-compose -f docker-compose.rocket-chat.yml down" -ForegroundColor Gray
Write-Host ""

Read-Host "Press Enter to exit"




