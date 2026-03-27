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

## Symptom Logs

### Get Symptom Logs
GET /api/symptom-logs (requires auth)

Returns paginated symptom logs for the authenticated user, with optional date range filtering. Includes related symptom details.

Query parameters:
- `startDate` (optional): ISO 8601 datetime string for range start
- `endDate` (optional): ISO 8601 datetime string for range end
- `limit` (optional): Number of results per page (1-100, default 50)
- `offset` (optional): Number of results to skip (default 0)

Response: 200 OK
```json
{
  "symptom_logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "symptom_id": "uuid",
      "severity": 7,
      "notes": "Started after lunch",
      "logged_at": "2025-01-15T10:00:00.000Z",
      "created_at": "2025-01-15T10:05:00.000Z",
      "symptom": {
        "id": "uuid",
        "name": "Headache",
        "category": "pain",
        "is_active": true
      }
    }
  ],
  "pagination": {
    "total": 1,
    "limit": 50,
    "offset": 0
  }
}
```

### Create Symptom Log
POST /api/symptom-logs (requires auth)

Creates a new symptom log for the authenticated user. The symptom must be either a system default or belong to the user.

Request:
```json
{
  "symptom_id": "uuid",
  "severity": 7,
  "notes": "Started after lunch",
  "logged_at": "2025-01-15T10:00:00.000Z"
}
```

- `symptom_id` (required): UUID of an existing symptom
- `severity` (required): Integer 1-10
- `notes` (optional): Free-text notes
- `logged_at` (required): ISO 8601 datetime string

