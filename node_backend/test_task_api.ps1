
$baseUrl = "http://localhost:5001/api/tasks"
$authToken = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyIjp7ImlkIjoyLCJuYW1lIjoiQWRtaW4gVXNlciIsImVtYWlsIjoic3VwZXJfYWRtaW5AZXhhbXBsZS5jb20iLCJlbXBsb3llZUlkIjpudWxsLCJyb2xlIjoic3VwZXJfYWRtaW4ifSwiaWF0IjoxNzU3NTIyNDQ2LCJleHAiOjE3NTc2MDg4NDZ9.XrbrtCfzaf7b3f6PIrI22d7E3-DMcJlzWGGfh7J0VzQ" 

$headers = @{
    "Content-Type" = "application/json"
    "Authorization" = "Bearer $authToken"
}

function Invoke-ApiRequest {
    param (
        [string]$Method,
        [string]$Url,
        [object]$Body = $null
    )
    Write-Host "`n--- $Method $Url ---"
    $params = @{
        Method = $Method
        Uri = $Url
        Headers = $headers
    }
    if ($Body) {
        $params.Body = ($Body | ConvertTo-Json)
    }
    try {
        $response = Invoke-RestMethod @params
        Write-Host "Status: OK"
        $response | ConvertTo-Json -Depth 100 | Write-Host
        return $response
    } catch {
        Write-Host "Status: Error"
        Write-Host "Error: $($_.Exception.Message)"
        if ($_.Exception.Response) {
            $_.Exception.Response.GetResponseStream() | ForEach-Object { New-Object System.IO.StreamReader($_) } | ForEach-Object { $_.ReadToEnd() } | Write-Host
        }
        return $null
    }
}

# 1. Create a new task
Write-Host "`n===== Testing Create Task ====="
$newTaskBody = @{
    title = "Test Task from PowerShell"
    description = "This is a test task created via PowerShell script."
    status = "todo"
    priority = "high"
    assignedTo = 1 # Assuming user with ID 1 exists
    assignedBy = 1 # Assuming user with ID 1 exists
    dueDate = (Get-Date).AddDays(7).ToString("yyyy-MM-dd")
    progress = 0
    tags = @("PowerShell", "Testing")
}
$createdTask = Invoke-ApiRequest -Method Post -Url $baseUrl -Body $newTaskBody
$createdTaskId = $null
if ($createdTask) {
    $createdTaskId = $createdTask.id
    Write-Host "Created Task ID: $createdTaskId"
}

# 2. Get all tasks
Write-Host "`n===== Testing Get All Tasks ====="
Invoke-ApiRequest -Method Get -Url $baseUrl

# 3. Get a specific task by ID
if ($createdTaskId) {
    Write-Host "`n===== Testing Get Task By ID ====="
    Invoke-ApiRequest -Method Get -Url "$baseUrl/$createdTaskId"
}

# 4. Update a task
if ($createdTaskId) {
    Write-Host "`n===== Testing Update Task ====="
    $updatedTaskBody = @{
        title = "Updated Test Task from PowerShell"
        description = "This task was updated via PowerShell script."
        status = "in-progress"
        priority = "medium"
        progress = 50
        tags = @("PowerShell", "Updated", "Testing")
    }
    Invoke-ApiRequest -Method Put -Url "$baseUrl/$createdTaskId" -Body $updatedTaskBody
}

# 5. Create a subtask for a task
$createdSubtaskId = $null
if ($createdTaskId) {
    Write-Host "`n===== Testing Create Subtask ====="
    $newSubtaskBody = @{
        title = "First Subtask"
        status = "todo"
    }
    $createdSubtask = Invoke-ApiRequest -Method Post -Url "$baseUrl/$createdTaskId/subtasks" -Body $newSubtaskBody
    if ($createdSubtask) {
        $createdSubtaskId = $createdSubtask.id
        Write-Host "Created Subtask ID: $createdSubtaskId"
    }
}

# 6. Update a subtask
if ($createdSubtaskId) {
    Write-Host "`n===== Testing Update Subtask ====="
    $updatedSubtaskBody = @{
        title = "Updated First Subtask"
        status = "completed"
    }
    Invoke-ApiRequest -Method Put -Url "http://localhost:5001/api/tasks/subtasks/$createdSubtaskId" -Body $updatedSubtaskBody
}

# 7. Delete a subtask
if ($createdSubtaskId) {
    Write-Host "`n===== Testing Delete Subtask ====="
    Invoke-ApiRequest -Method Delete -Url "http://localhost:5001/api/tasks/subtasks/$createdSubtaskId"
}

# 8. Delete a task
if ($createdTaskId) {
    Write-Host "`n===== Testing Delete Task ====="
    Invoke-ApiRequest -Method Delete -Url "$baseUrl/$createdTaskId"
}

Write-Host "`n===== PowerShell API Test Complete ====="
