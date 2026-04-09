# CSEDU Nexus - Google Stitch Frontend Prompt Pack

This file is a full prompt pack you can submit to Google Stitch to generate all frontend pages for CSEDU Nexus consistently.

Use this in order:
1. Submit the Master Prompt first.
2. Generate pages using the Page Prompts one by one.
3. Reuse the Component and State prompts to refine each screen.

---

## 1. Master Project Prompt (Submit First)

```text
Create a complete responsive web frontend for a university student club management system called "CSEDU Nexus" for the Department of Computer Science and Engineering, University of Dhaka.

Product purpose:
A centralized platform for membership, executive committee management, elections, events, volunteers, meetings, finance, notices, constitution-change workflows, and certificates.

Audience and user roles:
- General Member
- EC Member
- Moderator
- Chief Patron
- Election Commissioner
- Alumni

Design direction:
- Professional academic + governance style.
- Visual tone: trustworthy, modern, structured, clean.
- Primary palette: deep navy + teal + gold accent.
- Avoid playful consumer style.
- High readability and clear information hierarchy.

Branding:
- App name: CSEDU Nexus
- Organization: CSEDU Students' Club (CSEDUSC)
- Add placeholder for logo in navbar and auth pages.

Typography:
- Use a clear, modern sans font stack with strong heading contrast.
- Make table-heavy pages highly legible.

Layout system:
- Responsive breakpoints: mobile, tablet, desktop.
- Authenticated app shell:
  - Top header with global search, notifications, profile menu.
  - Left sidebar navigation with role-aware items.
  - Main content area with page title, breadcrumbs, actions.

Core UX requirements:
- Dashboard cards, data tables, filters, pagination, status badges.
- Reusable form patterns with inline validation and helper text.
- Confirmation dialogs for destructive/critical actions.
- Empty states, loading skeletons, and error states on every data page.
- Accessible keyboard navigation and visible focus states.
- WCAG-friendly contrast and semantic structure.

Information architecture:
- Public area:
  - Home
  - About
  - Event listing
  - Notices
  - Login
  - Registration
- Authenticated area:
  - Dashboard
  - Membership
  - EC Management
  - Elections
  - Meetings
  - Events
  - Volunteers
  - Finance
  - Constitution Change
  - Certificates
  - Reports
  - Settings

Generate complete page set with realistic placeholder content, realistic table columns, forms, and role-specific actions.

Important behavior constraints to reflect in UX text and UI states:
- Two-phase elections.
- Eligibility checks for candidacy.
- 2/3 threshold for impeachment and constitution changes.
- Meeting attendance with consecutive absence alerts.
- Financial records are append-only.
- Certificate issuance requires Chief Patron approval.
- Constitution Articles IV, VII, and XVI are immutable (show warning in constitution change UI).

Output expectation:
- Full high-fidelity multi-page frontend structure.
- Consistent components and spacing system.
- Reusable design tokens and component variants.
- All pages production-oriented (not just wireframes).
```

---

## 2. Global Design Tokens Prompt

```text
Define and apply a consistent design system for CSEDU Nexus frontend.

Create design tokens:
- Colors:
  - primary.navy
  - primary.teal
  - accent.gold
  - neutral grayscale scale
  - semantic colors: success, warning, danger, info
- Typography scale:
  - display, h1, h2, h3, body, caption, label
- Spacing scale:
  - 4, 8, 12, 16, 24, 32, 40, 48
- Radius scale:
  - sm, md, lg, xl
- Elevation styles:
  - card, popover, modal

Create reusable components with variants:
- Button (primary, secondary, ghost, danger)
- Input, Select, DatePicker, Textarea
- Badge, Alert, Tooltip
- Tabs, Accordion
- DataTable with filter, sort, pagination
- Modal, Drawer, ConfirmDialog
- Toast notifications
- Stat cards
- Timeline and activity log block

Ensure all pages use the same tokens and components.
```

---

## 3. Navigation and App Shell Prompt

