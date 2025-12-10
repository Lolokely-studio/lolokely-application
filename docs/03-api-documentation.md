# API Documentation

## Base URL

```
Development: http://localhost:5000/api
Production: https://your-domain.com/api
```

## Authentication

All protected endpoints require a JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

Tokens are obtained through the `/api/auth/login` or `/api/auth/register` endpoints.

## Response Format

### Success Response

```json
{
  "message": "Success message",
  "data": { ... }
}
```

### Error Response

```json
{
  "error": "Error message",
  "details": { ... }  // Optional validation details
}
```

## Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict
- `500` - Internal Server Error

---

## Authentication Endpoints

### Register User

**POST** `/api/auth/register`

Create a new user account.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "first_name": "John",
  "last_name": "Doe"
}
```

**Response (201):**
```json
{
  "message": "User created successfully",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  },
  "access_token": "jwt_token_here"
}
```

**Error Responses:**
- `400` - Validation error
- `409` - User already exists
- `500` - Server error

---

### Login

**POST** `/api/auth/login`

Authenticate user and receive JWT token.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  },
  "access_token": "jwt_token_here"
}
```

**Error Responses:**
- `400` - Validation error
- `401` - Invalid credentials
- `500` - Server error

---

### Get Current User

**GET** `/api/auth/me`

Get information about the currently authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

**Error Responses:**
- `401` - Unauthorized
- `404` - User not found
- `500` - Server error

---

## Task Endpoints

### Get All Tasks

**GET** `/api/tasks/`

Retrieve all tasks with their subtasks and assignments.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "tasks": [
    {
      "id": "uuid",
      "title": "Task Title",
      "description": "Task description",
      "status": "todo",
      "priority": "medium",
      "due_date": "2024-12-31T23:59:59",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00",
      "assignments": [
        {
          "user_id": "uuid",
          "email": "user@example.com",
          "first_name": "John",
          "last_name": "Doe",
          "assigned_at": "2024-01-01T00:00:00"
        }
      ],
      "subtasks": [
        {
          "id": "uuid",
          "task_id": "uuid",
          "title": "Subtask Title",
          "description": "Subtask description",
          "status": "todo",
          "priority": "low",
          "due_date": null,
          "created_at": "2024-01-01T00:00:00",
          "updated_at": "2024-01-01T00:00:00",
          "assignments": []
        }
      ]
    }
  ]
}
```

---

### Create Task

**POST** `/api/tasks/`

Create a new task.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Task Title",
  "description": "Task description (optional)",
  "status": "todo",
  "priority": "medium",
  "due_date": "2024-12-31T23:59:59"
}
```

**Field Validation:**
- `title`: Required, 1-200 characters
- `description`: Optional
- `status`: Optional, one of: `todo`, `in_progress`, `completed` (default: `todo`)
- `priority`: Optional, one of: `low`, `medium`, `high` (default: `medium`)
- `due_date`: Optional, ISO 8601 datetime format

**Response (201):**
```json
{
  "message": "Task created successfully",
  "task": {
    "id": "uuid",
    "title": "Task Title",
    "description": "Task description",
    "status": "todo",
    "priority": "medium",
    "due_date": "2024-12-31T23:59:59",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

**Note:** Creates notifications for all users (except the creator) when a task is created.

---

### Get Task by ID

**GET** `/api/tasks/<task_id>`

Retrieve a specific task with subtasks and assignments.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "task": {
    "id": "uuid",
    "title": "Task Title",
    "description": "Task description",
    "status": "todo",
    "priority": "medium",
    "due_date": "2024-12-31T23:59:59",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00",
    "assignments": [],
    "subtasks": []
  }
}
```

**Error Responses:**
- `404` - Task not found

---

### Update Task

**PUT** `/api/tasks/<task_id>`

