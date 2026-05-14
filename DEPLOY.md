# Deployment Guide — Docker Compose

## Prerequisites

- Docker ≥ 24
- Docker Compose ≥ 2.20
- A server (VPS/cloud) with ports 80 and 5000 open

---

## 1. Clone the repo on your server

```bash
git clone <your-repo-url> csedu-nexus
cd csedu-nexus
```

---

## 2. Create environment files

### Root `.env` (for docker-compose)

```bash
cp .env.example .env
```

Edit `.env`:
```env
VITE_API_BASE_URL=http://YOUR_SERVER_IP:5000/api/v1
```

> If you have a domain with HTTPS, use `https://api.yourdomain.com/api/v1`

### Backend `.env`

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` — the critical fields:

```env
PORT=5000
NODE_ENV=production
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster.mongodb.net/csedu_nexus
JWT_ACCESS_SECRET=<generate a strong random string>
JWT_REFRESH_SECRET=<generate a different strong random string>
CLIENT_ORIGIN=http://YOUR_SERVER_IP
FRONTEND_URL=http://YOUR_SERVER_IP
BACKEND_URL=http://YOUR_SERVER_IP:5000
```

Generate strong secrets:
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

---

## 3. Build and start

```bash
docker compose up -d --build
```

This will:
1. Build the backend Node image
2. Build the frontend (Vite → static files → Nginx image)
3. Start both containers

---

## 4. Seed the database (first time only)

```bash
docker compose exec backend node src/seeds/seedBaseData.js
```

---

## 5. Grant yourself System Admin (first time only)

```bash
docker compose exec backend node src/scripts/grantSystemAdmin.js <your-email>
```

---

## 6. Verify

| URL | What you should see |
|-----|---------------------|
| `http://YOUR_SERVER_IP` | Frontend (React app) |
| `http://YOUR_SERVER_IP:5000/health` | `{"ok":true}` |

---

## Common commands

```bash
# View logs
docker compose logs -f

# View only backend logs
docker compose logs -f backend

# Restart a service
docker compose restart backend

# Stop everything
docker compose down

# Stop and remove volumes
docker compose down -v

# Rebuild after code changes
docker compose up -d --build
```

---

## Updating the app

```bash
git pull
docker compose up -d --build
```

---

## HTTPS with a domain (optional but recommended)

If you have a domain, use Nginx as a reverse proxy with Let's Encrypt:

1. Install Certbot on the host
2. Get a certificate: `certbot certonly --standalone -d yourdomain.com`
3. Add an Nginx reverse proxy config on the host that:
   - Serves HTTPS on port 443 → proxies to `localhost:80` (frontend)
   - Serves `api.yourdomain.com` HTTPS → proxies to `localhost:5000` (backend)
4. Update `backend/.env`:
   ```env
   CLIENT_ORIGIN=https://yourdomain.com
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://api.yourdomain.com
   ```
5. Update root `.env`:
   ```env
   VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
   ```
6. Rebuild: `docker compose up -d --build`

---

## Architecture

```
Internet
   │
   ├── :80  → csedu_frontend (Nginx serving React SPA)
   │
   └── :5000 → csedu_backend (Node/Express API)
                    │
                    └── MongoDB Atlas (external)
```

Both containers share the `csedu_net` bridge network.
The frontend is a static build — the API URL is baked in at build time via `VITE_API_BASE_URL`.
