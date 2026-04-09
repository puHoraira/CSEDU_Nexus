# CSEDU Nexus Design and Implementation Plan

## 1. Project Overview

**Project Name:** CSEDU Nexus  
**Domain:** CSEDU Students' Club Management System  
**Type:** Responsive web application  
**Goal:** Build a centralized platform for membership, elections, events, finances, meetings, notices, certificates, and role-based access control for CSEDUSC.

This document converts the SRS into an implementation-oriented design reference. It is meant to guide development step by step, starting from project setup, then frontend, backend, database, and finally testing and deployment.

## 2. Problem Statement

The club currently depends on manual or scattered workflows for:

- Membership registration and cancellation
- Election eligibility and voting
- Event and volunteer management
- Financial tracking and reporting
- Executive meeting scheduling and attendance
- Certificate issuance
- Notice publication and approvals

The system should reduce manual work, preserve constitutional rules, improve transparency, and provide audit trails.

## 3. Recommended Technical Stack

This stack is chosen for maintainability, university project speed, and clean separation of concerns.

### Frontend
- Next.js with React and TypeScript
- Tailwind CSS for fast responsive UI
- shadcn/ui or a similar component library for consistent components
- React Hook Form + Zod for form validation
- TanStack Query for server-state handling
- Recharts or Chart.js for dashboards
- next-intl or a similar library if Bangla + English UI is implemented in v1

### Backend
- NestJS with TypeScript
- REST API as the main backend interface
- Swagger/OpenAPI for API documentation
- Passport.js + JWT authentication
- Role and permission guards for access control
- File upload support for certificates, notices, and supporting documents
- Email notifications with Nodemailer or a similar provider

### Database
- PostgreSQL
- Prisma ORM for schema management and migration
- Soft delete and audit fields on sensitive records
- Transaction logs for financial and governance events

### Infrastructure and Dev Tools
- Docker for local development and deployment parity
- GitHub for source control
- GitHub Actions for CI
- ESLint + Prettier
- Jest for unit tests
- Playwright or Cypress for end-to-end tests

## 4. Product Goals

The first release should support:

- User login and registration
- Member profile management
- Event listing and registration
- Volunteer sign-up
- Executive dashboards
- Election workflows
- Finance module foundation
- Meeting and attendance management
- Notice and certificate workflows
- RBAC foundation

## 4.1 Constitution Compliance Baseline

The implementation must enforce the constitution as executable business rules, not optional workflow notes.

### Governance and authority constraints
- Chief Patron is the Department Chairman and has final override rights with Moderator(s) (Article IV).
- Chief Patron can abolish the EC on recommendation of the Academic Committee (Article IV).
- Membership cancellation notices must require signatures from Chief Patron, Moderator(s), and President (Article VII).

### Membership constraints
- Any current CSEDU student is eligible for general membership (Article VI).
- Membership form and checklist acceptance are mandatory before activation (Article VI).
- Membership must be cancelled for constitutional violations, punishments, banned organization involvement, and expiry of studentship (Article VII).

### EC and election constraints
- EC is formed from five representatives per current undergraduate batch in Phase 1 (Article V, XIV).
- Posts 1-11 are elected in Phase 2 by all undergraduate students (Article XIV).
- Candidate eligibility for each post must follow year and EC experience rules (Article XIV, XV).
- Impeachment and constitution-change voting require at least two-thirds approval (Articles VIII, XVII).

### Finance constraints
- Treasurer prepares records and reports; Moderator verifies expenditure reports (Article XII).
- Cheque-level bank approval requires Chief Patron and one Moderator signature (Article XII).
- Budget statement must be submitted within one month of EC formation (Article XIII).

### Meeting and AGM constraints
- Executive meetings must occur at least once every two months (Article XVI).
- Absence in three consecutive meetings without notice triggers EC cancellation workflow (Article IX).
- AGM requires one-week prior notice and report submissions by President and Treasurer (Article XVIII).