```text
Build the complete authenticated app shell for CSEDU Nexus.

Desktop:
- Left sidebar with grouped navigation:
  - Overview
  - Membership
  - Governance (EC, Meetings, Constitution)
  - Elections
  - Events & Volunteers
  - Finance
  - Certificates
  - Reports
  - Settings
- Top header with:
  - Breadcrumb
  - Global search
  - Notifications bell
  - User role chip
  - Profile dropdown

Mobile:
- Collapsible sidebar drawer.
- Sticky top bar.

Add role-aware visibility examples:
- General Member: dashboard, events, volunteer, membership status, notices.
- EC Member: events, meetings, attendance, limited governance.
- Treasurer: finance module full access.
- Moderator: approvals, audits, election commission controls.
- Chief Patron: final approvals and override tools.

Include active state, hover state, collapsed mode, and empty-module access state.
```

---

## 4. Public Pages Prompt

```text
Generate public (unauthenticated) pages for CSEDU Nexus:

1) Home Page
- Hero section with mission and CTA buttons (Join, View Events).
- Upcoming events block.
- Club purpose highlights.
- Notice highlights.
- Footer with contact and social links.

2) About Page
- Club overview, mission, constitutional objectives.
- Current executive committee snapshot.
- Mandatory annual activities section.

3) Public Events Page
- Search + filter by date/type.
- Event cards and list view toggle.
- Event detail modal/page with registration CTA.

4) Notices Page
- Chronological notice list.
- Tagging by type (Election, Finance, Membership, AGM).

5) Login Page
- Email + password.
- Remember me.
- Forgot password link.

6) Registration Page
- Student registration form.
- Mandatory constitution checklist acceptance.
- Success confirmation state.

Ensure strong visual consistency with app shell styles.
```

---

## 5. Dashboard Pages Prompt

```text
Generate role-aware dashboards:

1) General Member Dashboard
- Membership status card.
- Upcoming events list.
- Volunteer opportunities.
- Recent notices.
- Notification feed.

2) EC Dashboard
- Meeting schedule summary.
- Attendance warning panel.
- Event pipeline.
- Pending governance actions.

3) Moderator Dashboard
- Pending approvals queue.
- Election controls snapshot.
- Financial verification queue.
- Constitutional compliance alerts.

4) Chief Patron Dashboard
- Final approval cards (certificates, constitutional changes, critical notices).
- Override action panel with warning UI.
- High-level governance metrics.

Each dashboard should include KPI cards, chart areas, activity timeline, and quick actions.
```

---

## 6. Membership Module Pages Prompt

```text
Create membership module pages:

1) Membership Registration (multi-step)
- Personal info
- Academic info
- Declarations + checklist
- Review and submit

2) Membership Directory (authorized roles)
- Search, filters (batch, status)
- Table with profile, status, role, join date

3) Membership Profile Page
- Basic profile
- Membership lifecycle status history
- EC participation history

4) Membership Cancellation Workflow
- Cancellation reason selection
- Required signatories tracker (Chief Patron, Moderator, President)
- Generated notice preview

5) Membership Status Timeline
- Active -> Cancelled/Expired transitions
- Reason and actor logs
```

---

## 7. EC Management Pages Prompt

```text
Create Executive Committee management pages:

1) EC Term Overview
- Current term timeline
- Active posts and vacancies

2) EC Posts Matrix
- Posts 1-11 + executive members
- Assigned member, eligibility summary, status

3) Vacancy Management
- Detect vacancies
- Fill method indicator:
  - posts 1-11 via EC internal vote
  - executive member posts via batch vote

4) Resignation Workflow UI
- President direct-to-moderator flow
- Other EC members route via President

5) Impeachment Workflow UI
- Charge summary
- Voting panel
- Real-time threshold progress (2/3 required)
- Decision and notice generation state
```

---

## 8. Election Module Pages Prompt

