# CSEDU Nexus Frontend Pages and Navigation Guide

## 1. Purpose of this document

This document defines a complete frontend page map for CSEDU Nexus, including:

- all necessary pages
- detailed purpose of each page
- who can access each page
- navigation flow for each user type
- practical UI ideas for each module

Primary goal: build a maintainable frontend where every user knows where to go next, and every role sees only relevant actions.

---

## 2. User types and access zones

## 2.1 User types

- Guest (not logged in)
- General Member
- President
- Vice President
- General Secretary
- AGS (Organization)
- AGS (Public Relations)
- Treasurer
- Secretary (Publication)
- Secretary (Sports)
- Secretary (Seminars)
- Secretary (Cultural)
- Secretary (Graphics)
- Executive Member
- Moderator
- Chief Patron
- Election Commissioner
- Alumni

## 2.2 Access zones

- Public Zone: visible to everyone
- Member Zone: login required, general member features
- EC Zone: EC management workspace
- Governance Zone: meetings, approvals, constitution, notices
- Election Zone: election operations and voting
- Finance Zone: budget, transactions, reports
- Oversight Zone: Moderator and Chief Patron controls

---

## 3. Global navigation architecture

## 3.1 Primary top navigation (all users)

- Home
- Events
- Notices
- Constitution
- About Club
- Contact
- Login or Dashboard (depends on auth state)

## 3.2 Authenticated sidebar navigation (role-aware)

Always visible for logged-in users:

- Dashboard
- Notifications
- Profile
- Settings
- Help

Conditionally visible by role:

- Membership
- Events Management
- Volunteers
- Meetings
- Elections
- Finance
- Governance
- Certificates
- Reports
- Admin and Access Control

## 3.3 Breadcrumb pattern

Every non-dashboard page should show:

- Dashboard > Module > Page

Example:

- Dashboard > Elections > Candidate Approval
- Dashboard > Finance > Quarterly Report Q1 2026

## 3.4 Notification center behavior

- Bell icon in top bar
- unread count badge
- click opens Notification Center page
- each notification links directly to related page

---

## 4. Public pages (Guest and logged-out users)

## 4.1 Home page

Route: / 

Purpose:

- introduce CSEDU Nexus
- show mission, current EC summary, quick links

Key sections:

- hero with Join and Login buttons
- upcoming events preview
- latest notices
- quick stats (members, events, elections)

CTA actions:

- Join as Member
- Login
- View Events

---

## 4.2 Events listing (public)

Route: /events

Purpose:

- discover upcoming and past events

Key UI:

- filter by type, date, status
- cards with event title, date, venue
- detail button

CTA actions:

- View Details
- Login to Volunteer

---

## 4.3 Event details (public)

Route: /events/:id

Purpose:

- show complete event information

Key UI:

- event schedule
- organizer details
- volunteer capacity status

CTA actions:

- Volunteer Now (redirect to login if guest)

---

## 4.4 Notice board

Route: /notices

Purpose:

- publish official notices and governance updates

Key UI:

- searchable notice list
- category tags (meeting, election, membership, finance)

---

## 4.5 Constitution page

Route: /constitution

Purpose:

- provide constitution access and article navigation

Key UI:

- article index on left
- article content panel

---

## 4.6 About and Contact

Routes:

- /about
- /contact

Purpose:

- public context and communication

---

## 4.7 Authentication pages

Routes:

- /auth/login
- /auth/register
- /auth/forgot-password
- /auth/reset-password

Purpose:

- secure account access

Key UI ideas:

- clear error states
- password visibility toggle
- role-independent registration

---

## 5. Shared authenticated pages (all logged-in users)

## 5.1 Dashboard shell

Route: /dashboard

Purpose:

- role-based landing hub

Universal widgets:

- profile summary
- notification summary
- upcoming events
- quick action tiles

Role-aware widgets:

- pending approvals
- meeting alerts
- finance snapshot
- election alerts

---

## 5.2 Notifications center

Route: /dashboard/notifications

Purpose:

- centralized message and action inbox

Features:

- filter by unread and category
- mark as read
- deep links to target workflow pages

---

## 5.3 Profile page

Route: /dashboard/profile

Purpose:

- member profile data and activity history

Sections:

- personal info
- membership status
- event participation
- certificates

---

## 5.4 Settings page

Route: /dashboard/settings

Purpose:

- user preferences

Sections:

- password change
- email notification preferences
- language mode

---

## 5.5 Help and support

Route: /dashboard/help

Purpose:

- onboarding and role-based help

Sections:

- FAQ
- workflow guides
- who to contact

---

## 6. Membership module pages

## 6.1 Membership overview

Route: /dashboard/membership

Access:

- General Member
- EC roles
- Moderator
- Chief Patron

Purpose:

- current status, history, and requests

---

## 6.2 Membership cancellation requests

Route: /dashboard/membership/cancellations

Access:

- Moderator
- President
- Chief Patron

Purpose:

- create, review, approve, execute cancellations

UI:

- table with status steps
- step timeline (President, Moderator, Chief Patron)
- execute button when fully approved

---

