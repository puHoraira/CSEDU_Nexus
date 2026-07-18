# 🎓 CSEDU Nexus

**Student Organization Management System** for the Computer Science and Engineering Department, University of Dhaka.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.x-green.svg)](https://www.mongodb.com/)

---

## 📖 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Project Structure](#-project-structure)
- [Local Development Setup](#-local-development-setup)
- [Environment Configuration](#-environment-configuration)
- [Deployment Guide](#-deployment-guide)
- [API Documentation](#-api-documentation)
- [Scripts & Utilities](#-scripts--utilities)
- [Troubleshooting](#-troubleshooting)
- [Contributing](#-contributing)
- [License](#-license)

---

## 🌟 Overview

CSEDU Nexus is a comprehensive web-based management system designed to streamline student organization operations. It provides tools for membership management, event organization, elections, governance, financial tracking, and more.

**Live Demo:** [https://nexus.farefin.com](https://nexus.farefin.com)

### Key Capabilities

- **Multi-role Authentication** - Students, Teachers, Moderators, Admins, EC Members
- **Membership Management** - Registration, verification, profile management
- **Event Management** - Workshop registration, attendance tracking, certificates
- **Democratic Elections** - Two-phase election system with EC experience validation
- **Governance System** - EC appointments, terms, constitutional documents
- **Financial Tracking** - Payment integration (bKash, SSLCommerz)
- **Meeting Management** - Scheduling, attendance, minutes recording
- **Notification System** - Real-time updates for members
- **Room Booking** - Seat allocation and reservation system

---

## ✨ Features

### 🔐 Authentication & Authorization
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Email verification with OTP
- Password reset functionality
- Session management

### 👥 Membership
- Student and teacher registration
- Profile management with academic records
- Batch-based organization
- Membership status tracking
- CGPA and attendance validation

### 🗳️ Elections
- **Phase 1:** Batch representative elections
- **Phase 2:** Executive Committee post elections with EC experience validation
- Candidate eligibility checking
- Vote casting and result publication
- Election commission management
- Dispute resolution system

### 📅 Events & Workshops
- Event creation and management
- Online registration with payment
- QR code-based check-in
- Certificate generation (PDF)
- Gallery and post management

### 🏛️ Governance
- EC term management
- Post appointments with validation
- Constitutional document storage
- Proposal tracking
- Performance reviews

### 💰 Financial Management
- Payment gateway integration (bKash, SSLCommerz)
- Transaction tracking
- Workshop fee collection
- Financial reporting

### 📧 Communication
- Email notifications (nodemailer + Gmail)
- In-app notification system
- Announcement broadcasts
- Event reminders

### 🎥 Video Meetings
- Zegocloud integration for video calls
- Meeting scheduling and management
- Attendance tracking

---

## 🛠️ Tech Stack

### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **State Management:** TanStack Query (React Query)
- **Routing:** React Router v6
- **Styling:** Tailwind CSS + Custom CSS
- **UI Components:** Lucide Icons, Framer Motion
- **Forms:** React Hook Form + Zod validation
- **Charts:** Recharts

### Backend
- **Runtime:** Node.js 18.x
- **Framework:** Express.js
- **Database:** MongoDB (Mongoose ODM)
- **Authentication:** JWT + bcrypt
- **File Upload:** Multer + Cloudinary
- **Email:** Nodemailer
- **PDF Generation:** PDFKit, html-pdf-node
- **Payments:** SSLCommerz, bKash
- **QR Codes:** qrcode library
- **Video:** Zegocloud SDK

### DevOps
- **Containerization:** Docker + Docker Compose
- **Web Server:** Nginx (production)
- **Cloud:** Azure Virtual Machine
- **Database:** MongoDB Atlas
- **CI/CD:** Git-based deployment

---

## 📁 Project Structure

```
csedu-nexus/
├── backend/                    # Express.js backend
│   ├── src/
│   │   ├── config/            # Database, environment configs
│   │   ├── controllers/       # Route controllers
│   │   ├── middleware/        # Auth, validation, error handling
│   │   ├── models/            # Mongoose schemas
│   │   ├── routes/            # API route definitions
│   │   ├── services/          # Business logic
│   │   ├── core/              # Core utilities (ApiError, ApiResponse)
│   │   ├── policies/          # Authorization policies
│   │   ├── seeds/             # Database seeders
│   │   ├── utils/             # Helper functions
│   │   ├── validators/        # Request validators
│   │   └── server.js          # Entry point
│   ├── scripts/               # Utility scripts
│   ├── .env                   # Environment variables
│   ├── Dockerfile
│   └── package.json
├── frontend/                   # React frontend
│   ├── src/
│   │   ├── components/        # Reusable components
│   │   ├── pages/             # Page components
│   │   ├── routes/            # Route definitions
│   │   ├── auth/              # Auth context
│   │   ├── lib/               # API client, utilities
│   │   ├── hooks/             # Custom React hooks
│   │   ├── styles/            # CSS files
│   │   ├── assets/            # Static assets
│   │   └── main.tsx           # Entry point
│   ├── .env                   # Environment variables
│   ├── Dockerfile
│   ├── nginx.conf             # Nginx configuration
│   └── package.json
├── docker-compose.yml          # Docker orchestration
├── switch-env.js               # Environment switcher
├── package.json                # Root package.json
└── README.md
```

---

## 🚀 Local Development Setup

### Prerequisites

Before starting, ensure you have:

- **Node.js** 18.x or higher ([Download](https://nodejs.org/))
- **npm** or **yarn** package manager
- **Git** ([Download](https://git-scm.com/))
- **MongoDB Atlas Account** (free tier works) or local MongoDB
- **Gmail Account** with App Password (for email)
- **Code Editor** (VS Code recommended)

### Step 1: Clone Repository

```bash
git clone https://github.com/yourusername/csedu-nexus.git
cd csedu-nexus
```

### Step 2: Install Dependencies

```bash
# Install all dependencies (root, backend, frontend)
npm run install:all

# OR install separately
npm install                    # Root dependencies
cd backend && npm install      # Backend dependencies
cd ../frontend && npm install  # Frontend dependencies
```

### Step 3: Configure Environment Variables

Create `.env` files from examples:

```bash
# Root directory
cp .env.example .env

# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.example frontend/.env
```

**See [Environment Configuration](#-environment-configuration) section below for detailed variable explanations.**

### Step 4: Configure MongoDB

**Option A: MongoDB Atlas (Recommended)**

1. Create free cluster at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create database user
3. Whitelist your IP (or use 0.0.0.0/0 for development)
4. Copy connection string to `backend/.env`:
   ```env
   MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/csedu_nexus?retryWrites=true&w=majority
   ```

**Option B: Local MongoDB**

```bash
# Install MongoDB locally
# Windows: Download from mongodb.com
# Mac: brew install mongodb-community
# Linux: sudo apt-get install mongodb

# Update backend/.env
MONGODB_URI=mongodb://localhost:27017/csedu_nexus
```

### Step 5: Seed Database (Optional but Recommended)

```bash
cd backend
npm run seed
```

This creates:
- Default admin user
- EC posts
- Permissions and roles
- Sample data

### Step 6: Configure Email (Gmail)

1. Enable 2FA on your Gmail account: https://myaccount.google.com/security
2. Generate App Password: https://myaccount.google.com/apppasswords
3. Update `backend/.env`:
   ```env
   SMTP_USER=your-email@gmail.com
   SMTP_PASS=yourapppassword
   ```

**Note:** Remove all spaces from the app password (16 characters, no spaces).

### Step 7: Start Development Servers

```bash
# From root directory, start both servers
npm run dev

# OR start separately:
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

**Access the application:**
- **Frontend:** http://localhost:5173
- **Backend API:** http://localhost:5000
- **API Docs:** http://localhost:5000/api/v1

### Step 8: Login

**Default Admin Credentials:**
- Email: `abuhoraira10153@gmail.com`
- Password: `Admin@123`

**Create Test User:**
```bash
cd backend
node scripts/create-test-user.js
```

---

## ⚙️ Environment Configuration

### Root `.env`

```env
# Environment mode (local or production)
NODE_ENV=development

# Frontend API URL (used by Vite during build)
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### Backend `.env` (Development)

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MongoDB Connection
MONGODB_URI=mongodb+srv://username:password@cluster0.xxxxx.mongodb.net/csedu_nexus?retryWrites=true&w=majority

# JWT Secrets (Generate secure random strings)
JWT_ACCESS_SECRET=your-access-secret-min-32-chars
JWT_REFRESH_SECRET=your-refresh-secret-min-32-chars

# Token Lifetimes
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL=7d

# CORS Origins
CLIENT_ORIGIN=http://localhost:5173
FRONTEND_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000

# Email Configuration (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=yourapppassword
SMTP_FROM=CSEDU Nexus <noreply@csedu-nexus.org>

# Cloudinary (Image Upload)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Payment Gateway - bKash (Sandbox)
BKASH_BASE_URL=https://tokenized.sandbox.bka.sh/v1.2.0-beta
BKASH_APP_KEY=your_bkash_app_key
BKASH_APP_SECRET=your_bkash_app_secret
BKASH_USERNAME=your_bkash_username
BKASH_PASSWORD=your_bkash_password
BKASH_CALLBACK_URL=http://localhost:5000/api/v1/payments/bkash/callback

# Payment Gateway - SSLCommerz (Sandbox)
SSLCOMMERZ_MODE=sandbox
SSLCOMMERZ_STORE_ID=testbox
SSLCOMMERZ_STORE_PASSWORD=qwerty
SSLCOMMERZ_SUCCESS_URL=http://localhost:5000/api/v1/workshops/payment/success
SSLCOMMERZ_FAIL_URL=http://localhost:5000/api/v1/workshops/payment/fail
SSLCOMMERZ_CANCEL_URL=http://localhost:5000/api/v1/workshops/payment/cancel
SSLCOMMERZ_IPN_URL=http://localhost:5000/api/v1/workshops/payment/ipn

# Video Conferencing - Zegocloud
ZEGO_APP_ID=your_zego_app_id
ZEGO_SERVER_SECRET=your_zego_server_secret
```

### Backend `.env` (Production)

```env
# Server Configuration
PORT=5000
NODE_ENV=production

# MongoDB Connection (Production)
MONGODB_URI=mongodb+srv://prod_user:secure_password@cluster0.xxxxx.mongodb.net/csedu_nexus?retryWrites=true&w=majority

# JWT Secrets (MUST BE DIFFERENT FROM DEV!)
JWT_ACCESS_SECRET=production-access-secret-very-long-and-secure
JWT_REFRESH_SECRET=production-refresh-secret-very-long-and-secure

# Token Lifetimes (longer for production)
ACCESS_TOKEN_TTL=7d
REFRESH_TOKEN_TTL=30d

# CORS Origins (Production domain)
CLIENT_ORIGIN=https://nexus.farefin.com
FRONTEND_URL=https://nexus.farefin.com
BACKEND_URL=https://nexus.farefin.com

# Email Configuration (Production)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-production-email@gmail.com
SMTP_PASS=yourproductionapppassword
SMTP_FROM=CSEDU Nexus <noreply@csedu-nexus.org>

# Cloudinary (Production)
CLOUDINARY_CLOUD_NAME=your-prod-cloud-name
CLOUDINARY_API_KEY=your-prod-api-key
CLOUDINARY_API_SECRET=your-prod-api-secret

# Payment Gateway - bKash (Production)
BKASH_BASE_URL=https://tokenized.pay.bka.sh/v1.2.0-beta
BKASH_APP_KEY=your_production_bkash_app_key
BKASH_APP_SECRET=your_production_bkash_app_secret
BKASH_USERNAME=your_production_bkash_username
BKASH_PASSWORD=your_production_bkash_password
BKASH_CALLBACK_URL=https://nexus.farefin.com/api/v1/payments/bkash/callback

# Payment Gateway - SSLCommerz (Production)
SSLCOMMERZ_MODE=live
SSLCOMMERZ_STORE_ID=your_store_id
SSLCOMMERZ_STORE_PASSWORD=your_store_password
SSLCOMMERZ_SUCCESS_URL=https://nexus.farefin.com/api/v1/workshops/payment/success
SSLCOMMERZ_FAIL_URL=https://nexus.farefin.com/api/v1/workshops/payment/fail
SSLCOMMERZ_CANCEL_URL=https://nexus.farefin.com/api/v1/workshops/payment/cancel
SSLCOMMERZ_IPN_URL=https://nexus.farefin.com/api/v1/workshops/payment/ipn

# Video Conferencing - Zegocloud
ZEGO_APP_ID=your_production_zego_app_id
ZEGO_SERVER_SECRET=your_production_zego_server_secret
```

### Frontend `.env` (Development)

```env
# API Base URL
VITE_API_BASE_URL=http://localhost:5000/api/v1

# Environment
VITE_NODE_ENV=development
```

### Frontend `.env` (Production)

```env
# API Base URL (Production)
VITE_API_BASE_URL=https://nexus.farefin.com/api/v1

# Environment
VITE_NODE_ENV=production
```

### Environment Variable Quick Reference

| Variable | Description | Example | Required |
|----------|-------------|---------|----------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://...` | ✅ |
| `JWT_ACCESS_SECRET` | Secret for access tokens | Min 32 chars | ✅ |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | Min 32 chars | ✅ |
| `SMTP_USER` | Gmail address for sending emails | `email@gmail.com` | ✅ |
| `SMTP_PASS` | Gmail App Password (16 chars, no spaces) | `abcdabcdabcdabcd` | ✅ |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | `your-cloud` | ❌ |
| `BKASH_APP_KEY` | bKash payment app key | Merchant provided | ❌ |
| `SSLCOMMERZ_STORE_ID` | SSLCommerz store ID | `testbox` (sandbox) | ❌ |
| `ZEGO_APP_ID` | Zegocloud app ID | Numeric ID | ❌ |

**✅ Required** - Application won't function without these
**❌ Optional** - Feature-specific, can be omitted if not using

---

## 🚢 Deployment Guide

### Deployment Architecture

```
Azure VM (Ubuntu 22.04)
├── Nginx (Reverse Proxy)
├── Docker Compose
│   ├── Backend Container (Node.js + Express)
│   └── Frontend Container (Nginx + React)
└── MongoDB Atlas (Cloud Database)
```

### Prerequisites for Deployment

- Azure VM (or any Linux server)
- Ubuntu 22.04 LTS
- Docker & Docker Compose installed
- Domain name pointed to server IP
- SSL certificate (Let's Encrypt recommended)

### Step 1: Server Setup (Azure VM)

```bash
# SSH into your server
ssh azureuser@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo apt install docker-compose -y

# Install Git
sudo apt install git -y

# Logout and login again to apply docker group
exit
```

### Step 2: Clone Repository on Server

```bash
# SSH back in
ssh azureuser@your-server-ip

# Clone repository
cd ~
git clone https://github.com/yourusername/csedu-nexus.git
cd csedu-nexus
```

### Step 3: Configure Production Environment

```bash
# Create backend .env file
nano backend/.env
```

**Paste your production environment variables** (see [Backend Production .env](#backend-env-production) above)

**Important Security Notes:**
- ⚠️ **NEVER commit `.env` files to Git!**
- Use strong, unique secrets for JWT tokens
- Store `.env` files only on the server
- Use different credentials for production vs development
- Enable MongoDB IP whitelist or VPN

```bash
# Save and exit: Ctrl+X, Y, Enter

# Verify .env file (check for quotes around passwords - should have NO quotes)
cat backend/.env | grep SMTP_PASS
# Should show: SMTP_PASS=abcdabcdabcdabcd
# NOT: SMTP_PASS="abcd abcd abcd abcd"
```

### Step 4: Build Frontend with Production API URL

```bash
# Update root .env for production build
nano .env
```

Add:
```env
VITE_API_BASE_URL=https://nexus.farefin.com/api/v1
NODE_ENV=production
```

### Step 5: Build and Start Docker Containers

```bash
# Build containers
docker-compose build --no-cache

# Start containers in detached mode
docker-compose up -d

# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Step 6: Configure Nginx Reverse Proxy (on Host)

```bash
# Install Nginx on host (not in Docker)
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/nexus
```

Paste this configuration:

```nginx
server {
    listen 80;
    server_name nexus.farefin.com;

    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name nexus.farefin.com;

    # SSL Configuration (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/nexus.farefin.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/nexus.farefin.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # API Backend (Docker container on port 8081)
    location /api/ {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeout settings for long-running requests
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Frontend (Docker container on port 8080)
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # SPA fallback - serve index.html for all routes
        try_files $uri $uri/ /index.html;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/nexus /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

### Step 7: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Obtain SSL certificate
sudo certbot --nginx -d nexus.farefin.com

# Follow prompts (provide email, agree to terms)

# Test auto-renewal
sudo certbot renew --dry-run
```

### Step 8: Seed Production Database

```bash
# Enter backend container
docker exec -it csedu_backend bash

# Run seeder
npm run seed

# Exit container
exit
```

### Step 9: Test Email Configuration

```bash
# Run email test from backend container
docker exec -it csedu_backend node scripts/test-email.js
```

Expected output:
```
✅ SMTP connection verified successfully!
✅ Test email sent successfully!
🎉 All tests passed! Email is working correctly.
```

### Step 10: Verify Deployment

1. **Visit your domain:** https://nexus.farefin.com
2. **Check SSL:** Should show padlock icon
3. **Test login:** Use seeded admin credentials
4. **Check API:** https://nexus.farefin.com/api/v1/health
5. **Monitor logs:** `docker-compose logs -f`

---

## 🔄 Updating Production Deployment

When you have new code changes:

```bash
# On your local machine
git add .
git commit -m "Your commit message"
git push origin main

# On Azure server
ssh azureuser@your-server-ip
cd ~/nexus-app

# Pull latest code
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose build --no-cache
docker-compose up -d

# Check logs
docker-compose logs -f
```

**Important:** `.env` files on the server are NOT affected by git pull (they're in .gitignore).

---

## 📚 API Documentation

### Base URLs

- **Development:** `http://localhost:5000/api/v1`
- **Production:** `https://nexus.farefin.com/api/v1`

### Authentication

All protected routes require JWT token in header:

```http
Authorization: Bearer <access_token>
```

### API Endpoints Overview

#### Auth & Users
- `POST /auth/register-student` - Student registration
- `POST /auth/register-teacher` - Teacher registration
- `POST /auth/login` - User login
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - User logout
- `POST /auth/verify-email` - Verify email with OTP
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password` - Reset password with token

#### Membership
- `GET /membership/members` - List all members
- `GET /membership/members/:id` - Get member details
- `PUT /membership/members/:id` - Update member profile
## 📜 Scripts & Utilities

### Backend Scripts

Located in `backend/scripts/`:

```bash
# Database seeding
npm run seed                                    # Seed base data (roles, permissions, EC posts)

# User management
node scripts/grantSystemAdmin.js                # Grant admin role to user
node scripts/create-test-user.js                # Create test user account

# Data fixes
node scripts/fix-batch-and-session.js           # Fix batch/session data
node scripts/fix-student-ids.js                 # Fix student ID format

# Election testing
node scripts/create-300-students-and-run-election.js   # Full election simulation
node scripts/cleanup-test-students.js                   # Clean up test data
node scripts/conduct-full-election-automated.js         # Automated election test

# Email testing
node scripts/test-email.js                      # Test SMTP configuration

# Membership
node scripts/check-member-eligibility.js        # Check member eligibility
```

### Root Scripts

```bash
# Environment switching
npm run env:local                  # Switch to local environment
npm run env:prod                   # Switch to production environment

# Development
npm run dev                        # Start both backend and frontend
npm run install:all                # Install all dependencies

# Building
npm run build                      # Build frontend for production

# Docker
npm run docker:up                  # Start Docker containers
npm run docker:down                # Stop Docker containers
npm run docker:build               # Build Docker images
```

---

## 🔍 API Documentation

### Authentication Endpoints

#### Register Student
```http
POST /api/v1/auth/register-student
Content-Type: application/json

{
  "email": "student@cs.du.ac.bd",
  "password": "SecurePass123",
  "firstName": "John",
  "lastName": "Doe",
  "studentId": "2020001",
  "batch": 27,
  "session": "2020-21"
}
```

#### Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePass123"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "user": {
      "_id": "...",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "roles": ["General Member"]
    },
    "accessToken": "eyJhbGc...",
    "refreshToken": "eyJhbGc..."
  }
}
```

### Election Endpoints

#### Get Eligible Posts for Member (Phase 2)
```http
GET /api/v1/enhanced-elections/:electionId/eligible-posts?memberId=:memberId
Authorization: Bearer <token>
```

Response:
```json
{
  "status": "success",
  "data": {
    "member": {
      "currentYear": 3,
      "ecYears": 0
    },
    "eligibility": [
      {
        "post": {
          "title": "President",
          "minYear": 3,
          "minEcYears": 2
        },
        "isEligible": false,
        "reason": "Requires 2 years of EC experience, you have 0"
      }
    ]
  }
}
```

### Event Endpoints

#### Create Event
```http
POST /api/v1/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Tech Workshop 2024",
  "description": "Learn React and Node.js",
  "eventType": "Workshop",
  "startsAt": "2024-03-15T10:00:00Z",
  "endsAt": "2024-03-15T16:00:00Z",
  "venue": "Room 301",
  "maxParticipants": 50,
  "registrationFee": 500
}
```

#### Register for Event
```http
POST /api/v1/events/:eventId/register
Authorization: Bearer <token>
```

### More Endpoints

For complete API documentation, see the controllers in `backend/src/controllers/`:
- **Auth:** `AuthController.js`
- **Elections:** `EnhancedElectionController.js`
- **Events:** `EventController.js`
- **Governance:** `GovernanceController.js`
- **Members:** `MembershipController.js`
- **Admin:** `AdminController.js`

---

## 🐛 Troubleshooting

### Common Issues

#### 1. Email Not Sending

**Symptom:** "Invalid login: 535-5.7.8 Username and Password not accepted"

**Solution:**
```bash
# Generate new Gmail App Password
# 1. Enable 2FA: https://myaccount.google.com/security
# 2. Create App Password: https://myaccount.google.com/apppasswords
# 3. Update backend/.env (remove ALL spaces)
SMTP_PASS=abcdabcdabcdabcd

# Test email
node scripts/test-email.js
```

#### 2. MongoDB Connection Failed

**Symptom:** "MongoServerError: Authentication failed"

**Solution:**
- Check MongoDB Atlas IP whitelist (allow 0.0.0.0/0 for testing)
- Verify username/password in connection string
- Ensure database user has proper permissions

#### 3. JWT Token Invalid

**Symptom:** "401 Unauthorized" or "Invalid token"

**Solution:**
```bash
# Ensure JWT secrets are set and match between .env files
# Clear browser localStorage and login again
```

#### 4. Docker Build Fails

**Symptom:** "Error building image"

**Solution:**
```bash
# Clear Docker cache and rebuild
docker system prune -a
docker-compose build --no-cache
```

#### 5. Frontend Can't Connect to Backend

**Symptom:** "Network Error" in browser console

**Solution:**
```bash
# Check VITE_API_BASE_URL in frontend/.env
# Development: http://localhost:5000/api/v1
# Production: https://nexus.farefin.com/api/v1

# Verify backend is running
curl http://localhost:5000/api/v1/health
```

#### 6. Port Already in Use

**Symptom:** "EADDRINUSE: address already in use"

**Solution:**
```bash
# Find process using port 5000
lsof -i :5000  # Mac/Linux
netstat -ano | findstr :5000  # Windows

# Kill process
kill -9 <PID>  # Mac/Linux
taskkill /PID <PID> /F  # Windows
```

### Logs and Debugging

```bash
# View all logs
docker-compose logs -f

# View specific service logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Enter container for debugging
docker exec -it csedu_backend bash

# Check environment variables in container
docker exec csedu_backend env | grep SMTP

# Restart specific service
docker-compose restart backend

# View container resource usage
docker stats
```

### Database Debugging

```bash
# Connect to MongoDB Atlas via MongoDB Compass
# Connection string from backend/.env

# View collections
use csedu_nexus
show collections

# Check users
db.users.find().limit(5)

# Check members
db.members.find().limit(5)

# Check elections
db.elections.find().sort({createdAt: -1}).limit(5)
```

---

## 🤝 Contributing

We welcome contributions! Here's how to get started:

### Contribution Guidelines

1. **Fork the repository**
2. **Create feature branch:** `git checkout -b feature/amazing-feature`
3. **Commit changes:** `git commit -m 'Add amazing feature'`
4. **Push to branch:** `git push origin feature/amazing-feature`
5. **Open Pull Request**

### Code Style

- **Backend:** Follow Express.js best practices, use async/await
- **Frontend:** Follow React + TypeScript conventions
- **Formatting:** Use consistent indentation (2 spaces)
- **Comments:** Document complex logic
- **Commit Messages:** Use conventional commits format

### Testing

```bash
# Run frontend tests
cd frontend
npm run test

# Run backend tests (if available)
cd backend
npm run test
```

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👥 Team

**Developed by:** CSEDU Students & Faculty
**Maintained by:** CSEDU IT Lab

---

## 📞 Support

For issues, questions, or feature requests:

- **GitHub Issues:** [Create an issue](https://github.com/yourusername/csedu-nexus/issues)
- **Email:** support@csedu-nexus.org
- **Documentation:** [Wiki](https://github.com/yourusername/csedu-nexus/wiki)

---

## 🙏 Acknowledgments

- University of Dhaka, Computer Science & Engineering Department
- All contributors and testers
- Open source libraries and frameworks used in this project

---

## 📚 Additional Resources

### Documentation Links

- [MongoDB Atlas Docs](https://docs.atlas.mongodb.com/)
- [Express.js Guide](https://expressjs.com/en/guide/routing.html)
- [React Documentation](https://react.dev/)
- [Docker Compose](https://docs.docker.com/compose/)
- [Nginx Configuration](https://nginx.org/en/docs/)
- [Let's Encrypt](https://letsencrypt.org/getting-started/)

### Useful Commands Cheat Sheet

```bash
# Development
npm run dev                      # Start dev servers
npm run build                    # Build for production
npm run seed                     # Seed database

# Git
git pull origin main             # Pull latest code
git status                       # Check changes
git add .                        # Stage all changes
git commit -m "message"          # Commit changes
git push origin main             # Push to remote

# Docker
docker-compose ps                # List containers
docker-compose up -d             # Start containers
docker-compose down              # Stop containers
docker-compose logs -f backend   # View backend logs
docker exec -it csedu_backend bash  # Enter backend container

# Server Management (Azure)
ssh azureuser@your-server-ip     # Connect to server
sudo systemctl status nginx      # Check Nginx status
sudo systemctl restart nginx     # Restart Nginx
sudo nginx -t                    # Test Nginx config
sudo certbot renew               # Renew SSL certificate
htop                             # Monitor system resources
df -h                            # Check disk usage
```

---

## 🔐 Security Best Practices

### Production Checklist

- [ ] Use strong JWT secrets (min 64 chars)
- [ ] Enable MongoDB IP whitelist
- [ ] Use HTTPS only (SSL certificate)
- [ ] Set secure CORS origins
- [ ] Use Gmail App Passwords (not account password)
- [ ] Enable rate limiting on API endpoints
- [ ] Regular backups of MongoDB database
- [ ] Monitor logs for suspicious activity
- [ ] Keep dependencies updated (`npm audit fix`)
- [ ] Use environment variables for all secrets
- [ ] Never commit `.env` files to Git
- [ ] Set up firewall on Azure VM
- [ ] Use strong passwords for all accounts
- [ ] Enable 2FA on critical services
- [ ] Regular security audits

### Backup Strategy

```bash
# MongoDB Atlas - Automated backups enabled by default
# Manual backup:
mongodump --uri="your-mongodb-uri" --out=backup-$(date +%Y%m%d)

# Backup .env files (store securely, NOT in Git)
cp backend/.env backend/.env.backup-$(date +%Y%m%d)
```

---

## 📈 Performance Optimization

### Frontend

- Code splitting with React.lazy
- Image optimization (Cloudinary)
- TanStack Query for data caching
- Vite build optimization
- Gzip compression (Nginx)

### Backend
- MongoDB indexing on frequently queried fields
- API response caching
- Connection pooling
- Async/await for non-blocking operations
- Rate limiting to prevent abuse

### Database Optimization

```javascript
// Add indexes in MongoDB
db.users.createIndex({ email: 1 }, { unique: true })
db.members.createIndex({ studentId: 1 }, { unique: true })
db.elections.createIndex({ status: 1, createdAt: -1 })
db.votes.createIndex({ electionId: 1, voterMemberId: 1, phase: 1, postId: 1 }, { unique: true })
```


**THIS TASK IS FOR 4-1 IP LAB PROJECT**

---

*Last Updated: JULY 2026*
