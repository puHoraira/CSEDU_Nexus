# CSEDU Nexus Backend: Detailed Design and Rationale

## 1) Executive summary

This backend was designed as an extension-first, modular MERN architecture for your club management system. The goal was not only to make current features work, but to make future features easy to add with minimal rewrites.

The implementation follows these core ideas:

- Clear module boundaries (auth, governance, events, finance, membership, meetings, elections)
- Data-driven governance design for EC posts and terms
- Policy-driven business rules for constitutional constraints
- Role and permission system that can evolve without changing endpoint code everywhere
- Layered structure to keep controllers thin and business logic reusable

The result is a backend that is close to Open Closed Principle:

- Open for extension: add policy handlers, roles, permissions, EC posts, and modules
- Closed for modification: existing core flow can remain stable while new behavior is plugged in

---

## 2) What was implemented

### 2.1 Project and runtime setup

- Node Express service with MongoDB (Mongoose)
- Environment based config in env files
- App bootstrap and DB connection setup
- Request middleware stack for security, parsing, logging, and error handling

Main files:

- src/app.js
- src/server.js
- src/config/env.js
- src/config/db.js
- .env.example

Why this way:

- Keeps environment and startup logic centralized
- Makes deployment and local development consistent
- Avoids hardcoded runtime values

---

### 2.2 Core utilities and middleware

Implemented shared core utilities to standardize behavior across all modules:

- ApiError: uniform exception shape
- ApiResponse: consistent response format
- asyncHandler: catches async controller errors
- validate middleware: request validation with zod schemas
- auth middleware: JWT verification and auth context injection
- authorize middleware: permission check via AccessService
- requestAudit middleware: request metadata for traceability
- global error and not found handlers

Main files:

- src/core/ApiError.js
- src/core/ApiResponse.js
- src/core/asyncHandler.js
- src/middleware/validate.js
- src/middleware/auth.js
- src/middleware/authorize.js
- src/middleware/requestAudit.js
- src/middleware/errorHandler.js

Why this way:

- Prevents repeated boilerplate in controllers
- Gives uniform validation and error behavior across modules
- Enables centralized security and permission enforcement

---

### 2.3 Policy engine for OCP style rule extension

A policy registry was added so business rules can be extended by registration instead of rewriting services.

Current registered policies:

- membership.register
- ec.holdPost

Main files:

- src/policies/PolicyRegistry.js
- src/policies/membershipPolicies.js
- src/policies/ecPolicies.js
- src/policies/index.js

Why this way:

- New rules can be introduced as new policy handlers
- Existing service orchestration remains stable
- Cleaner separation between workflow and rule evaluation

---

## 3) Data model and why it was designed like this

## 3.1 Identity and access

Collections:

- User
- Member
- Role
- Permission
- RolePermission
- UserRole

Purpose:

- User stores account credentials and profile basics
- Member stores club-specific member state and academic year context
- Role and Permission define capability matrix
- UserRole and RolePermission create many to many mapping

Why this way:

- Role matrix can change without touching controller logic
- New permissions can be introduced and granted by data only
- Supports multiple concurrent roles per user over time

---

## 3.2 Governance with dynamic EC design

Collections:

- EcTerm
- EcPost
- EcAppointment

Purpose:

- EcTerm defines committee periods
- EcPost stores post catalog and eligibility metadata
- EcAppointment binds a member to a post for a term

Why this is important:

This is the core OCP win. You do not hardcode every post into schema columns. Instead:

- Add new post by inserting a new EcPost document
- Apply post-specific eligibility through minYear and minEcYears
- Appointments stay generic regardless of post count

So next year if a new post is added, you do not redesign database tables or rewrite existing appointment structure.

---

## 3.3 Event and finance

Collections:

- Event
- Volunteer
- Transaction

Purpose:

- Event module for activity lifecycle
- Volunteer linking table for member to event participation
- Transaction as append-only style ledger entries

Why this way:

- Keeps event and volunteer concerns separated and scalable
- Immutable financial record style improves auditability and trust

---

## 3.4 Audit and governance compliance

Collection:

- AuditLog

Purpose:

- Track who did what, where, and when

Why this way:

- Critical for governance workflows and accountability
- Useful for debugging, moderation, and compliance traceability

---

## 3.5 Newly added advanced workflow modules

Collections:

- MembershipCancellation
- Meeting
- MeetingAttendance
- Election
- ElectionCandidate
- Vote

Purpose:

- MembershipCancellation supports multi-step approval flow before execution
- Meeting and MeetingAttendance support scheduling and attendance recording
- Election, ElectionCandidate, Vote support phase-based election process

Why this way:

- Workflow entities are explicit and composable
- Approval and voting paths become queryable and auditable
- Future process changes can be handled by extending service and policy logic

---

## 4) Service layer and rationale

Services implemented:

- AuthService
- AccessService
- AuditService
- TokenService
- GovernanceService
- EventService
- FinanceService
- MembershipService
- MeetingService
- ElectionService

Service responsibilities:

- Controllers delegate all business logic to services
- Services coordinate models, policies, and audit logging
- Services keep workflows testable and reusable independent of HTTP

Why this way:

- Keeps controllers simple and stable
- Encourages single responsibility per service
- Easier unit and integration testing

---

## 5) Controllers and routes

Controllers implemented:

- AuthController
- GovernanceController
- EventController
- FinanceController
- MembershipController
- MeetingController
- ElectionController

Route groups implemented:

- auth
- governance
- events
- finance
- membership
- meetings
- elections

Why route grouping was done this way:

- Each module is independently navigable and extendable
- New module can be mounted in one place without touching existing route internals
- Permission guards remain explicit at endpoint level

---

## 6) Validation strategy

Validation files:

- authValidators
- governanceValidators
- eventValidators
- financeValidators
- membershipValidators
- meetingValidators
- electionValidators

Why this way:

- Request shape constraints remain close to route layer
- Prevents invalid payloads from entering service logic
- Makes API contracts explicit and maintainable

---

## 7) Authorization model and extension behavior

Authorization flow:

1. authenticate verifies JWT and sets auth context
2. authorize checks permission key via AccessService
3. AccessService resolves role based permissions and active role-like context

Why this way:

- Security is centralized, not duplicated
- Feature teams can add endpoints by declaring permission keys
- Permission matrix can evolve through seeded data and role mappings

---

## 8) Membership cancellation workflow details

Implemented flow:

1. Request created
2. Approval steps processed by authorized role holders
3. Execution occurs only after full approvals
4. Member status transitions to Cancelled

Why this structure:

- Mirrors constitutional approval style
- Keeps approval chain visible and auditable
- Supports future addition of more approver steps by data and service extension

---

## 9) Meeting module details

Implemented flow:

- Create meeting
- Record attendance entries
- Generate absence alerts for consecutive non attendance

Why this structure:

- Separates meeting event and attendance records
- Supports later extension like quorum, minutes versions, notice deadlines

---

## 10) Election module details

Implemented flow:

- Create election with phase and term
- Add candidates with eligibility checks
- Cast votes when election is active
- Aggregate results by candidate

Why this structure:

- Supports both phase 1 and phase 2 patterns through data fields
- Eligibility remains policy-driven
- Vote aggregation can be extended for post-wise reporting

---

## 11) Seeding and base platform initialization

Seed script provisions:

- baseline roles
- baseline permissions
- role permission grants
- EC post catalog from your current constitution model

Why this matters:

- Fresh environments become immediately usable
- Policy and permission assumptions are reproducible
- Onboarding and deployment become faster

---

## 12) OCP alignment evaluation

Where OCP is strong:

- New EC post: add EcPost document, no schema rewrite
- New permission: add Permission and RolePermission mapping
- New rule: add policy handler and register key
- New module: add model, service, controller, validator, route and mount once

Where modification may still happen:

- New endpoint still requires route registration
- Complex cross-module process changes may require service orchestration updates

This is normal and acceptable. The architecture minimizes high-risk structural rewrites.

---

## 13) Known limitations and recommended next improvements

Current limitations:

- No transaction session orchestration for multi-document critical flows
- No background job queue for notifications and scheduled checks
- No full test suite yet for new advanced modules
- No explicit soft-delete strategy for all entities

Recommended next work:

1. Add unit tests for all services and policy handlers
2. Add integration tests for cancellation, meeting attendance, and election flow
3. Add Mongo session transactions for cancellation execute and election critical writes
4. Add notification/outbox module for asynchronous workflows
5. Add API documentation collection (OpenAPI or Postman)

---

## 14) Practical extension examples

Example A: add a new EC post

- Create one EcPost document with eligibility and order
- Optionally add role and permission mapping
- Appointment logic works without schema changes

Example B: add a new approval role in cancellation

- Extend approvals array shape creation logic
- Add review permission and role grant
- Reuse same review and execute workflow

Example C: add election phase specific constraints

- Add new election policy handler
- Register policy key
- Call policy in ElectionService before status transitions

---

## 15) Final takeaway

This backend was intentionally built to match your project reality:

- Constitution-driven governance rules
- Frequent role and post changes over time
- Need for maintainable and auditable workflows

The chosen architecture gives you a stable base where change is expected and supported, not feared.