Update an existing task. All fields are optional (partial update).

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated Title",
  "status": "in_progress",
  "priority": "high"
}
```

**Response (200):**
```json
{
  "message": "Task updated successfully",
  "task": {
    "id": "uuid",
    "title": "Updated Title",
    "description": "Task description",
    "status": "in_progress",
    "priority": "high",
    "due_date": "2024-12-31T23:59:59",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T01:00:00"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `404` - Task not found

---

### Delete Task

**DELETE** `/api/tasks/<task_id>`

Delete a task. This will cascade delete all subtasks.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Task deleted successfully"
}
```

**Error Responses:**
- `404` - Task not found

---

### Assign Task

**POST** `/api/tasks/<task_id>/assign`

Assign a task to one or more users.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

**Response (200):**
```json
{
  "message": "Task assigned successfully"
}
```

**Note:** Creates notifications for all assigned users.

---

### Create Subtask

**POST** `/api/tasks/<task_id>/subtasks`

Create a subtask for a specific task.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Subtask Title",
  "description": "Subtask description (optional)",
  "status": "todo",
  "priority": "medium",
  "due_date": "2024-12-31T23:59:59"
}
```

**Response (201):**
```json
{
  "message": "Subtask created successfully",
  "subtask": {
    "id": "uuid",
    "task_id": "uuid",
    "title": "Subtask Title",
    "description": "Subtask description",
    "status": "todo",
    "priority": "medium",
    "due_date": "2024-12-31T23:59:59",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

**Error Responses:**
- `400` - Validation error
- `404` - Parent task not found

---

### Update Subtask

**PUT** `/api/tasks/subtasks/<subtask_id>`

Update an existing subtask.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "title": "Updated Subtask Title",
  "status": "completed"
}
```

**Response (200):**
```json
{
  "message": "Subtask updated successfully",
  "subtask": {
    "id": "uuid",
    "task_id": "uuid",
    "title": "Updated Subtask Title",
    "description": "Subtask description",
    "status": "completed",
    "priority": "medium",
    "due_date": null,
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T01:00:00"
  }
}
```

---

### Delete Subtask

**DELETE** `/api/tasks/subtasks/<subtask_id>`

Delete a subtask.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Subtask deleted successfully"
}
```

---

### Assign Subtask

**POST** `/api/tasks/subtasks/<subtask_id>/assign`

Assign a subtask to one or more users.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "user_ids": ["uuid1", "uuid2"]
}
```

**Response (200):**
```json
{
  "message": "Subtask assigned successfully"
}
```

**Note:** Creates notifications for all assigned users.

---

## User Endpoints

### Get All Users

**GET** `/api/users/`

Retrieve all users in the system.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "users": [
    {
      "id": "uuid",
      "email": "user@example.com",
      "first_name": "John",
      "last_name": "Doe",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00"
    }
  ]
}
```

---

### Get User by ID

**GET** `/api/users/<user_id>`

Retrieve a specific user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "first_name": "John",
    "last_name": "Doe",
    "created_at": "2024-01-01T00:00:00",
    "updated_at": "2024-01-01T00:00:00"
  }
}
```

**Error Responses:**
- `404` - User not found

---

## Post Endpoints

### Generate Posts

**POST** `/api/posts/generate`

