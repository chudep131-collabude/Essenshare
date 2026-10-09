# EssenShare Backend

## Getting Started

### Prerequisites
- Node.js 18+
- PostgreSQL 15+ with PostGIS extension

### Setup
1. Copy `.env.example` to `.env` and fill in values
2. Create PostgreSQL database: `createdb surplus_dev`
3. Install dependencies: `npm install`
4. Run migrations: `npm run db:migrate`
5. Seed development data: `npm run db:seed`
6. Start server: `npm run dev`

Server runs on port 3000 by default.

### Default dev credentials (after seeding)
- Individual donor: `donor@example.com` / `DevPassword123!`
- Business donor: `business@example.com` / `DevPassword123!`
- Admin: `admin@essenshare.org` / `DevPassword123!`

**Change all passwords before any public deployment.**
