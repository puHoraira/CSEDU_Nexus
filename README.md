# CSEDU Nexus

A full-stack club management platform for the Computer Science & Engineering Department, University of Dhaka. Built with **React + TypeScript** (frontend) and **Node.js + Express + MongoDB** (backend).

---

## Table of Contents

1. [Tech Stack](#tech-stack)
2. [Setup & Installation](#setup--installation)
3. [Environment Variables](#environment-variables)
4. [Running the Application](#running-the-application)
5. [Demo Accounts](#demo-accounts)
6. [Role System & Access Control](#role-system--access-control)
7. [Feature Guide — Who Can Do What](#feature-guide--who-can-do-what)
8. [Module Reference](#module-reference)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript, Vite, Framer Motion, Recharts, TailwindCSS |
| Backend | Node.js, Express.js |
| Database | MongoDB (Atlas) |
| Auth | JWT (access + refresh tokens via httpOnly cookie) |
| Payment | SSLCommerz (Bangladesh gateway) |
| QR Code | `qrcode` (generation) + `html5-qrcode` (scanning) |
| Styling | Custom CSS design system + Tailwind utilities |

---

## Setup & Installation

### Prerequisites

- Node.js v18+ and npm
- MongoDB Atlas account (or local MongoDB)
- Git

### 1. Clone the repository

```bash
git clone <repo-url>
cd IPLAB
```

### 2. Install backend dependencies

```bash
cd backend
npm install
```

### 3. Install frontend dependencies

```bash
cd ../frontend
npm install
```

### 4. Configure environment variables

Copy the example env file and fill in your values:

```bash
cd ../backend
cp .env.example .env
```

Edit `backend/.env` — see [Environment Variables](#environment-variables) section below.

### 5. Seed the database

This creates all roles, permissions, and EC posts:

```bash
cd backend
npm run seed
```

### 6. Create a System Admin account

Register a normal account first (via the frontend), then run:

```bash
cd backend
npm run grant-admin -- your_email@example.com
```

This assigns the `System Admin` role to that account.

### 7. Bulk register demo students (optional)

From the **Moderator Panel** in the dashboard:
- Upload `backend/src/seeds/demo_login_students.csv`
- All students are registered as `General Member` with password `12345678`

---

## Environment Variables

Create `backend/.env` with the following:

```env
# Server
PORT=5000
NODE_ENV=development

# Database
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/csedu_nexus

# JWT
JWT_ACCESS_SECRET=your_strong_secret_here
JWT_REFRESH_SECRET=your_strong_refresh_secret_here
ACCESS_TOKEN_TTL=7d
REFRESH_TOKEN_TTL=30d

# CORS
CLIENT_ORIGIN=http://localhost:3000

# ZegoCloud (online meetings)
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret

# SSLCommerz Payment (sandbox)
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_MODE=sandbox

# Callback URLs
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

> **Production:** Change `SSLCOMMERZ_MODE=live`, use real credentials, and update `BACKEND_URL`/`FRONTEND_URL` to your deployed domains.

---

## Running the Application

### Start the backend

```bash
cd backend
npm run dev
# Runs on http://localhost:5000
```

### Start the frontend

```bash
cd frontend
npm run dev
# Runs on http://localhost:3000
```

Open `http://localhost:3000` in your browser.

---

## Demo Accounts

After seeding and bulk CSV upload, use these credentials:

| Account | Email | Password |
|---------|-------|----------|
| Demo student 1 | `sohan-2029000001@cs.du.ac.bd` | `12345678` |
| Demo student 2 | `arman-2029000002@cs.du.ac.bd` | `12345678` |
| Any demo student | `<firstname>-<studentid>@cs.du.ac.bd` | `12345678` |
| System Admin | your email (after grant-admin) | your password |

> After assigning roles (e.g. Moderator, President), **log out and log back in** for the new roles to take effect.

---

## Role System & Access Control

CSEDU Nexus uses a **permission-based role system**. Each role has a set of permissions. Permissions are checked on every protected API endpoint.

### All Roles

| Role | Scope | Description |
|------|-------|-------------|
| `General Member` | System | Regular club member — can vote, register for events/workshops, request certificates |
| `Alumni` | System | Former member — can view events, eligible for Election Commissioner appointment |
| `Executive Member` | System | EC member — can lead volunteer groups |
| `Secretary (*)` | System | Domain secretaries (Publication, Sports, Seminars, Cultural, Graphics) |
| `Treasurer` | System | Manages finances — can create transactions, view ledger |
| `AGS (Organization)` | System | Assistant General Secretary — can create events and meetings |
| `AGS (Public Relations)` | System | Manages communications and website |
| `General Secretary` | System | Can create meetings, events, manage attendance |
| `Vice President` | System | Can preside meetings, create events |
| `President` | System | Full EC access — meetings, events, governance, membership |
| `Election Commissioner` | System | Manages elections — create, validate candidates, publish results |
| `Moderator` | System | Faculty moderator — full oversight, bulk registration, constitution editing |
| `Chief Patron` | System | Faculty chief patron — final approval on certificates, finance oversight |
| `System Admin` | System | Assigns/revokes roles for any user |

### How Roles Are Assigned

1. **Self-registration** → user gets no role initially (or `General Member` if registered via CSV)
2. **System Admin** assigns roles via `/dashboard/admin`
3. **EC Appointments** — Moderator/President can appoint EC members via Governance → EC Appointments
4. After role change → user must **log out and log back in**

---

## Feature Guide — Who Can Do What

### 🔐 Authentication

| Action | Who |
|--------|-----|
| Register (student) | Anyone — `/auth/register` |
| Register (teacher/alumni) | Anyone — `/auth/register-teacher` |
| Login | Anyone — `/auth/login` |
| View/edit own profile | Any logged-in user |
| Upload profile photo | Any logged-in user |

---

### 👤 Profile

Navigate to **Dashboard → Profile**

| Action | Who |
|--------|-----|
| Edit basic info (name, phone, bio, blood group) | Self |
| Update CGPA and attendance | Self (students only) |
| Add technical skills and programming languages | Self |
| Add social media links | Self |
| Upload profile photo | Self |
| View election eligibility | Self (students only) |

> **EC Candidacy eligibility** requires: CGPA ≥ 3.0 AND attendance ≥ 75%

---

### 📅 Events

Navigate to **Dashboard → Events**

| Action | Who |
|--------|-----|
| View all events | Everyone |
| Search and filter events | Everyone |
| View event details | Everyone |
| Follow/unfollow an event | Any logged-in user |
| Register for an event | Any logged-in user |
| Pay registration fee | Registered user (SSLCommerz) |
| Post in General Discussion | Any logged-in user |
| Post Updates & Announcements | President, VP, General Secretary, AGS (Organization), Moderator, Event Creator |
| Apply as volunteer | General Members (if eligible) |
| Create event | President, VP, General Secretary, AGS (Organization), Moderator |
| Edit event | President, VP, General Secretary, AGS (Organization), Moderator |
| Manage volunteers | President, VP, General Secretary, AGS (Organization), Moderator |

---

### 🎓 Workshops

Navigate to **Dashboard → Workshops**

| Action | Who |
|--------|-----|
| View all workshops | Everyone |
| View workshop details | Everyone |
| Register for a workshop | Any logged-in user |
| Pay workshop fee | Registered user (SSLCommerz → redirects to gateway) |
| View QR code after approval | Approved participant |
| Download QR code | Approved participant |
| View workshop materials | Approved or Attended participants only |
| Create workshop | President, VP, General Secretary, AGS (Organization), Moderator |
| Approve/reject registrations | President, VP, General Secretary, AGS (Organization), Moderator |
| Add/remove materials | President, VP, General Secretary, AGS (Organization), Moderator |
| QR check-in scanner | President, VP, General Secretary, AGS (Organization), Moderator |
| View all registrations | President, VP, General Secretary, AGS (Organization), Moderator |

**Workshop Registration Flow:**
1. User clicks **Register Now** → fills name/email/phone → submits
2. If free + auto-approved → QR code generated immediately
3. If paid → status = Pending Payment → user clicks **Pay ৳X** → redirected to SSLCommerz
4. After payment → status = Approved → QR code generated
5. If requires approval → organizer reviews and approves/rejects
6. At the door → organizer opens **QR Check-in Scanner** → scans participant's QR → marked as Attended

---

### 🤝 Meetings

Navigate to **Dashboard → Meetings**

| Action | Who |
|--------|-----|
| View meetings (list or calendar) | All roles with `meeting.read` (everyone) |
| View meeting details | All roles |
| Join online meeting room | All roles (if meeting is Online) |
| Create meeting | President, General Secretary |
| Update meeting | President, General Secretary, Moderator |
| Start/complete/cancel meeting | President, General Secretary, Moderator |
| Record attendance | General Secretary, Moderator |
| View attendance | President, General Secretary, Moderator, Chief Patron |
| View absence alerts | President, General Secretary, Moderator |

**Calendar View:** Click the calendar icon in the filter bar to switch from list to monthly calendar view.

---

### 🗳️ Elections

Navigate to **Dashboard → Elections**

| Action | Who |
|--------|-----|
| View elections | General Member, Alumni, President, VP, General Secretary, Moderator, Election Commissioner, Chief Patron |
| Cast vote | General Member, Moderator, Chief Patron |
| Apply as candidate | General Member (if eligible) |
| View results | Everyone |
| Create election | Election Commissioner, Moderator |
| Add candidates | Election Commissioner, Moderator |
| Approve/reject candidates | Election Commissioner, Moderator |
| Activate election | Election Commissioner, Moderator |
| Close election | Election Commissioner, Moderator |
| Publish results | Election Commissioner |

**Election Phases:**
- **Phase 1** — Batch Representatives: any active member can be a candidate, no post required
- **Phase 2** — Office Bearers (Posts 1–11): must be an approved Phase 1 representative, post assignment required, year/EC experience constraints apply

---

### 🏛️ Governance

Navigate to **Dashboard → Governance**

| Action | Who |
|--------|-----|
| View EC Terms | Moderator, Chief Patron |
| Create EC Term | Moderator, Chief Patron |
| View EC Posts | Moderator, Chief Patron |
| Create EC Post | Moderator, Chief Patron |
| View EC Appointments | President, General Secretary, Moderator, Chief Patron |
| Create EC Appointment | President, General Secretary, Moderator, Chief Patron |
| View/edit Constitution | Moderator |
| Publish governance notices | President, General Secretary, Moderator |

---

### 💰 Finance

Navigate to **Dashboard → Finance**

| Action | Who |
|--------|-----|
| View finance overview | Treasurer, Moderator, Chief Patron |
| View ledger | Treasurer, Moderator, Chief Patron |
| Create transaction | Treasurer |
| View reports | Treasurer, Moderator, Chief Patron |
| Sign cheques | Chief Patron |

---

### 🏅 Certificates

Navigate to **Dashboard → Certificates**

| Action | Who |
|--------|-----|
| Request certificate | General Member, Alumni (non-reviewer roles) |
| View own requests | Self |
| Download approved certificate | Self (after approval) |
| Moderator review (sign & approve) | Moderator |
| Chairman final approval | Chief Patron / Chairman |

**Certificate Approval Flow:**
1. Member submits request with contribution summary, EC post history, volunteer contributions
2. Moderator reviews → signs with name/title → approves (moves to Chairman)
3. Chairman reviews → signs → final approval
4. Member downloads certificate (text format)

---

### 👥 Membership

Navigate to **Dashboard → Membership**

| Action | Who |
|--------|-----|
| View membership overview | Self |
| View member roster | President, General Secretary, Moderator, Chief Patron |
| Request membership cancellation | General Member |
| Review cancellation requests | President, Moderator, Chief Patron |
| Execute cancellation | Chief Patron |

---

### 🔔 Notifications

Navigate to **Dashboard → Notifications**

| Action | Who |
|--------|-----|
| View all notifications | Self |
| Filter unread | Self |
| Mark as read | Self |
| Mark all as read | Self |

Notifications are generated automatically for: meeting invites, election updates, certificate status changes, event announcements.

---

### ⚙️ Admin

Navigate to **Dashboard → Admin**

| Action | Who |
|--------|-----|
| View all users | System Admin |
| Assign role to user | System Admin |
| Revoke role from user | System Admin |
| Bulk register students (CSV) | Moderator (via Moderator Panel) |

**CSV Format for bulk registration:**
```
firstName,lastName,email,password,studentId,batch,currentYear,experience
Sohan,Nayeem,sohan@cs.du.ac.bd,12345678,2029000001,29,2,Hackathon mentor
```

---

## Module Reference

### API Base URL
```
http://localhost:5000/api/v1
```

### Key Endpoints

| Module | Endpoint | Auth |
|--------|----------|------|
| Auth | `POST /auth/login` | Public |
| Auth | `POST /auth/register` | Public |
| Auth | `GET /auth/me` | Required |
| Events | `GET /events` | Public |
| Events | `POST /events` | Organizer |
| Workshops | `GET /workshops` | Public |
| Workshops | `POST /workshops` | Organizer |
| Workshops | `POST /workshops/:id/register` | Required |
| Workshops | `POST /workshops/registrations/:id/pay` | Required |
| Workshops | `POST /workshops/payment/success` | **Public** (SSLCommerz callback) |
| Workshops | `POST /workshops/check-in` | Organizer |
| Meetings | `GET /meetings` | Required |
| Meetings | `POST /meetings` | President/GS |
| Elections | `GET /elections` | Required |
| Elections | `POST /elections/votes` | Member |
| Finance | `GET /finance/ledger` | Treasurer/Moderator/CP |
| Certificates | `GET /certificates/my` | Required |
| Notifications | `GET /notifications` | Required |
| Admin | `POST /admin/assign-role` | System Admin |

---

## Project Structure

```
IPLAB/
├── backend/
│   ├── src/
│   │   ├── config/          # DB and env config
│   │   ├── controllers/     # Request handlers
│   │   ├── middleware/       # Auth, authorize, validate
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Express routers
│   │   ├── seeds/           # DB seed scripts + demo CSV
│   │   ├── services/        # Business logic
│   │   └── validators/      # Zod/express-validator schemas
│   └── .env                 # Environment variables
└── frontend/
    ├── src/
    │   ├── auth/            # AuthContext, ProtectedRoute
    │   ├── components/
    │   │   ├── layout/      # AppShell, Sidebar, Header
    │   │   └── ui/          # Button, Card, Badge, etc.
    │   ├── lib/             # api.ts, utils.ts, iconUtils
    │   ├── pages/           # All page components
    │   ├── routes/          # Route definitions
    │   ├── styles/          # CSS design system
    │   └── theme/           # ThemeContext (dark/light)
    └── vite.config.ts
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| 401 after backend restart | Log out and log back in — JWT tokens are invalidated on restart if secret changes |
| Role not showing after assignment | Log out and log back in |
| Payment 400 error | Check `SSLCOMMERZ_STORE_ID` and `SSLCOMMERZ_STORE_PASSWORD` in `.env` |
| Workshop routes 401 | Ensure `workshopRoutes` is mounted before `eventRegistrationRoutes` in `routes/index.js` |
| Port already in use | Run `Get-Process -Name node \| Stop-Process -Force` (Windows) or `pkill node` (Linux/Mac) |
| MongoDB connection failed | Check `MONGODB_URI` in `.env`, verify IP whitelist in Atlas |
| QR scanner not working | Allow camera permissions in browser, use HTTPS in production |

---

*Built for CSEDU Students' Club — University of Dhaka*