```text
Create full election module:

1) Election Setup
- Election term config
- Phase scheduling
- Election mode settings

2) Election Commission Management
- Form commission
- Member eligibility markers
- Chief Patron approval status

3) Phase 1 Voting (Batch Representatives)
- Batch-specific ballots
- Candidate cards
- Vote confirmation + locked state

4) Phase 2 Voting (Posts 1-11)
- Post-wise ballot sections
- Candidate eligibility badges
- Ineligible candidate rejection reason display

5) Candidate Management
- Nomination list
- Eligibility engine result panel
- Moderator cancel candidacy action with reason

6) Results and Publication
- Post-wise winners
- Batch representative outcomes
- Publish result confirmation
```

---

## 9. Meetings Module Pages Prompt

```text
Create meeting and attendance pages:

1) Meeting Calendar
- Month/week views
- Meeting creation CTA

2) Create/Edit Meeting Form
- Date, venue, agenda, called by
- Notice generation action

3) Attendance Capture
- EC member checklist
- Signature capture placeholders
- Present/excused/absent states

4) Minutes and Decisions Log
- Structured minutes editor
- Linked decisions/actions list

5) Attendance Compliance Panel
- Consecutive absence tracker
- Automatic warning states
- Quarterly moderator-sharing status
```

---

## 10. Events and Volunteers Module Pages Prompt

```text
Create event and volunteer pages:

1) Events Management
- Table + kanban toggle
- Status flow: planned, ongoing, completed, cancelled

2) Event Create/Edit
- Event details
- Budget fields
- Volunteer requirement fields

3) Volunteer Registration Board
- Incoming applications
- Assign roles
- Track completion

4) Mandatory Activity Tracker
- Required yearly activities checklist
- Completion progress by term
```

---

## 11. Finance Module Pages Prompt

```text
Create finance pages:

1) Budget Proposal Page
- One-month submission deadline indicator
- Proposed income/expense breakdown
- Review workflow status

2) Financial Ledger
- Append-only transaction table
- Filters: date range, category, type
- Running balance cards

3) Transaction Entry Form
- Income/expenditure type
- Account category
- Reference number
- Supporting document upload

4) Bank Signature Compliance
- Chief Patron signature state
- Moderator signature state
- Signed timestamp block

5) Quarterly Expenditure Report
- Auto-calculated totals
- Treasurer sign section
- Moderator verification section
- Export/download controls
```

---

## 12. Constitution Change Module Prompt

```text
Create constitution change workflow UI:

1) Proposal Creation
- Title, description, target articles
- Impact summary

2) Immutable Article Protection
- Hard warning and blocked state when target includes Articles IV, VII, XVI

3) EC Voting Screen
- One-week notice timer/status
- Vote cards and 2/3 threshold progress bar

4) Approval Pipeline Tracker
- EC vote stage
- Moderator stage
- Chief Patron stage
- Academic Committee stage

5) Publication Screen
- Final notice and publicity checklist

6) Annual Limit Guard
- Visual state if one constitution change is already completed in current term
```

---

## 13. Certificate Module Prompt

```text
Create certificate workflow pages:

1) Certificate Request Form (EC members only)
- Contribution summary
- Years/posts served

2) Approval Queue (Chief Patron)
- Request cards with history
- Approve/reject actions

3) Certificate Template Preview
- Approved template preview with placeholders

4) Issuance and Download
- Issued certificates table
- Download button
- Status filters (pending/approved/rejected/issued)
```

---

## 14. Reports and Audit Pages Prompt

```text
Create reporting and audit pages:

1) Governance Report Dashboard
- EC composition
- Vacancy stats
- Meeting compliance

2) Election Report
- Turnout
- Post-wise vote summary
- Phase completion timeline

3) Financial Report Dashboard
- Income vs expenditure
- Category breakdown
- Quarterly trends

4) Audit Log Explorer
- Actor, action, entity, timestamp filters
- Before/after detail drawer

5) Compliance Alerts
- Missing signatures
- Late budget submissions
- Attendance risk flags
```

---

## 15. Settings and Profile Pages Prompt