### Constitution change constraints
- Changes are limited to once per EC year and require the staged approval path (Article XVII).
- Articles IV, VII, and XVI are immutable and cannot be modified by EC workflow (Article XVII-A).

## 5. Scope

### In Scope
- General member registration
- Profile and membership lifecycle management
- EC formation and post assignment
- Election phase 1 and phase 2 flows
- Event and volunteer management
- Meeting scheduling, attendance, minutes
- Budget submission and expenditure reports
- Fund ledger and audit history
- Certificate request and approval
- Notifications by email and in-app
- Role-based access control
- Admin review and moderation workflows
- AGM notice and closing workflow
- Mandatory annual activity completion tracking

### Out of Scope for v1
- Native iOS and Android apps
- University ERP integration
- Full payment gateway integration unless required later
- Social media auto-posting
- Advanced analytics beyond basic dashboards

## 6. Key Design Decision: Simplified RBAC

Your SRS currently defines many distinct titles, and the reviewer correctly noted that this is hard to maintain if every post becomes a separate system role.

### Recommended model
Use **hierarchical RBAC** instead of making every designation a top-level role.

#### Layer 1: System roles
These control access to major areas.
- `MEMBER`
- `EC_MEMBER`
- `MODERATOR`
- `CHIEF_PATRON`
- `ELECTION_COMMISSIONER`
- `ALUMNI`

#### Layer 2: Post or designation scope
These define the person’s office inside the club.
- President
- Vice President
- General Secretary
- Treasurer
- Secretary posts
- Executive member

Post definitions should be data-driven in `ec_posts`, so new designations can be added through configuration instead of source-code changes.

#### Layer 3: Permission set
Permissions are assigned to system roles and optionally overridden by post.
- `member:view_events`
- `member:register`
- `event:create`
- `event:approve`
- `finance:read`
- `finance:write`
- `election:manage`
- `constitution:approve`
- `certificate:issue`

### Why this is better
- Easier to extend later
- Adding a new designation does not require rewriting the whole system
- Backend guards become simpler
- Permissions can be configured without changing business logic
- EC posts can be stored as data instead of hard-coded roles

## 7. System Architecture

### High-Level Architecture
- Frontend web app for all users
- Backend API for business logic and authorization
- PostgreSQL database for structured data
- Object storage for generated PDFs and uploaded attachments
- Email service for notifications and approvals

### Request Flow
1. User logs in through the frontend.
2. Frontend sends JWT to backend.
3. Backend validates identity and permissions.
4. Backend reads or writes data in PostgreSQL.
5. Backend publishes notification or generates a file if needed.
6. Frontend refreshes state using API responses.

### Module Separation
- Authentication module
- Membership module
- User and role module
- Event module
- Volunteer module
- Election module
- Finance module
- Meeting module
- Notice module
- Certificate module
- Audit log module
- Notification module

## 8. Frontend Design

## 8.1 Frontend Goals
The frontend should be:
- Clean and responsive
- Easy to use on desktop and tablet
- Consistent across all dashboards
- Fast enough for election and event traffic
- Accessible with readable contrast and keyboard navigation

## 8.2 Suggested Pages

### Public Pages
- Home page
- About CSEDUSC
- Event listing
- Login page
- Registration page
- Notice board

### Member Pages
- Member dashboard
- Membership profile
- Event registration screen
- Volunteer application screen
- Certificate request screen
- Notification center

### EC Pages
- EC dashboard
- Meeting scheduler
- Attendance recorder
- Event management panel
- Budget submission screen
- Election dashboard
- Election commission panel

### Moderator and Chief Patron Pages
- Approval queue
- Financial audit page
- Membership cancellation queue
- Constitution change workflow
- Certificate approvals
- Reports and export screens

## 8.3 UI Structure