Response: 201 Created
```json
{
  "symptom_log": {
    "id": "uuid",
    "user_id": "uuid",
    "symptom_id": "uuid",
    "severity": 7,
    "notes": "Started after lunch",
    "logged_at": "2025-01-15T10:00:00.000Z",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

### Update Symptom Log
PATCH /api/symptom-logs/:id (requires auth)

Updates an existing symptom log. Users can only update their own logs.

Request:
```json
{
  "severity": 9,
  "notes": "Getting worse",
  "logged_at": "2025-01-15T14:00:00.000Z"
}
```

All fields are optional, but at least one must be provided.

Response: 200 OK
```json
{
  "symptom_log": {
    "id": "uuid",
    "user_id": "uuid",
    "symptom_id": "uuid",
    "severity": 9,
    "notes": "Getting worse",
    "logged_at": "2025-01-15T14:00:00.000Z",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

### Delete Symptom Log
DELETE /api/symptom-logs/:id (requires auth)

Deletes a symptom log. Users can only delete their own logs.

Response: 200 OK
```json
{
  "message": "Symptom log deleted successfully"
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

---

## Medications

### List Medications
GET /api/medications (requires auth)

Returns all medications belonging to the authenticated user, ordered by name ascending.

Response: 200 OK
```json
{
  "medications": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Ibuprofen",
      "dosage": "200mg",
      "frequency": "Twice daily",
      "is_active": true,
      "created_at": "2025-01-15T10:00:00.000Z"
    }
  ]
}
```

### Create Medication
POST /api/medications (requires auth)

Request:
```json
{
  "name": "Ibuprofen",
  "dosage": "200mg",
  "frequency": "Twice daily"
}
```

Required fields:
- `name` - string (1-200 characters)

Optional fields:
- `dosage` - string (max 200 characters)
- `frequency` - string (max 200 characters)

Response: 201 Created
```json
{
  "medication": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Ibuprofen",
    "dosage": "200mg",
    "frequency": "Twice daily",
    "is_active": true,
    "created_at": "2025-01-15T10:00:00.000Z"
  }
}
```

### Update Medication
PATCH /api/medications/:id (requires auth)

Users can only update their own medications. At least one field must be provided.

Request:
```json
{
  "name": "Updated Name",
  "dosage": "400mg",
  "is_active": false
}
```

Response: 200 OK
```json
{
  "medication": { ... }
}
```

### Delete Medication
DELETE /api/medications/:id (requires auth)

Users can only delete their own medications.

Response: 200 OK
```json
{
  "message": "Medication deleted successfully"
}
```

---

## Medication Logs

### List Medication Logs
GET /api/medication-logs (requires auth)

Returns medication logs for the authenticated user, ordered by created_at descending. Includes related medication details.

Query parameters:
- `startDate` (optional) - ISO 8601 datetime, filters logs on or after this date
- `endDate` (optional) - ISO 8601 datetime, filters logs on or before this date

Response: 200 OK
```json
{
  "medication_logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "medication_id": "uuid",
      "taken": true,
      "taken_at": "2025-01-15T10:00:00.000Z",
      "notes": "Took with breakfast",
      "created_at": "2025-01-15T10:05:00.000Z",
      "medication": {
        "id": "uuid",
        "name": "Ibuprofen",
        "dosage": "200mg",
        "frequency": "Twice daily",
        "is_active": true
      }
    }
  ]
}
```

### Create Medication Log
POST /api/medication-logs (requires auth)

Logs whether a medication was taken or not. The medication must belong to the authenticated user.

Request:
```json
{
  "medication_id": "uuid",
  "taken": true,
  "taken_at": "2025-01-15T10:00:00.000Z",
  "notes": "Took with breakfast"
}
```

Required fields:
- `medication_id` - UUID of an existing medication owned by the user
- `taken` - boolean

Optional fields:
- `taken_at` - ISO 8601 datetime
- `notes` - string

Response: 201 Created
```json
{
  "medication_log": {
    "id": "uuid",
    "user_id": "uuid",
    "medication_id": "uuid",
    "taken": true,
    "taken_at": "2025-01-15T10:00:00.000Z",
    "notes": "Took with breakfast",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

### Update Medication Log
PATCH /api/medication-logs/:id (requires auth)

Users can only update their own logs. At least one field must be provided.
Optional fields (taken_at, notes) can be set to null.

Request:
```json
{
  "taken": false,
  "notes": "Skipped due to stomach ache"
}
```

Response: 200 OK
```json
{
  "medication_log": { ... }
}
```

### Delete Medication Log
DELETE /api/medication-logs/:id (requires auth)

Users can only delete their own logs.

Response: 200 OK
```json
{
  "message": "Medication log deleted successfully"
}
```

---

## Habits

### List Habits
GET /api/habits (requires auth)

Returns system default habits (user_id = null) and the authenticated user's custom habits, ordered by name ascending.

Response: 200 OK
```json
{
  "habits": [
    {
      "id": "uuid",
      "user_id": null,
      "name": "Exercise",
      "tracking_type": "boolean",
      "unit": null,
      "is_active": true
    },
    {
      "id": "uuid",
      "user_id": "uuid",
      "name": "Water Intake",
      "tracking_type": "numeric",
      "unit": "glasses",
      "is_active": true
    }
  ]
}
```

### Create Habit
POST /api/habits (requires auth)

Creates a custom habit for the authenticated user.

Request:
```json
{
  "name": "Meditation",
  "tracking_type": "boolean"
}
```

Required fields:
- `name` - string (1-200 characters)
- `tracking_type` - one of: `boolean`, `numeric`, `duration`

Optional fields:
- `unit` - string (max 100 characters), e.g. "glasses", "hours", "minutes"

Response: 201 Created
```json
{
  "habit": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "Meditation",
    "tracking_type": "boolean",
    "unit": null,
    "is_active": true
  }
}
```

### Update Habit
PATCH /api/habits/:id (requires auth)

Only user-created habits can be updated. System defaults cannot be modified.

Request:
```json
{
  "name": "Updated Name",
  "tracking_type": "numeric",
  "unit": "count",
  "is_active": false
}
```

All fields are optional, but at least one must be provided.

Response: 200 OK
```json
{
  "habit": { ... }
}
```

Error responses:
- 400 - Empty body or validation error
- 403 - Cannot modify system default habits
- 404 - Habit not found

### Delete Habit
DELETE /api/habits/:id (requires auth)

Only user-created habits can be deleted. System defaults cannot be deleted.

Response: 200 OK
```json
{
  "message": "Habit deleted successfully"
}
```

Error responses:
- 403 - Cannot delete system default habits
- 404 - Habit not found

---

## Habit Logs

### List Habit Logs
GET /api/habit-logs (requires auth)

Returns habit logs for the authenticated user, ordered by logged_at descending. Includes related habit details.

Query parameters:
- `startDate` (optional) - ISO 8601 datetime, filters logs on or after this date
- `endDate` (optional) - ISO 8601 datetime, filters logs on or before this date

Response: 200 OK
```json
{
  "habit_logs": [
    {
      "id": "uuid",
      "user_id": "uuid",
      "habit_id": "uuid",
      "value_boolean": true,
      "value_numeric": null,
      "value_duration": null,
      "notes": "Morning run",
      "logged_at": "2025-01-15T10:00:00.000Z",
      "created_at": "2025-01-15T10:05:00.000Z",
      "habit": {
        "id": "uuid",
        "name": "Exercise",
        "tracking_type": "boolean",
        "unit": null,
        "is_active": true
      }
    }
  ]
}
```

### Create Habit Log
POST /api/habit-logs (requires auth)

Creates a new habit log. The habit must be a system default or belong to the authenticated user.

Request:
```json
{
  "habit_id": "uuid",
  "value_boolean": true,
  "notes": "Completed morning exercise",
  "logged_at": "2025-01-15T10:00:00.000Z"
}
```

Required fields:
- `habit_id` - UUID of an existing habit (system default or user's own)
- `logged_at` - ISO 8601 datetime

Optional fields (use the appropriate one based on tracking_type):
- `value_boolean` - boolean (for boolean habits)
- `value_numeric` - number (for numeric habits)
- `value_duration` - integer (for duration habits, in minutes)
- `notes` - string

Response: 201 Created
```json
{
  "habit_log": {
    "id": "uuid",
    "user_id": "uuid",
    "habit_id": "uuid",
    "value_boolean": true,
    "value_numeric": null,
    "value_duration": null,
    "notes": "Completed morning exercise",
    "logged_at": "2025-01-15T10:00:00.000Z",
    "created_at": "2025-01-15T10:05:00.000Z"
  }
}
```

### Update Habit Log
PATCH /api/habit-logs/:id (requires auth)

Users can only update their own logs. At least one field must be provided.
Value fields and notes can be set to null.

Request:
```json
{
  "value_boolean": false,
  "notes": "Skipped today"
}
```

Response: 200 OK
```json
{
  "habit_log": { ... }
}
```

### Delete Habit Log
DELETE /api/habit-logs/:id (requires auth)

Users can only delete their own logs.

Response: 200 OK
```json
{
  "message": "Habit log deleted successfully"
}
```
