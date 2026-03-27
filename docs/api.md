# WellTrack API Reference

Base URL: `/api`

All endpoints requiring authentication expect a Bearer token in the Authorization header:
```
Authorization: Bearer <access_token>
```

---

## Auth

### Register
POST /api/auth/register

Request:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "display_name": "John Doe"
}
```

Response: 201 Created
```json
{
  "accessToken": "jwt...",
  "refreshToken": "uuid",
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "timezone": "UTC"
  }
}
```

### Login
POST /api/auth/login

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response: 200 OK
```json
{
  "accessToken": "jwt...",
  "refreshToken": "uuid",
  "user": { ... }
}
```

### Refresh Token
POST /api/auth/refresh

Request:
```json
{
  "refreshToken": "uuid"
}
```

Response: 200 OK
```json
{
  "accessToken": "jwt..."
}
```

### Logout
POST /api/auth/logout

Request:
```json
{
  "refreshToken": "uuid"
}
```

Response: 200 OK
```json
{
  "message": "Logged out successfully"
}
```

---

## Users

### Get Current User
GET /api/users/me (requires auth)

Response: 200 OK
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "display_name": "John Doe",
    "timezone": "UTC",
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

### Update Current User
PATCH /api/users/me (requires auth)

Request:
```json
{
  "display_name": "Jane Doe",
  "timezone": "Europe/Amsterdam"
}
```

Response: 200 OK
```json
{
  "user": { ... }
}
```

### Delete Account
DELETE /api/users/me (requires auth)

Response: 200 OK
```json
{
  "message": "Account deleted successfully"
}
```

---

## Symptoms

### List Symptoms
GET /api/symptoms (requires auth)

Returns system defaults (user_id = null) and user's custom symptoms.

Response: 200 OK
```json
{
  "symptoms": [
    {
      "id": "uuid",
      "user_id": null,
      "name": "Headache",
      "category": "Neurological",
      "is_active": true
    }
  ]
}
```

### Create Symptom
POST /api/symptoms (requires auth)

Request:
```json
{
  "name": "Dizziness",
  "category": "Neurological"
}
```

Response: 201 Created
```json
{
  "symptom": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Dizziness",
    "category": "Neurological",
    "is_active": true
  }
}
```

### Update Symptom
PATCH /api/symptoms/:id (requires auth)

Only user-created symptoms can be updated.

Request:
```json
{
  "name": "Mild Dizziness",
  "is_active": false
}
```

Response: 200 OK
```json
{
  "symptom": { ... }
}
```

### Delete Symptom
DELETE /api/symptoms/:id (requires auth)

Only user-created symptoms can be deleted.

Response: 200 OK
```json
{
  "message": "Symptom deleted successfully"
}
```

---

## Mood Logs

### List Mood Logs
GET /api/mood-logs (requires auth)

Returns mood logs for the authenticated user, ordered by logged_at descending.

Query parameters:
- `startDate` (optional) - ISO 8601 datetime, filters logs on or after this date
- `endDate` (optional) - ISO 8601 datetime, filters logs on or before this date

Example: `GET /api/mood-logs?startDate=2025-01-01T00:00:00.000Z&endDate=2025-01-31T23:59:59.000Z`

Response: 200 OK
```json
{
  "mood_logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "mood_score": 4,
      "energy_level": 3,
      "stress_level": 2,
      "notes": "Feeling good today",
      "logged_at": "2025-01-15T10:00:00.000Z",
      "created_at": "2025-01-15T10:05:00.000Z"
    }
  ]
}
```

### Create Mood Log
POST /api/mood-logs (requires auth)

Request:
```json
{
  "mood_score": 4,
  "energy_level": 3,
  "stress_level": 2,
  "notes": "Feeling good today",
  "logged_at": "2025-01-15T10:00:00.000Z"
}
```

Required fields:
- `mood_score` - integer 1-5
- `logged_at` - ISO 8601 datetime

Optional fields:
- `energy_level` - integer 1-5
- `stress_level` - integer 1-5
- `notes` - string

Response: 201 Created
```json
{
  "mood_log": {
    "id": "uuid",
    "user_id": "uuid",
    "mood_score": 4,
    "energy_level": 3,
    "stress_level": 2,
    "notes": "Feeling good today",
    "logged_at": "2025-01-15T10:00:00.000Z",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

### Update Mood Log
PATCH /api/mood-logs/:id (requires auth)

Users can only update their own logs. At least one field must be provided.
Optional fields (energy_level, stress_level, notes) can be set to null.

Request:
```json
{
  "mood_score": 5,
  "energy_level": 4,
  "notes": "Updated mood entry"
}
```

Response: 200 OK
```json
{
  "mood_log": { ... }
}
```

Error responses:
- 400 - Empty body (no fields to update) or validation error
- 404 - Log not found or belongs to another user

### Delete Mood Log
DELETE /api/mood-logs/:id (requires auth)

Users can only delete their own logs.

Response: 200 OK
```json
{
  "message": "Mood log deleted successfully"
}
```

Error responses:
- 404 - Log not found or belongs to another user