### Layout
- Top header with club name, user menu, and notifications
- Left sidebar for authenticated areas
- Main content panel with breadcrumb navigation
- Summary cards on dashboards
- Data tables for finance, members, votes, and meetings

### Visual Style
- Navy and teal primary palette
- Gold accent for authority and highlights
- White surfaces with soft gray borders
- Status badges for active, pending, rejected, cancelled, expired
- Clear form validation messages

### Reusable Components
- Sidebar
- Navbar
- Role guard layout
- Stat card
- Table wrapper
- Filter bar
- Timeline component
- Modal dialog
- Approval card
- Status badge
- File upload control
- Rich text editor for meeting minutes

## 8.4 Frontend State Strategy
- Server data should come from API responses
- Use TanStack Query for caching and invalidation
- Use local component state only for forms and UI toggles
- Keep authentication state in a secure store or cookie-based session flow
- Use optimistic updates carefully for non-critical actions only

## 8.5 Frontend Forms
Important forms:
- Member registration
- Event creation
- Volunteer signup
- Meeting creation
- Attendance marking
- Budget submission
- Expense entry
- Certificate request
- Election nomination
- Constitution change proposal

All forms should have:
- Required field validation
- Inline error messages
- Confirmation before destructive actions
- Step-based flow for complex submissions

## 9. Backend Design

## 9.1 Backend Goals
The backend must:
- Enforce business rules from the constitution
- Protect all sensitive operations with permissions
- Keep audit logs for critical actions
- Validate election eligibility
- Prevent direct tampering with financial and vote records
- Send notifications for important workflow events

## 9.2 Backend Modules

### Authentication Module
- Registration
- Login
- Logout
- Password hashing
- JWT issue and refresh
- Email verification if needed

### User Module
- User profile data
- Membership status
- Role assignment
- Post assignment
- Alumni conversion on graduation

### Membership Module
- New membership registration
- Cancellation
- Expiry handling
- Member certificate references

### Event Module
- Create/update/archive events
- Assign budgets
- Link volunteer requirements
- Track event status

### Volunteer Module
- Volunteer signup
- Volunteer assignment
- Completion status

### Meeting Module
- Schedule meetings
- Store minutes
- Capture attendance
- Flag absences
- Enforce minimum frequency (at least one executive meeting every two months)

### Election Module
- Election setup
- Phase 1 voting
- Phase 2 voting
- Eligibility validation
- Result publication
- Election commission composition and approval tracking

### Finance Module
- Budget submission
- Income and expenditure entries
- Quarterly report generation
- Ledger review
- Audit trail
- Cheque co-signature rule tracking (Chief Patron + one Moderator)

### Certificate Module
- Request workflow
- Approval workflow
- PDF generation
- Download links

### Notification Module
- Email notifications
- In-app notifications
- Workflow event triggers

### Audit Module
- Record who did what and when
- Track before/after values for sensitive updates

## 9.3 API Style
Use REST endpoints with consistent naming.

Examples:
- `POST /auth/login`
- `POST /auth/register`
- `GET /me`
- `GET /members`
- `POST /members`
- `PATCH /members/:id/status`
- `GET /events`
- `POST /events`
- `POST /events/:id/volunteers`
- `POST /meetings`
- `POST /meetings/:id/attendance`
- `POST /elections`
- `POST /elections/:id/vote`
- `POST /finance/budgets`
- `POST /finance/transactions`
- `GET /reports/expenditure`
- `POST /certificates/requests`

## 9.4 Business Rule Enforcement
Critical rules should live in the backend, not the frontend.

