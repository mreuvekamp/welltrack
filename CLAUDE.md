# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

WellTrack is a symptom & wellness tracker for people with chronic health conditions. Users log symptoms, moods, medications, and habits, then view trends to identify patterns.

## Tech Stack

- **Backend:** Node.js, Express, TypeScript, Prisma ORM, PostgreSQL, JWT auth, Zod validation
- **Frontend:** React, TypeScript, Vite, Tailwind CSS, React Router, react-hook-form
- **Monorepo:** `/backend` and `/frontend` directories at root level

## Commands

### Backend (`/backend`)
```bash
npm run dev        # Start dev server with ts-node-dev (auto-reload)
npm run build      # Compile TypeScript to dist/
npm run start      # Run compiled JS from dist/
npx prisma migrate dev    # Run database migrations
npx prisma generate       # Regenerate Prisma client
npx prisma db seed        # Seed default data
```

## Architecture

### Backend
- `src/controllers/` — Route handlers (thin, delegate to services)
- `src/services/` — Business logic
- `src/routes/` — Express route definitions
- `src/middleware/` — Auth verification, validation, error handling
- `src/utils/` — Helpers (JWT, password hashing)
- `src/index.ts` — Express app entry point
- `prisma/schema.prisma` — Database schema
- `prisma/seed.ts` — Seed script for default symptoms and habits

### Frontend
- `src/pages/` — Page components
- `src/components/` — Reusable UI components
- `src/context/` — React context (auth state)
- `src/hooks/` — Custom React hooks
- `src/services/` — API call layer (axios)
- `src/types/` — TypeScript type definitions

## Key Design Decisions

- Symptoms and habits have nullable `user_id`: NULL = system default, set = user-created custom entry
- All log tables indexed on `(user_id, logged_at)` for query performance
- Habits support three tracking types: boolean, numeric, duration
- Timezone stored per-user, all times stored as UTC in database
- JWT with short-lived access tokens + long-lived refresh tokens

## Git Workflow

**Never commit directly to `main`.** Always create a feature branch and open a pull request.

## Testing Requirements
Before marking any task as cpmplete:
1. Write unit tests for new functionality
2. n the full test suite with: `npm test`
3. If tests fail:
 - Analyze the failure output
 - Fix the code (not the tests, unless tests are incorrect)
 - Re-run tests until all pass
4. For API endpoints, include integration tests that verify:
- Success responses with valid input
- Authentication requirements
- Edge cases
## Test Commands
- Backend tests: `cd backend && npm test`
- Frontend tests: `cd frontend && npm test`
- Run specific test file: `npm test -- path/to/test.ts`
- Run test matching pattern: `npm test -- --grep "pattern"`

## Documentation

- `Documents/Requirements.md` — Full product requirements and data model
- `Documents/Tasks.md` — Implementation task breakdown by phase
- `Documents/Wireframes/` — UI wireframes for all screens

## UX Guidelines

The target audience includes users with brain fog and fatigue. Prioritize:
- Large touch targets (min 48px), minimal steps to log (2-3 taps)
- Visual feedback with colors/icons on scales, not just numbers
- Soft, calming palette (teal, sage) — avoid clinical aesthetics