```text
Create settings area:

1) Profile Settings
- Name, contact, password change

2) Notification Settings
- In-app/email toggles by category

3) Access and Role View
- Current role and permissions display

4) System Preferences
- Language (English/Bangla)
- Theme preference if available

5) Admin Config (authorized only)
- Manage post catalog
- Manage permission mappings
- Manage activity catalog
```

---

## 16. Shared States Prompt (Apply to Every Page)

```text
For every generated page, include and design these states:
- Loading skeleton state
- Empty state with CTA
- Error state with retry action
- Success confirmation state
- Permission denied state (403 style)
- Offline/connection issue notice

Ensure these states follow the same design system and spacing rules.
```

---

## 17. Frontend File/Folder Structure Prompt

```text
Generate a complete frontend architecture for Next.js + TypeScript using App Router.

Target structure:

apps/web/
  src/
    app/
      (public)/
        page.tsx
        about/page.tsx
        events/page.tsx
        notices/page.tsx
        login/page.tsx
        register/page.tsx
      (auth)/
        layout.tsx
      (dashboard)/
        layout.tsx
        dashboard/page.tsx
        membership/
          page.tsx
          directory/page.tsx
          cancellation/page.tsx
        ec/
          page.tsx
          vacancies/page.tsx
          impeachment/page.tsx
        elections/
          page.tsx
          phase-1/page.tsx
          phase-2/page.tsx
          commission/page.tsx
          results/page.tsx
        meetings/
          page.tsx
          calendar/page.tsx
          attendance/page.tsx
          minutes/page.tsx
        events/
          page.tsx
          manage/page.tsx
          volunteers/page.tsx
          activities/page.tsx
        finance/
          page.tsx
          ledger/page.tsx
          budget/page.tsx
          reports/page.tsx
          signatures/page.tsx
        constitution/
          page.tsx
          proposals/page.tsx
          approvals/page.tsx
        certificates/
          page.tsx
          requests/page.tsx
          approvals/page.tsx
        reports/
          page.tsx
          audit/page.tsx
          compliance/page.tsx
        settings/
          page.tsx
          profile/page.tsx
          notifications/page.tsx
          access/page.tsx
    components/
      ui/
      layout/
      forms/
      tables/
      charts/
      states/
    features/
      auth/
      membership/
      ec/
      elections/
      meetings/
      events/
      finance/
      constitution/
      certificates/
      notifications/
      reports/
    lib/
      api-client.ts
      auth.ts
      permissions.ts
      validators.ts
      constants.ts
    hooks/
    styles/
      globals.css
      tokens.css

Include typed models, reusable DTO interfaces, and feature-based API services.
```

---

## 18. API Contract Placeholder Prompt (Frontend Integration)

```text
For each feature module, generate frontend API integration placeholders:
- endpoint list
- request DTO type
- response DTO type
- query keys
- optimistic update strategy where safe
- error mapping strategy for toast and field errors

Provide typed service functions and hooks structure compatible with TanStack Query.
```

---

## 19. Accessibility and Responsiveness Prompt

```text
Apply accessibility and responsive rules across all generated screens:
- Keyboard navigable components
- Logical tab order
- Visible focus ring
- Semantic landmarks and form labels
- Contrast ratio suitable for WCAG AA
- Mobile-first spacing and adaptive tables
- Replace wide tables with stacked cards on small screens when needed
```

---

## 20. Final Stitch Consolidation Prompt

```text
Refine all generated pages into one cohesive frontend system:
- Ensure token consistency
- Align spacing and typography
- Normalize card/table/form styles
- Ensure every module follows the same app shell and navigation behavior
- Remove duplicate component patterns
- Keep role-based action visibility consistent
- Provide polished, production-ready visual quality
```

---

## 21. Submission Notes

- Submit prompts section by section to avoid context overflow.
- Always include the Master Project Prompt in your first Stitch run.
- If Stitch output diverges, re-run with:
  - Global Design Tokens Prompt
  - Navigation and App Shell Prompt
  - Then specific module prompt
- Keep this prompt pack as your frontend generation reference.