Examples:
- Only eligible candidates can appear on ballots
- Only allowed users can approve budgets
- Only the Treasurer can add ledger entries
- Only the Chief Patron can issue certificates
- A member cannot vote twice in the same phase
- An EC post cannot be assigned twice in the same term
- Phase 2 cannot start before Phase 1 completes
- EC posts 1-11 vacancy fill must use EC-member vote from eligible EC pool (Article XI)
- Executive-member vacancy fill must use batch-level vote under moderator supervision (Article XI)
- Constitution change cannot target immutable articles IV, VII, and XVI (Article XVII-A)
- Constitution change cannot be executed more than once per EC term (Article XVII)
- Impeachment acceptance threshold must be validated as >= 2/3 of total EC members (Article VIII)
- Three consecutive unexcused absences must open EC-cancellation flow (Article IX)

## 9.5 Background Jobs
Use background jobs for:
- Membership expiry checks
- Notification delivery
- Report generation
- PDF generation
- Scheduled reminders for meetings or deadlines

## 9.6 Backend Design Patterns (Recommended)

Use a layered modular architecture with clear separation of concerns.

### Architectural style
- Modular Monolith first (easy to reason about, easier for a student team).
- Clean Architecture boundaries inside each module:
  - `presentation` (controllers, DTOs)
  - `application` (use-cases, command/query handlers)
  - `domain` (entities, value objects, domain services, policies)
  - `infrastructure` (Prisma repositories, adapters, email, file storage)

### Core patterns
- Repository Pattern: isolate Prisma queries behind repository interfaces.
- Unit of Work Pattern: use Prisma transactions for multi-table invariants.
- Strategy Pattern: eligibility rules, vacancy fill methods, and notice delivery modes.
- Policy Pattern: authorization and constitutional rules as composable policies.
- Factory Pattern: create aggregates like election setup, certificate generation, and notice bundles.
- Outbox Pattern: reliable notification/event dispatch after DB commit.
- Domain Events: emit events such as `MembershipCancelled`, `ElectionPhaseClosed`, `ImpeachmentAccepted`.

### Request execution flow
1. Controller validates DTO and auth context.
2. Application use-case executes business logic.
3. Domain policy checks constitutional constraints.
4. Repository writes through Unit of Work transaction.
5. Domain events saved to outbox.
6. Background worker publishes notifications.

### Module packaging convention (NestJS)
- `module-name.controller.ts` in presentation.
- `module-name.service.ts` for application orchestration only.
- `repositories/*.repository.ts` for DB access.
- `policies/*.policy.ts` for constitutional/business rules.
- `events/*.event.ts` and `handlers/*.handler.ts` for async workflows.

### Why this design is better
- Keeps constitutional rules testable and centralized.
- Reduces accidental coupling between controllers and DB queries.
- Makes future migration from modular monolith to microservices possible.
- Improves maintainability when roles, posts, and workflows evolve.

## 10. Database Design

## 10.1 Recommended Database Philosophy
Design the schema so that it is:
- Normalized enough to avoid duplication
- Flexible enough to support future rule changes
- Auditable for sensitive operations
- Easy to query for dashboards and reports

Additional principles:
- Keep lookup data (roles, permissions, post types, statuses) in reference tables.
- Model workflows explicitly (approval steps, vacancies, constitution changes) instead of embedding hidden state.
- Use append-only records for votes, financial transactions, and critical logs.
- Use soft-delete only for non-regulatory entities; never soft-delete ledgers or votes.

## 10.2 Core Tables

### A. Identity and access

#### users
Primary identity table.
- id (uuid, pk)
- fullName
- email (unique)
- passwordHash
- isEmailVerified
- authStatus (Active, Locked, Disabled)
- createdAt
- updatedAt

#### member_profiles
Member-specific profile and constitutional eligibility metadata.
- id (uuid, pk)
- userId (fk users.id, unique)
- studentId (unique)
- batch
- yearOfStudy
- department
- phone
- membershipStatus (Active, Cancelled, Expired)
- membershipDeclaredAt
- checklistAcceptedAt
- cancellationReasonCode
- joinedAt
- graduationResultPublishedAt
- createdAt
- updatedAt

#### roles
- id (uuid, pk)
- code (unique)
- name
- isSystemRole

