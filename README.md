# EssenShare

EssenShare is a humanitarian food-surplus redistribution platform that connects individual and business donors with local recipients and organisations. Donors list surplus food; recipients browse nearby donations, claim them, and arrange pickup — reducing food waste while fighting food insecurity.

The platform is built for communities, not corporations. Every listing expires, every pickup is tracked, and every impact is measured.

## Architecture

```
┌──────────────────────────────────────────┐
│               Browser / App              │
│         Next.js 14 (App Router)          │
│            Port 3000 (dev)               │
└────────────────┬─────────────────────────┘
                 │ HTTPS /api/v1
┌────────────────▼─────────────────────────┐
│         Node.js / Express 4              │
│            Port 3001                     │
│   Auth · Donations · Pickups · Reports   │
└────────────────┬─────────────────────────┘
                 │ pg
┌────────────────▼─────────────────────────┐
│          PostgreSQL 15 + PostGIS         │
│         Geospatial queries               │
└──────────────────────────────────────────┘
```

## Prerequisites

- Node.js 18+
- PostgreSQL 15+ with PostGIS extension
- npm 9+

## Local Development

### Backend

```bash
cd backend
cp ../.env.example .env        # fill in DATABASE_URL, JWT_SECRET etc.
npm install
npm run db:migrate
npm run db:seed                 # loads dev fixtures
npm run dev                     # starts on :3001
```

### Frontend

```bash
cd frontend
cp .env.local.example .env.local  # set NEXT_PUBLIC_API_URL
npm install
npm run dev                        # starts on :3000
```

## Environment Variables

### Backend (`.env`)

| Variable | Description | Example |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgres://user:pass@localhost:5432/surplus_dev` |
| `JWT_SECRET` | HS256 signing secret (32+ chars) | — |
| `JWT_REFRESH_SECRET` | Refresh token secret (32+ chars) | — |
| `PORT` | API server port | `3001` |
| `NODE_ENV` | Runtime environment | `development` |
| `ALLOWED_ORIGINS` | CORS origins (comma-separated) | `http://localhost:3000` |

### Frontend (`.env.local`)

| Variable | Description | Example |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL | `http://localhost:3001/api/v1` |

## Running Migrations and Seeds

```bash
cd backend
npm run db:migrate   # runs pending SQL migrations in order
npm run db:seed      # inserts dev fixture data
```

Seed credentials:
- Individual donor: `donor@example.com` / `DevPassword123!`
- Business donor: `business@example.com` / `DevPassword123!`
- Admin: `admin@essenshare.org` / `DevPassword123!`

**Change all passwords before any public deployment.**

## Production Deployment

1. Provision a server with Node.js 20, PostgreSQL 15+, Nginx, PM2
2. Clone the repo to `/var/www/essenshare`
3. Configure `.env` (backend) and `.env.local` (frontend) with production values
4. Run `backend/seeds/002_seed_admin.sql` to create the first admin account (update password hash first)
5. Copy `nginx.conf` to `/etc/nginx/sites-available/essenshare` and enable it
6. Start the API: `cd backend && npm ci --omit=dev && pm2 start ecosystem.config.js --env production`
7. Build the frontend: `cd frontend && npm ci && npm run build`
8. Start frontend with PM2 or serve via Nginx static + Next.js standalone
9. Reload Nginx: `sudo nginx -t && sudo systemctl reload nginx`

See `nginx.conf` for the full reverse-proxy configuration.

## Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Frontend | Next.js (App Router) | 14 |
| Frontend language | TypeScript | 5 |
| Styling | Tailwind CSS | 3 |
| Animation | GSAP | 3 |
| Backend | Node.js + Express | 18+ / 4.18 |
| Database | PostgreSQL + PostGIS | 15 |
| Auth | JWT + httpOnly cookies | — |
| Process manager | PM2 | latest |
| Web server | Nginx | latest |