Generate 3 variations of a social media post using AI.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "theme": "Gaming Technology",
  "description": "Latest gaming innovations",
  "platform": "Instagram",
  "tonality": "Energetic",
  "language": "en",
  "target_audience": "Gamers aged 18-35"
}
```

**Field Requirements:**
- `theme`: Required, string
- `description`: Optional, string
- `platform`: Required, one of: `Instagram`, `Facebook`, `Twitter`, `LinkedIn`, `TikTok`, `YouTube`
- `tonality`: Required, one of: `Professional`, `Casual`, `Funny`, `Inspirational`, `Educational`, `Energetic`
- `language`: Optional, one of: `en`, `fr`, `es`, `de`, `it` (default: `en`)
- `target_audience`: Optional, string

**Response (200):**
```json
{
  "variations": [
    "First generated post variation...",
    "Second generated post variation...",
    "Third generated post variation..."
  ],
  "theme": "Gaming Technology",
  "description": "Latest gaming innovations",
  "platform": "Instagram",
  "tonality": "Energetic",
  "language": "en",
  "target_audience": "Gamers aged 18-35"
}
```

**Error Responses:**
- `400` - Missing required fields or API key not configured
- `500` - AI generation error

---

### Save Post

**POST** `/api/posts/save`

Save a generated post to the database.

**Headers:**
```
Authorization: Bearer <token>
```

**Request Body:**
```json
{
  "theme": "Gaming Technology",
  "description": "Latest gaming innovations",
  "platform": "Instagram",
  "tonality": "Energetic",
  "language": "en",
  "target_audience": "Gamers aged 18-35",
  "generated_variations": [
    "Variation 1...",
    "Variation 2...",
    "Variation 3..."
  ],
  "selected_variation": "Variation 1...",
  "media_url": "https://example.com/image.jpg",
  "media_type": "image"
}
```

**Field Requirements:**
- `selected_variation`: Required, string
- `generated_variations`: Optional, array of strings
- `media_url`: Optional, string
- `media_type`: Optional, one of: `image`, `video`, or null

**Response (201):**
```json
{
  "message": "Post saved successfully",
  "post": {
    "id": "uuid",
    "theme": "Gaming Technology",
    "platform": "Instagram",
    "selected_variation": "Variation 1...",
    "created_at": "2024-01-01T00:00:00"
  }
}
```

**Note:** Updates user preferences based on the saved post.

---

### Get All Posts

**GET** `/api/posts/`

Retrieve all saved posts from all users.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "posts": [
    {
      "id": "uuid",
      "theme": "Gaming Technology",
      "description": "Latest gaming innovations",
      "platform": "Instagram",
      "tonality": "Energetic",
      "language": "en",
      "target_audience": "Gamers aged 18-35",
      "generated_variations": ["Variation 1...", "Variation 2...", "Variation 3..."],
      "selected_variation": "Variation 1...",
      "media_url": "https://example.com/image.jpg",
      "media_type": "image",
      "created_at": "2024-01-01T00:00:00",
      "updated_at": "2024-01-01T00:00:00",
      "user": {
        "id": "uuid",
        "first_name": "John",
        "last_name": "Doe",
        "email": "user@example.com"
      }
    }
  ]
}
```

---

### Get User Preferences

**GET** `/api/posts/preferences`

Get the current user's post generation preferences.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "preferences": {
    "preferred_platforms": ["Instagram", "Facebook"],
    "preferred_tonalities": ["Energetic", "Professional"],
    "preferred_languages": ["en", "fr"],
    "common_themes": ["Gaming", "Technology"]
  }
}
```

---

## Notification Endpoints

### Get Notifications

**GET** `/api/notifications/`

Get all notifications for the current user (limited to 50 most recent).

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "notifications": [
    {
      "id": "uuid",
      "type": "task_assigned",
      "message": "John Doe assigned you to task: Task Title",
      "related_task_id": "uuid",
      "related_subtask_id": null,
      "created_by_user_id": "uuid",
      "created_by_user": {
        "first_name": "John",
        "last_name": "Doe",
        "email": "john@example.com"
      },
      "is_read": false,
      "created_at": "2024-01-01T00:00:00"
    }
  ]
}
```

**Notification Types:**
- `task_created`: New task created
- `task_assigned`: Task assigned to user
- `subtask_assigned`: Subtask assigned to user

---

### Get Unread Count

**GET** `/api/notifications/unread-count`

Get the count of unread notifications for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "count": 5
}
```

---

### Mark Notification as Read

**PUT** `/api/notifications/<notification_id>/read`

Mark a specific notification as read.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Notification marked as read"
}
```

**Error Responses:**
- `404` - Notification not found

---

### Mark All as Read

**PUT** `/api/notifications/mark-all-read`

Mark all notifications as read for the current user.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "All notifications marked as read"
}
```

---

## Error Handling

### Common Error Scenarios

1. **Authentication Errors (401)**
   - Missing or invalid JWT token
   - Token expired (if expiration is enabled)
   - Solution: Re-authenticate via `/api/auth/login`

2. **Validation Errors (400)**
   - Missing required fields
   - Invalid field values
   - Check `details` field in error response

3. **Not Found Errors (404)**
   - Resource doesn't exist
   - Invalid UUID format
   - Check resource ID

4. **Server Errors (500)**
   - Database connection issues
   - AI API failures
   - Internal server errors
   - Check server logs

### Best Practices

- Always include `Authorization` header for protected endpoints
- Validate data before sending requests
- Handle error responses gracefully
- Implement retry logic for transient errors
- Store tokens securely (localStorage for web apps)

