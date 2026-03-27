# WellTrack API Reference

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