#### permissions
- id (uuid, pk)
- code (unique)
- description

#### role_permissions
- roleId (fk roles.id)
- permissionId (fk permissions.id)
- composite unique(roleId, permissionId)

#### user_roles
- userId (fk users.id)
- roleId (fk roles.id)
- assignedAt
- composite unique(userId, roleId)

### B. Governance and EC

#### ec_terms
- id (uuid, pk)
- title
- startDate
- endDate
- status (Planned, Active, Closed)
- constitutionChangeUsed (boolean)

#### ec_posts
Data-driven post catalog.
- id (uuid, pk)
- code (unique)
- name
- rank
- minYearOfStudy
- minEcExperienceYears
- isElectedPhaseTwo
- isActive

#### ec_memberships
- id (uuid, pk)
- memberProfileId (fk member_profiles.id)
- ecTermId (fk ec_terms.id)
- ecPostId (fk ec_posts.id)
- status (Active, Vacant, Resigned, Impeached, Removed)
- electedFromBatch
- startedAt
- endedAt
- unique(ecTermId, ecPostId, status=Active) enforced by partial unique index

#### ec_absence_counters
Denormalized tracker for fast constitutional checks.
- id (uuid, pk)
- ecMembershipId (fk ec_memberships.id, unique)
- consecutiveUnexcusedAbsenceCount
- updatedAt

#### ec_vacancies
- id (uuid, pk)
- ecMembershipId (fk ec_memberships.id)
- vacancyReason (Resignation, Impeachment, MembershipCancelled, AutoAbsence)
- vacancyDate
- fillMethod (ECInternalVote, BatchVote)
- status (Open, InProgress, Filled)
- resolvedElectionId (nullable fk elections.id)

### C. Meetings and governance records

#### meetings
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- calledByMembershipId (fk ec_memberships.id)
- meetingDateTime
- venue
- agenda
- minutesDocumentId
- status (Scheduled, Held, Cancelled)

#### meeting_attendance
- id (uuid, pk)
- meetingId (fk meetings.id)
- ecMembershipId (fk ec_memberships.id)
- isPresent
- isExcused
- digitalSignatureRef
- signedAt
- unique(meetingId, ecMembershipId)

#### governance_notices
Formal notices (cancellation, impeachment, AGM, election, etc.).
- id (uuid, pk)
- noticeType
- title
- body
- issuedAt
- publishedAt
- status (Draft, Signed, Published)

#### notice_signatures
- id (uuid, pk)
- noticeId (fk governance_notices.id)
- signerUserId (fk users.id)
- signerRoleAtSigning
- signedAt

### D. Elections

#### elections
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- phase (Phase1BatchSelection, Phase2PostElection)
- mode
- startAt
- endAt
- status (Draft, Active, Closed, Published)

#### election_commissions
- id (uuid, pk)
- electionId (fk elections.id, unique)
- chiefElectionCommissionerUserId
- approvedByChiefPatronUserId
- formedAt

#### election_commission_members
- id (uuid, pk)
- electionCommissionId (fk election_commissions.id)
- userId (fk users.id)
- memberType (President, VicePresident, GeneralSecretary, Alumni, OtherEligible)
- unique(electionCommissionId, userId)

#### election_candidates
- id (uuid, pk)
- electionId (fk elections.id)
- memberProfileId (fk member_profiles.id)
- targetEcPostId (nullable fk ec_posts.id)
- eligibilityStatus (Eligible, Rejected)
- rejectedReason
- moderatorDecisionBy
- createdAt

#### votes
Append-only vote records.
- id (uuid, pk)
- electionId (fk elections.id)
- voterMemberProfileId (fk member_profiles.id)
- candidateId (fk election_candidates.id)
- castAt
- unique(electionId, voterMemberProfileId) where election rule requires single vote

### E. Activities, events, and volunteers

