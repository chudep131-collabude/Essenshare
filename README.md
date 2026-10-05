# Global Surplus Redistribution Platform

> "No good food should become waste while someone nearby is hungry."

A free, nonprofit-operated digital infrastructure that connects donors of surplus food and usable products with recipients and distribution partners worldwide. The platform eliminates friction, respects dignity, and produces measurable real-world impact.

---

## Quick Start

```bash
# 1. Clone the repository
git clone <repository-url>
cd <repository-folder>

# 2. Set up environment variables
cp .env.example backend/.env
# Open backend/.env and fill in real values (database URL, JWT secrets, etc.)

# 3. Install backend dependencies
cd backend
npm install

# 4. Start the server
node src/server.js

# 5. Open your browser
# http://localhost:3000
```

The server serves the frontend static files automatically. No separate frontend build step is required.

---

## Project Structure

```
/
├── frontend/
│   └── public/               # Static HTML/CSS/JS served by Express
│       ├── index.html
│       ├── find.html
│       ├── about.html
│       ├── safety.html
│       ├── privacy.html
│       ├── impact.html
│       ├── login.html
│       ├── register.html
│       └── assets/
│           ├── css/
│           │   └── main.css
│           ├── js/
│           │   ├── main.js
│           │   ├── api.js
│           │   └── map.js
│           └── img/
├── backend/
│   ├── src/
│   │   ├── config/           # Environment, database, app config
│   │   ├── middleware/       # Auth, validation, rate limiting, headers
│   │   ├── routes/           # API route definitions
│   │   ├── controllers/      # Request handlers
│   │   ├── services/         # Business logic
│   │   ├── models/           # Database query functions
│   │   ├── utils/            # Helpers: tokens, hashing, geo
│   │   └── jobs/             # Scheduled jobs (expiry, cleanup)
│   ├── migrations/           # Database migration files
│   ├── seeds/                # Development seed data
│   └── package.json
├── docs/                     # Phase 0 specifications (read-only)
├── .env.example              # Required environment variable template
├── .gitignore
└── README.md
```

---

## Tech Stack

| Layer | Technology | Notes |
|-------|------------|-------|
| Frontend | HTML5 + Tailwind CSS + Vanilla JS | CDN-only, no build step |
| Backend | Node.js 18+ + Express | Stateless, horizontally scalable |
| Database | PostgreSQL 15+ + PostGIS | Geospatial queries |
| Auth | JWT (access + refresh) + bcrypt | 15-minute access tokens |
| Maps | Leaflet.js + OpenStreetMap | Free, configurable |
| Geocoding | Nominatim (default) | Configurable per region |
| Email | Nodemailer + configurable SMTP | Provider-independent |
| SMS | Twilio / Africa's Talking (pluggable) | Not locked in |
| Process Manager | PM2 | Production lifecycle |
| Reverse Proxy | Nginx | HTTPS, rate limiting |

---

## Environment Variables

All secrets and environment-specific values live in `backend/.env`. See `.env.example` at the workspace root for every required key with placeholder values.

| Key | Description |
|-----|-------------|
| `NODE_ENV` | `development` / `staging` / `production` |
| `PORT` | Server port (default `3000`) |
| `APP_URL` | Public URL of the application |
| `DATABASE_URL` | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | Secret for signing access tokens (min 256-bit) |
| `JWT_REFRESH_SECRET` | Secret for signing refresh tokens (min 256-bit) |
| `JWT_ACCESS_EXPIRES_IN` | Access token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime (default `30d`) |
| `LOG_LEVEL` | Winston log level (`info`, `debug`, `warn`, `error`) |
| `DATA_CONTACT_EMAIL` | Email address for data/privacy requests |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (usually `587`) |
| `SMTP_USER` | SMTP authentication username |
| `SMTP_PASS` | SMTP authentication password |
| `TWILIO_ACCOUNT_SID` | Twilio account SID (SMS) |
| `TWILIO_AUTH_TOKEN` | Twilio auth token (SMS) |
| `GEOCODING_API_KEY` | Geocoding API key (if provider requires one) |
| `COOKIE_SECRET` | Secret for signing session cookies |
| `ADMIN_SETUP_TOKEN` | One-time token for first admin account creation |
| `REDIS_URL` | Redis connection URL (optional; rate limit falls back to memory) |
| `SENTRY_DSN` | Sentry error tracking DSN (optional) |

---

## Phase Roadmap

| Phase | Focus | Output |
|-------|-------|--------|
| 0 | Specification | All docs in `docs/` |
| 1 | Foundation | Project scaffold, server running, HTML pages |
| 2 | Database | Schema, migrations, seeds |
| 3 | Authentication | Auth for donors, orgs, admins |
| 4 | Donor System | Onboarding, location, verification |
| 5 | Donations + Inventory | Listings, items, expiry, atomic updates |
| 6 | Recipient Experience | Account-free browse, code issuance |
| 7 | Pickup System | QR/code validation, handover, cooldown |
| 8 | Organizations | Partner onboarding, allocations |
| 9 | Maps + Location | Geo search, privacy, directions |
| 10 | Safety + Moderation | Reports, suspensions, audit |
| 11 | Admin Dashboard | Full management interface |
| 12 | Notifications | Provider-independent infrastructure |
| 13 | Impact Dashboard | Public stats from real data |
| 14 | Security Audit | Full pen-test and hardening |
| 15 | Globalization | i18n, RTL, locale support |
| 16 | PWA + Mobile | Installable, offline-safe |
| 17 | UI/UX Polish | Accessibility, visual audit |
| 18 | Full Testing | Unit, integration, E2E |
| 19 | Production Deploy | Infra, HTTPS, monitoring |
| 20 | Pilot Launch | Real-world test, evidence collection |

---

## Contributing

- `docs/` is **read-only** — Phase 0 specifications, do not modify.
- Branch naming: `feature/short-description`, `fix/short-description`, `chore/short-description`, `refactor/short-description`
- Commit style: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`, `refactor:`)
- Never commit `.env` files — only `.env.example` is committed.
- All security middleware runs in all environments — never skip for development.

---

## License

License to be determined. Platform operates as a nonprofit. Contact the project team for licensing information.
