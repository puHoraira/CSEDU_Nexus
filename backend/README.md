# CSEDU Nexus Backend (MERN)

Express + MongoDB backend designed for extension-first development (OCP-friendly).

## Why this design is OCP-friendly

- System access is role-based using dynamic tables/collections:
  - `roles`, `permissions`, `role_permissions`, `user_roles`
- EC governance is post-catalog based:
  - `ec_posts`, `ec_terms`, `ec_appointments`
- Adding a new EC post requires data insertion only (no schema rewrite).
- Business rules are policy-driven via a policy registry.

## Folder structure

- `src/config` - env + db config
- `src/core` - shared errors/helpers
- `src/middleware` - auth/authorization/validation/error handling
- `src/models` - mongoose models
- `src/policies` - pluggable policy handlers
- `src/services` - business orchestration
- `src/controllers` - request handling
- `src/routes` - API routes
- `src/validators` - zod schemas
- `src/seeds` - seed scripts

## Quick start

1. Install dependencies

```bash
npm install
```

2. Create env file

```bash
cp .env.example .env
```

3. Run API

```bash
npm run dev
```

4. Seed base data (roles, permissions, EC post catalog)

```bash
npm run seed
```

## Core API modules

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`

- `GET /api/v1/governance/ec-posts`
- `POST /api/v1/governance/ec-posts`
- `POST /api/v1/governance/ec-terms`
- `POST /api/v1/governance/ec-appointments`

- `GET /api/v1/events`
- `POST /api/v1/events`
- `POST /api/v1/events/volunteers`

- `POST /api/v1/finance/transactions`
- `GET /api/v1/finance/ledger`

- `POST /api/v1/membership/cancellations`
- `PATCH /api/v1/membership/cancellations/:id/review`
- `PATCH /api/v1/membership/cancellations/:id/execute`

- `GET /api/v1/meetings`
- `POST /api/v1/meetings`
- `POST /api/v1/meetings/attendance`
- `POST /api/v1/meetings/absence-alerts`

- `GET /api/v1/elections`
- `POST /api/v1/elections`
- `POST /api/v1/elections/candidates`
- `POST /api/v1/elections/votes`
- `GET /api/v1/elections/:electionId/results`

## Add new EC post without changing code

Example:

```json
{
  "code": "SECRETARY_RESEARCH",
  "title": "Secretary (Research)",
  "minYear": 2,
  "minEcYears": 0,
  "displayOrder": 13,
  "isActive": true
}
```

Use `POST /api/v1/governance/ec-posts` with a privileged user.

## Extension guide

- Add a new business rule:
  1. Create new policy file in `src/policies`.
  2. Register it in `src/policies/index.js`.
  3. Call `policyRegistry.evaluate("your.key", input)` from service.

- Add a new feature module:
  1. Add model + service + controller + validator + route.
  2. Mount route in `src/routes/index.js`.

## New modules added

- Membership cancellation workflow:
  - Dynamic approval chain (`President`, `Moderator`, `Chief Patron`) stored as data in `MembershipCancellation.approvals`
  - Supports request, role-based review, and execute steps

- Meeting module:
  - Meeting schedule + minutes
  - Attendance recording with extensible absence alert check

- Election module:
  - Phase-aware election records
  - Candidate onboarding with policy-based eligibility validation
  - Vote casting + aggregated result endpoint