#### activity_catalog
Tracks mandatory and optional annual activities.
- id (uuid, pk)
- code (unique)
- name
- category
- isMandatory

#### term_activity_progress
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- activityId (fk activity_catalog.id)
- status (Planned, Completed, Skipped)
- completedAt
- unique(ecTermId, activityId)

#### events
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- title
- eventType
- venue
- startsAt
- endsAt
- status
- proposedBudgetAmount
- createdByMembershipId

#### volunteer_registrations
- id (uuid, pk)
- eventId (fk events.id)
- memberProfileId (fk member_profiles.id)
- volunteerRole
- status (Registered, Assigned, Completed, Cancelled)
- unique(eventId, memberProfileId)

### F. Finance

#### budget_proposals
- id (uuid, pk)
- ecTermId (fk ec_terms.id, unique)
- submittedByMembershipId
- proposedIncomeTotal
- proposedExpenseTotal
- submittedAt
- dueDate
- status (Submitted, UnderReview, Approved, Rejected)

#### finance_accounts
- id (uuid, pk)
- code (unique)
- name
- accountType (Income, Expense, Asset, Liability)
- isActive

#### financial_transactions
Append-only ledger.
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- txnType (Income, Expenditure)
- amount
- accountId (fk finance_accounts.id)
- txnDate
- referenceNo
- description
- supportingDocumentRef
- createdByMembershipId
- approvedByUserId
- createdAt

#### bank_transaction_signatures
- id (uuid, pk)
- financialTransactionId (fk financial_transactions.id, unique)
- chiefPatronSignedByUserId
- moderatorSignedByUserId
- signedAt

#### expenditure_reports
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- periodStart
- periodEnd
- totalIncome
- totalExpense
- netBalance
- generatedAt
- treasurerSignedAt
- moderatorSignedAt
- unique(ecTermId, periodStart, periodEnd)

### G. Constitution change and compliance

#### constitution_change_proposals
- id (uuid, pk)
- ecTermId (fk ec_terms.id)
- proposedByMembershipId
- title
- description
- targetArticles
- status (Draft, ECVoting, ModeratorReview, ChiefPatronReview, AcademicCommitteeReview, Approved, Rejected)
- noticeIssuedAt
- ecVotingClosedAt
- moderatorDecisionAt
- chiefPatronDecisionAt
- academicCommitteeDecisionAt

#### constitution_change_votes
- id (uuid, pk)
- proposalId (fk constitution_change_proposals.id)
- ecMembershipId (fk ec_memberships.id)
- vote (Yes, No, Abstain)
- votedAt
- unique(proposalId, ecMembershipId)

### H. Certificates, notifications, and observability

#### certificates
- id (uuid, pk)
- memberProfileId (fk member_profiles.id)
- requestedAt
- status (Pending, Approved, Rejected, Issued)
- approvedByChiefPatronUserId
- approvedAt
- certificateTemplateVersion
- pdfFileRef

#### notifications
- id (uuid, pk)
- recipientUserId (fk users.id)
- channel (InApp, Email)
- subject
- body
- status (Queued, Sent, Failed)
- createdAt
- sentAt

#### outbox_events
Reliable async event handoff.
- id (uuid, pk)
- eventType
- aggregateType
- aggregateId
- payloadJson
- status (Pending, Published, Failed)
- occurredAt
- publishedAt

#### audit_logs
- id (uuid, pk)
- actorUserId
- actionType
- entityType
- entityId
- beforeJson
- afterJson
- traceId
- createdAt

## 10.3 Key Relationships
- One user can have one member profile
- One member can have many event registrations
- One member can have many votes, but only one per phase
- One election has many candidates and many votes
- One meeting has many attendance rows
- One event has many volunteer registrations
- One term has many EC memberships
- One financial report aggregates many transactions

Additional critical relationships:
- One election has one commission, but commission has many members via join table.
- One governance notice has many signatures.
- One constitution proposal has many EC votes.
- One financial transaction has at most one cheque signature bundle.
- One EC membership has at most one active vacancy record.