## 6.3 Membership roster

Route: /dashboard/membership/roster

Access:

- EC roles
- Moderator
- Chief Patron

Purpose:

- searchable member list and status filters

---

## 7. Governance and EC module pages

## 7.1 EC term management

Route: /dashboard/governance/ec-terms

Access:

- Moderator
- Chief Patron

Purpose:

- create and activate EC terms

UI:

- term timeline
- overlap validation hints

---

## 7.2 EC post catalog

Route: /dashboard/governance/ec-posts

Access:

- Moderator
- Chief Patron

Purpose:

- dynamic post configuration

UI:

- post list with eligibility fields
- add post form
- activate or deactivate post toggle

Why important:

- this page enables adding new posts without database redesign

---

## 7.3 EC appointments

Route: /dashboard/governance/ec-appointments

Access:

- President
- General Secretary
- Moderator
- Chief Patron

Purpose:

- appoint members to posts per term

UI:

- term selector
- post selector
- member selector
- eligibility validation panel

---

## 7.4 Governance notices

Route: /dashboard/governance/notices

Access:

- President
- General Secretary
- Moderator

Purpose:

- publish official governance notices

---

## 8. Meeting module pages

## 8.1 Meetings calendar

Route: /dashboard/meetings

Access:

- EC roles
- Moderator
- Chief Patron

Purpose:

- schedule overview

UI:

- monthly calendar
- upcoming meetings list
- filter by status

---

## 8.2 Create meeting

Route: /dashboard/meetings/create

Access:

- President
- General Secretary

Purpose:

- schedule new meeting

UI:

- title, date, venue, agenda
- invite preview panel

---

## 8.3 Meeting details and minutes

Route: /dashboard/meetings/:id

Access:

- EC roles
- Moderator
- Chief Patron

Purpose:

- track meeting outcomes

UI:

- agenda, minutes, decisions
- status controls (scheduled, completed)

---

## 8.4 Attendance capture

Route: /dashboard/meetings/:id/attendance

Access:

- General Secretary
- President

Purpose:

- mark attendance

UI:

- member checklist
- present or absent toggle
- save with summary

---

## 8.5 Absence alerts dashboard

Route: /dashboard/meetings/absence-alerts

Access:

- President
- General Secretary
- Moderator

Purpose:

- monitor members with consecutive absences

---

## 9. Election module pages

## 9.1 Election list and status

Route: /dashboard/elections

Access:

- General Member (read)
- Election Commissioner
- Moderator
- EC roles

Purpose:

- monitor election cycles and status

---

## 9.2 Create election

Route: /dashboard/elections/create

Access:

- Election Commissioner
- Moderator

Purpose:

- configure election phase, term, dates

---

## 9.3 Candidate management

Route: /dashboard/elections/:id/candidates

Access:

- Election Commissioner
- Moderator

Purpose:

- add and review candidates

UI:

- eligibility checker result
- approve and reject with reason

---

## 9.4 Voting page

Route: /dashboard/elections/:id/vote

Access:

- General Member and eligible voter roles

Purpose:

- cast votes securely

UI:

- ballot cards
- confirmation modal
- one-time vote warning

---

## 9.5 Election results

Route: /dashboard/elections/:id/results

Access:

- all logged users (or role-based by policy)

Purpose:

- transparent result publication

UI:

- ranked candidate table
- vote counts

---

## 10. Event and volunteer module pages

## 10.1 Event management dashboard

Route: /dashboard/events

Access:

- EC roles
- Moderator (read)

Purpose:

- create and manage events

---

## 10.2 Create and edit event

Routes:

- /dashboard/events/create
- /dashboard/events/:id/edit

Access:

- President
- Vice President
- General Secretary
- AGS roles
- Executive Members (based on permission)

Purpose:

- event lifecycle management

---

## 10.3 Volunteer manager

Route: /dashboard/events/:id/volunteers

Access:

- General Secretary
- AGS (Organization)
- Executive Members

Purpose:

- assign volunteer tasks and monitor status

---

## 11. Finance module pages

## 11.1 Finance overview

Route: /dashboard/finance

Access:

- Treasurer
- Moderator
- Chief Patron

Purpose:

- finance snapshot and links to records

---

## 11.2 Transaction entry

Route: /dashboard/finance/transactions/new

Access:

- Treasurer

Purpose:

- add income or expenditure entries

UI:

- type, amount, category, reference
- validation hints

---

## 11.3 Ledger page

Route: /dashboard/finance/ledger

Access:

- Treasurer
- Moderator
- Chief Patron

Purpose:

- append-only transaction history

UI:

- filters by date and category
- running balance panel

---

## 11.4 Quarterly reports

Route: /dashboard/finance/reports

Access:

- Treasurer
- Moderator
- Chief Patron

Purpose:

- generate and review quarterly reports

---

## 12. Certificate and report pages

## 12.1 Certificate requests

Route: /dashboard/certificates

Access:

- EC members for request
- Chief Patron for approval

Purpose:

- request and issue membership certificates

---

## 12.2 Reports center

Route: /dashboard/reports

Access:

- Moderator
- Chief Patron
- President (subset)

Purpose:

- consolidated analytics and exports

---

## 13. Navigation map by user type

## 13.1 Guest

Default path:

- Home -> Events -> Event Details -> Login or Register

Alternative:

- Home -> Constitution -> About -> Register

---

## 13.2 General Member

After login:

- Dashboard -> Events -> Event Details -> Volunteer
- Dashboard -> Elections -> Vote -> Results
- Dashboard -> Profile -> Certificates

---

## 13.3 President

After login:

- Dashboard -> Meetings -> Create Meeting
- Dashboard -> Governance -> EC Appointments
- Dashboard -> Membership -> Cancellation Review
- Dashboard -> Elections -> Results

---

## 13.4 Vice President

After login:

- Dashboard -> Meetings -> Meeting Details
- Dashboard -> Events -> Event Management
- Dashboard -> Governance Notices

---

## 13.5 General Secretary

After login:

- Dashboard -> Meetings -> Create and Attendance
- Dashboard -> Events -> Volunteer Manager
- Dashboard -> Governance -> EC Appointments

---

## 13.6 AGS (Organization)

After login:

- Dashboard -> Events -> Volunteer Manager
- Dashboard -> Meetings -> View

---

## 13.7 AGS (Public Relations)

After login:

- Dashboard -> Events -> Event Edit
- Dashboard -> Notices -> Publish and Share

---

## 13.8 Treasurer

After login:

- Dashboard -> Finance -> New Transaction
- Dashboard -> Finance -> Ledger
- Dashboard -> Finance -> Reports

---

## 13.9 Secretary roles (Publication, Sports, Seminars, Cultural, Graphics)

After login:

- Dashboard -> Events -> Create or Update Assigned Event
- Dashboard -> Meetings -> View assigned action items
- Dashboard -> Notices -> related publication actions

---

## 13.10 Executive Member

After login:

- Dashboard -> Events -> Volunteer Manager
- Dashboard -> Meetings -> View
- Dashboard -> Tasks (optional future page)

---

## 13.11 Moderator

After login:

- Dashboard -> Governance -> EC Terms and Posts
- Dashboard -> Membership -> Cancellation Review
- Dashboard -> Elections -> Create and Candidate Review
- Dashboard -> Finance -> Ledger and Reports
- Dashboard -> Meetings -> Absence Alerts

---

## 13.12 Chief Patron

After login:

- Dashboard -> Membership -> Final Cancellation Review and Execute
- Dashboard -> Governance -> Terms and Posts
- Dashboard -> Finance -> Ledger
- Dashboard -> Certificates -> Approve and Issue

---

## 13.13 Election Commissioner

After login:

- Dashboard -> Elections -> Create Election
- Dashboard -> Elections -> Candidate Management
- Dashboard -> Elections -> Publish Results

---

## 13.14 Alumni

After login:

- Dashboard -> Events
- Dashboard -> Elections (if assigned as commissioner)
- Dashboard -> Profile

---

## 14. Suggested route tree

- /
- /events
- /events/:id
- /notices
- /constitution
- /about
- /contact
- /auth/login
- /auth/register
- /dashboard
- /dashboard/profile
- /dashboard/settings
- /dashboard/notifications
- /dashboard/help
- /dashboard/membership
- /dashboard/membership/roster
- /dashboard/membership/cancellations
- /dashboard/governance/ec-terms
- /dashboard/governance/ec-posts
- /dashboard/governance/ec-appointments
- /dashboard/governance/notices
- /dashboard/meetings
- /dashboard/meetings/create
- /dashboard/meetings/:id
- /dashboard/meetings/:id/attendance
- /dashboard/meetings/absence-alerts
- /dashboard/elections
- /dashboard/elections/create
- /dashboard/elections/:id/candidates
- /dashboard/elections/:id/vote
- /dashboard/elections/:id/results
- /dashboard/events
- /dashboard/events/create
- /dashboard/events/:id/edit
- /dashboard/events/:id/volunteers
- /dashboard/finance
- /dashboard/finance/transactions/new
- /dashboard/finance/ledger
- /dashboard/finance/reports
- /dashboard/certificates
- /dashboard/reports

---

## 15. UX and design ideas for maintainability

- Use one reusable page layout component for all dashboard pages
- Use role-aware menu config from backend permissions instead of hardcoded frontend role checks
- Keep forms schema-driven using shared validation objects
- Use reusable table component with server-side pagination for roster, ledger, candidates
- Use status badges with a single shared badge style map
- Add quick action tiles on dashboard based on pending tasks

---

## 16. Recommended implementation order for frontend

1. Public pages and auth
2. Dashboard shell and role-based menu
3. Events and volunteering
4. Membership and governance pages
5. Meetings module pages
6. Elections pages
7. Finance pages
8. Certificates and reports
9. Accessibility and responsive polish

---

## 17. Final note

If you implement pages with this route and role map, your frontend will stay organized as modules grow. You can add a new role or feature mostly by:

- adding permission mapping
- adding menu config entry
- adding page component in its module folder

without redesigning the whole frontend navigation.
