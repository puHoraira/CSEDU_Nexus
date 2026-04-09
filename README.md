# CSEDU Nexus

CSEDU Nexus is a full-stack club management platform for CSEDU Students' Club workflows.

It includes modules for:
- Membership management and cancellations
- Governance and constitution management
- Meetings and attendance
- Elections and voting
- Events and volunteer management
- Certificates and approval flow
- Finance and reporting

## Tech Stack

- Frontend: React, TypeScript, Vite, TanStack Query
- Backend: Node.js, Express, MongoDB, Mongoose, Zod
- Auth: JWT access/refresh token flow

## Project Structure

- `frontend/` - React application
- `backend/` - Express API server
- `docs/` - Design and planning documentation
- `srs.tex`, `sdd.tex` - Project documents

## Prerequisites

- Node.js 18+
- npm 9+
- MongoDB (local or remote)

## Setup

### 1) Clone the repository

```bash
git clone https://github.com/puHoraira/CSEDU_Nexus.git
cd CSEDU_Nexus
```

### 2) Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` with your values (do not commit):

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/csedu_nexus
JWT_ACCESS_SECRET=your_access_secret
JWT_REFRESH_SECRET=your_refresh_secret
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d
CLIENT_ORIGIN=http://localhost:3000

# Optional for ZegoCloud meeting token service
ZEGO_APP_ID=
ZEGO_SERVER_SECRET=
```

Run backend:

```bash
npm run dev
```

### 3) Frontend setup

```bash
cd ../frontend
npm install
```

Create `frontend/.env` (if required by your frontend config):

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Run frontend:

```bash
npm run dev
```

## Scripts

### Backend

- `npm run dev` - start API with nodemon
- `npm run start` - start API with node
- `npm run seed` - seed base data
- `npm run grant-admin` - grant system admin role

### Frontend

- `npm run dev` - start Vite dev server
- `npm run build` - production build

## Security Notes

- Never commit `.env` files.
- Keep `ZEGO_SERVER_SECRET`, JWT secrets, and DB credentials private.
- Share environment values with teammates via secure channels.

## Deployment Notes

- Build frontend with `npm run build` in `frontend/`.
- Run backend with production env values in `backend/.env`.
- Configure CORS `CLIENT_ORIGIN` to your deployed frontend URL.

## Contributors

- Project owner: puHoraira

## License

This project is for academic and organizational use.