## 10.4 Important Constraints
- studentId must be unique
- email must be unique
- votes must be immutable after submission
- transactions should be append-only
- only one active EC post assignment per person per term
- a certificate request should not be duplicated while pending
- every approval action should be logged
- immutable-article protection must block changes to articles IV, VII, and XVI
- only one constitution-change process may be completed per EC term
- vacancy fill method must depend on target post class (1-11 vs 12+)
- election commission must contain exactly three members and final approval by Chief Patron

Recommended technical constraints:
- Add check constraints for positive monetary values.
- Use partial unique indexes for active-role exclusivity.
- Use foreign key `ON DELETE RESTRICT` for ledgers, votes, reports, and audit logs.
- Add composite indexes for frequent reads:
  - `(ecTermId, status)` on EC and election tables
  - `(meetingId, ecMembershipId)` on attendance
  - `(ecTermId, txnDate)` on financial transactions
  - `(recipientUserId, status)` on notifications

## 10.5 Migration and Versioning Strategy

- Keep schema migrations small and incremental with Prisma migration files.
- Seed lookup tables (`roles`, `permissions`, `ec_posts`, `activity_catalog`) in idempotent scripts.
- Version policy-driven lookup values (for future constitution revisions) instead of hard-deleting old values.
- Add backward-compatible columns first, migrate data, then enforce strict constraints.

## 10.6 Data Retention
- Active operational data stays in the main tables
- Closed elections and old committee terms can be archived
- Financial records should be retained for audit
- Audit logs should not be deleted unless policy allows

## 11. Module-by-Module Build Order

## Phase 1: Project Foundation
1. Create repo and folder structure
2. Configure frontend and backend apps
3. Add environment files
4. Set up linting, formatting, and Git hooks
5. Create database and Prisma schema
6. Add authentication skeleton

## Phase 2: Core Identity and RBAC
1. Build login and registration
2. Add user profile and role assignment
3. Implement permission guards
4. Build dashboard shell and navigation
5. Test access control with simple pages

## Phase 3: Membership and Events
1. Member profile management
2. Event listing and event creation
3. Volunteer signup and assignment
4. Status labels and notifications

## Phase 4: Governance and Meetings
1. EC term setup
2. Meeting scheduling
3. Attendance tracking
4. Minute storage
5. Absence tracking

## Phase 5: Finance
1. Budget submission
2. Ledger entry creation
3. Income/expenditure tracking
4. Quarterly report generation
5. Moderator approval workflow

## Phase 6: Elections and Certificates
1. Candidate eligibility rules
2. Phase 1 voting
3. Phase 2 voting
4. Result publication
5. Certificate requests and approvals

## Phase 7: Hardening
1. Audit logs everywhere
2. Error handling
3. Accessibility improvements
4. Testing
5. Deployment

## 12. Suggested Folder Structure

```text
csedu-nexus/
  apps/
    web/
    api/
  packages/
    shared/
    types/
    ui/
  prisma/
  docs/
  tests/
  .github/
```

### Frontend structure
```text
apps/web/
  src/
    app/
    components/
    features/
    hooks/
    lib/
    services/
    styles/
```

### Backend structure
```text
apps/api/
  src/
    auth/
    users/
    members/
    events/
    volunteers/
    meetings/
    elections/
    finance/
    certificates/
    notifications/
    audit/
    common/
```

## 13. Testing Strategy

### Unit Tests
- Eligibility checks
- Permission checks
- Financial validation
- Voting logic
- Status transition rules
- Vacancy fill method selection rules
- Immutable-article constitution-change guard tests
- Meeting frequency and three-absence trigger tests

### Integration Tests
- Registration flow
- Login flow
- Event creation flow
- Budget approval flow
- Certificate approval flow
- Two-phase election with commission approval workflow
- Impeachment and membership-cancellation notice workflow
- Constitution-change staged approval workflow

