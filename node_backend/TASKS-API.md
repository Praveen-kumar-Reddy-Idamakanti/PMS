# Task Management API

This document describes the Task Management API endpoints for the PMS (Project Management System).

## Base URL
All API endpoints are prefixed with `/api/tasks`

## Authentication
All endpoints require authentication. Include a valid JWT token in the `Authorization` header:
```
Authorization: Bearer <your-jwt-token>
```

## Task Statuses
- `todo`: Task is not yet started
- `in-progress`: Task is currently being worked on
- `review`: Task is under review
- `completed`: Task is completed

## Task Priorities
- `low`: Low priority
- `medium`: Medium priority (default)
- `high`: High priority
- `urgent`: Urgent priority

## API Endpoints

### Create a Task
```
POST /api/tasks
```

**Request Body:**
```json
{
  "title": "Complete Project Proposal",
  "description": "Draft and finalize the project proposal",
  "status": "todo",
  "priority": "high",
  "dueDate": "2025-10-15T18:00:00.000Z",
  "startDate": "2025-10-10T09:00:00.000Z",
  "endDate": "2025-10-15T18:00:00.000Z",
  "reminderTime": 30,
  "estimatedHours": 10,
  "tags": ["documentation", "planning"],
  "assignees": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "assignee",
      "isPrimary": true,
      "dueDate": "2025-10-15T18:00:00.000Z",
      "estimatedHours": 5
    }
  ]
}
```

### Get All Tasks
```
GET /api/tasks
```

**Query Parameters:**
- `status`: Filter by status (todo, in-progress, review, completed)
- `priority`: Filter by priority (low, medium, high, urgent)
- `assigneeId`: Filter by assignee ID
- `dueDateFrom`: Filter by due date (from)
- `dueDateTo`: Filter by due date (to)
- `search`: Search in title, description, or tags
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)

### Get Task by ID
```
GET /api/tasks/:id
```

### Update Task
```
PUT /api/tasks/:id
```

**Request Body:** (partial updates supported)
```json
{
  "status": "in-progress",
  "progress": 50
}
```

### Delete Task
```
DELETE /api/tasks/:id
```

### Assign Users to Task
```
POST /api/tasks/:taskId/assign
```

**Request Body:**
```json
{
  "assignees": [
    {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "role": "reviewer",
      "isPrimary": false,
      "dueDate": "2025-10-20T18:00:00.000Z"
    }
  ]
}
```

### Update Task Status
```
PATCH /api/tasks/:id/status
```

**Request Body:**
```json
{
  "status": "completed"
}
```

### Update Task Progress
```
PATCH /api/tasks/:id/progress
```

**Request Body:**
```json
{
  "progress": 75
}
```

### Get Tasks for Calendar View
```
GET /api/tasks/calendar
```

**Query Parameters:**
- `start`: Start date (ISO string)
- `end`: End date (ISO string)

## Error Responses

### 400 Bad Request
```json
{
  "error": "Validation Error",
  "message": "Title is required"
}
```

### 401 Unauthorized
```json
{
  "error": "Unauthorized",
  "message": "No authentication token, authorization denied"
}
```

### 403 Forbidden
```json
{
  "error": "Forbidden",
  "message": "Not authorized to access this resource"
}
```

### 404 Not Found
```json
{
  "error": "Not Found",
  "message": "Task not found"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal Server Error",
  "message": "An unexpected error occurred"
}
```

## Webhooks

### Task Assigned
**Event:** `task.assigned`

**Payload:**
```json
{
  "event": "task.assigned",
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Complete Project Proposal",
    "assignedTo": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "assignedBy": {
      "userId": "550e8400-e29b-41d4-a716-446655440001",
      "name": "Jane Smith",
      "email": "jane@example.com"
    },
    "dueDate": "2025-10-15T18:00:00.000Z"
  }
}
```

### Task Status Updated
**Event:** `task.status.updated`

**Payload:**
```json
{
  "event": "task.status.updated",
  "data": {
    "taskId": "550e8400-e29b-41d4-a716-446655440000",
    "title": "Complete Project Proposal",
    "oldStatus": "todo",
    "newStatus": "in-progress",
    "updatedBy": {
      "userId": "550e8400-e29b-41d4-a716-446655440000",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

## Rate Limiting
- 100 requests per minute per IP address
- 1000 requests per hour per user