### End-to-End Tests
- Member registration to dashboard
- EC meeting scheduling to attendance capture
- Election nomination to vote submission
- Financial entry to report generation
- AGM notice to report submission and election commission formation

### Non-Functional Tests
- Load test during voting
- Accessibility test
- Security test for unauthorized access
- Backup and restore test

## 14. Security Considerations
- Use hashed passwords only
- Store sensitive tokens securely
- Validate all inputs on the backend
- Rate limit login and vote endpoints
- Prevent duplicate submissions
- Keep audit trails for high-risk actions
- Protect file downloads with authorization checks

## 15. Deployment Plan

### Local Development
- Docker Compose for PostgreSQL and supporting services
- Separate `.env` files for web and API
- Seed data for demo accounts

### Production
- Deploy frontend and backend separately or as a single platform if needed
- Use managed PostgreSQL if available
- Configure email and file storage
- Enable HTTPS
- Set logging and monitoring

## 16. Recommended Demo Accounts
- General member
- EC member
- Treasurer
- Moderator
- Chief Patron
- Election commissioner
- Alumni user

## 17. Risks
- The RBAC model may become too complex if every post becomes a separate permission group
- Election logic may require careful handling to avoid duplicate votes
- Financial records must be treated as append-only to preserve trust
- Document and PDF generation can fail if file storage is not stable
- Constitution rule changes may require schema or policy updates

## 18. Immediate Next Steps
1. Create the repo and folder structure.
2. Set up Next.js frontend and NestJS backend.
3. Connect PostgreSQL with Prisma.
4. Implement authentication and the simplified RBAC model first.
5. Build member dashboard, event listing, and login as the first vertical slice.

## 19. Notes for the SRS Revision
If you revise the SRS, I recommend updating the RBAC section to reflect the hierarchical role model above. That will make the system more maintainable and easier to implement without breaking your constitutional requirements.

## 20. Constitution-to-System Rule Map (Implementation View)

Use this as a direct checklist while implementing backend validation and workflow guards.

### Article IV
- Protect authority scope for Chief Patron and Moderator override actions.
- Keep separate audit event types for override and EC abolition actions.

### Article V and V-A
- Seed default 11 constitutional posts in `ec_posts` with rank and eligibility attributes.
- Keep responsibilities as metadata for UI role handbook and onboarding.

### Articles VI and VII
- Add mandatory membership declaration checklist acceptance fields.
- Implement membership-state machine with explicit cancellation reasons.
- Block login for cancelled members where policy requires.

### Articles VIII, IX, and X
- Implement impeachment workflow with threshold computation over current EC size.
- Auto-open EC-cancellation case after three unexcused absences.
- Support President-direct resignation and non-President routed resignation.

### Article XI
- If vacant post rank is 1-11, run EC-internal election among eligible EC members.
- If vacant post rank is 12+, run corresponding batch vote under moderator supervision.

### Articles XII and XIII
- Enforce signed document attachment on expenditures.
- Require cheque signature records for bank transactions.
- Add annual mandatory activity tracker and one-month budget submission deadline check.

### Articles XIV and XV
- Enforce two-phase election sequence.
- Enforce per-post eligibility and previous-impeachment disqualification.
- Allow moderator candidacy cancellation with mandatory reason logging.

### Articles XVI and XVIII
- Validate meeting cadence (at least one in every two-month window).
- Keep attendance with signatures and quarterly sharing status to moderator.
- Model AGM as required closing workflow for term handover.

### Articles XVII and XVII-A
- Multi-stage constitution-change approval pipeline is mandatory.
- Enforce max one completed constitution change per EC year.
- Reject change requests touching immutable articles IV, VII, and XVI.

### Article XIX
- Certificate request restricted to executive members.
- Certificate issuance requires Chief Patron approval and template versioning.
