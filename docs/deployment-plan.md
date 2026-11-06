# Deployment Plan
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Environment Strategy

Three environments are required:

| Environment | Purpose | Database | Domain Example |
|-------------|---------|---------|---------------|
| Development | Local dev on developer machines | Local PostgreSQL | `localhost:3000` |
| Staging | Pre-production testing; mirrors production | Separate DB | `staging.platform.org` |
| Production | Live platform | Production DB | `platform.org` |

No code path uses `if NODE_ENV === 'development'` to skip security checks.  
All security middleware runs in all environments.  
Only log level and SMTP settings differ between environments.

---

## 2. Repository and Project Structure

```
/
├── frontend/           # HTML + Tailwind + Vanilla JS
│   ├── public/         # Static assets
│   ├── src/
│   │   ├── pages/      # HTML templates (server-rendered or static)
│   │   ├── js/         # JavaScript modules
│   │   ├── css/        # Tailwind + custom CSS
│   │   └── assets/     # Images, icons
│   └── ...
├── backend/            # Node.js + Express API
│   ├── src/
│   │   ├── config/     # Environment, database, app config
│   │   ├── middleware/ # Auth, validation, rate limiting, headers
│   │   ├── routes/     # API route definitions
│   │   ├── controllers/# Request handlers
│   │   ├── services/   # Business logic
│   │   ├── models/     # Database query functions
│   │   ├── utils/      # Helpers: tokens, hashing, geo
│   │   └── jobs/       # Scheduled jobs (expiry, cleanup)
│   ├── migrations/     # Database migration files
│   ├── seeds/          # Development seed data
│   └── ...
├── docs/               # Phase 0 specifications
├── .env.example        # Required environment variable template
├── .gitignore          # Includes .env*, node_modules/, logs/
└── README.md
```

---

## 3. Required Environment Variables

All secrets and environment-specific values are stored in `.env` files. Never committed to source control.

### 3.1 `.env.example` (committed to repository)

```bash
# Application
NODE_ENV=development
PORT=3000
APP_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api/v1

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/surplus_dev
DB_MAX_POOL=10

# JWT
JWT_ACCESS_SECRET=your-strong-access-secret-minimum-256-bit
JWT_REFRESH_SECRET=your-strong-refresh-secret-minimum-256-bit
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=30d

# Email (SMTP)
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=noreply@platform.org
SMTP_PASS=your-smtp-password
EMAIL_FROM=no-reply@platform.org
EMAIL_FROM_NAME=Surplus Redistribution Platform

# SMS Provider
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_FROM_NUMBER=+15551234567

# Geocoding
GEOCODING_PROVIDER=nominatim
GEOCODING_API_KEY=your-api-key-if-required
GEOCODING_BASE_URL=https://nominatim.openstreetmap.org

# Maps
MAP_TILE_PROVIDER=openstreetmap
MAP_TILE_URL=https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png

# File Storage
STORAGE_PROVIDER=local
STORAGE_LOCAL_PATH=./uploads
# For S3-compatible:
# S3_BUCKET=your-bucket
# S3_REGION=us-east-1
# S3_ACCESS_KEY=your-key
# S3_SECRET_KEY=your-secret
# S3_ENDPOINT=https://s3.amazonaws.com

# Rate Limiting (Redis optional; falls back to in-memory)
REDIS_URL=redis://localhost:6379

# Session / Cookie
COOKIE_SECRET=your-cookie-signing-secret
COOKIE_DOMAIN=localhost

# Admin
ADMIN_SETUP_TOKEN=one-time-token-for-first-admin-creation

# Error Tracking (optional)
SENTRY_DSN=your-sentry-dsn

# Logging
LOG_LEVEL=info

# Data Contact (Privacy Policy)
DATA_CONTACT_EMAIL=privacy@platform.org

# Pickup Code
PICKUP_CODE_EXPIRY_MINUTES=60

# Cooldown
SAME_DONOR_COOLDOWN_HOURS=4
```

### 3.2 Environment Files
- `.env` local development
- `.env.staging` staging server (injected by CI/CD, never committed)
- `.env.production` production server (injected by secrets manager, never committed)
- `.env.test` test runner overrides (safe test credentials only)

All `.env*` files (except `.env.example`) are in `.gitignore`.

---

## 4. Hosting Architecture

### 4.1 MVP / Pilot Architecture

```
Internet
  ↓ HTTPS (Let's Encrypt)
[Nginx Reverse Proxy]
  ├── /api/* → [Node.js + Express] (PM2, port 3001)
  └── /*      → [Static frontend assets] (Nginx serves directly)

[Node.js API]
  ↓
[PostgreSQL + PostGIS]

[File uploads]
  → Local filesystem (upgrade to S3-compatible for production)
```

**Minimum production server spec (pilot):**
- 2 vCPUs
- 4 GB RAM
- 50 GB SSD
- Dedicated IP
- Ubuntu 22.04 LTS

Recommended providers: DigitalOcean, Hetzner, Vultr, Linode, AWS EC2 (t3.medium)

### 4.2 Production Scaling Path

When traffic grows:

```
[CDN (Cloudflare)]
  ↓
[Load Balancer]
  ├── [Node.js API instance 1]
  ├── [Node.js API instance 2]
  └── [Node.js API instance N]
        ↓
    [Redis (rate limiting, session cache)]
        ↓
    [PostgreSQL Primary]
          ↓ replication
    [PostgreSQL Read Replica(s)]
        ↓
    [S3-compatible object storage]
```

The application is stateless (JWT auth, no server-side session state) and horizontally scalable from day one.

---

## 5. Database Setup

### 5.1 PostgreSQL Requirements
- PostgreSQL 15+ (for native UUID generation: `gen_random_uuid()`)
- PostGIS extension enabled: `CREATE EXTENSION IF NOT EXISTS postgis;`
- `pg_trgm` extension enabled for text search: `CREATE EXTENSION IF NOT EXISTS pg_trgm;`

### 5.2 Database User Permissions
The application connects with a limited-privilege database user:
```sql
-- App user: read/write to application tables only
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;

-- Revoke destructive permissions
REVOKE DELETE ON audit_logs FROM app_user;
REVOKE UPDATE ON audit_logs FROM app_user;
REVOKE DELETE ON impact_records FROM app_user;
REVOKE UPDATE ON impact_records FROM app_user;
```

A separate `migration_user` with full privileges runs migrations only during deployments.

### 5.3 Migrations
- Migration tool: `node-pg-migrate` or `db-migrate`
- Migration files in `/backend/migrations/`
- Naming: `{timestamp}_{description}.sql` (e.g. `20261004_001_create_users.sql`)
- Migrations run automatically on deploy: `npm run db:migrate`
- Rollback supported: `npm run db:rollback`
- Migrations never delete data without a backup step first

### 5.4 Backups
- Automated daily backups via `pg_dump` to S3-compatible storage
- Backup retention: 30 days
- Backup tested monthly (restore to staging and verify)
- Point-in-time recovery configured via WAL archiving (production)
- Backup encryption at rest (AES-256)

---

## 6. Process Management

### 6.1 PM2 Configuration

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'surplus-api',
    script: './backend/src/server.js',
    instances: 'max',  // one per CPU core
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '500M',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/api-error.log',
    out_file: './logs/api-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
```

PM2 startup configured to auto-restart on server reboot:
```bash
pm2 startup systemd
pm2 save
```

---

## 7. Nginx Configuration (Key Settings)

```nginx
server {
    listen 80;
    server_name platform.org www.platform.org;
    return 301 https://$host$request_uri;  # Force HTTPS
}

server {
    listen 443 ssl http2;
    server_name platform.org;

    ssl_certificate /etc/letsencrypt/live/platform.org/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/platform.org/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers on;

    # Security headers (supplement to Express middleware)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;

    # Rate limiting at Nginx level
    limit_req_zone $binary_remote_addr zone=api:10m rate=30r/m;
    limit_req zone=api burst=20 nodelay;

    # Serve frontend static files
    root /var/www/surplus/frontend/dist;
    index index.html;
    try_files $uri $uri/ /index.html;

    # Proxy API
    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
        proxy_connect_timeout 5s;
    }

    # Don't log coordinate query strings
    log_format privacy '$remote_addr - $remote_user [$time_local] '
                       '"$request_method $uri $server_protocol" '
                       '$status $body_bytes_sent';
    access_log /var/log/nginx/access.log privacy;
}
```

---

## 8. SSL / TLS

- Certificates: Let's Encrypt via Certbot
- Auto-renewal: `certbot renew` via cron (twice daily per Let's Encrypt recommendation)
- Verify renewal: `certbot renew --dry-run`
- HSTS preloaded after launch (submit to hstspreload.org after stable domain confirmed)

---

## 9. Monitoring and Alerting

### 9.1 Health Check Endpoint
```
GET /health → 200 { status: "ok", timestamp: "ISO8601", version: "x.y.z" }
```
Used by uptime monitoring and load balancer health checks.

### 9.2 Uptime Monitoring
- Tool: UptimeRobot (free tier) or Betterstack
- Checks: every 5 minutes
- Alert channels: email, SMS (on-call)
- Monitor: `/health`, `/api/v1/impact/summary` (proxy for DB health)

### 9.3 Error Tracking
- Tool: Sentry (self-hosted or Sentry.io free tier)
- All unhandled exceptions are captured
- PII is scrubbed from event payloads before sending (Sentry `beforeSend` hook)
- Alert threshold: > 10 errors/minute → immediate notification

### 9.4 Database Monitoring
- Monitor: pg_stat_activity for long-running queries
- Alert: query running > 5 seconds
- Monitor: connection pool exhaustion
- Monitor: disk usage > 80% of allocation

### 9.5 Log Management
- Application logs: PM2 log rotation + optional forwarding to Loki/Grafana
- Nginx logs: logrotate daily, keep 30 days
- Database logs: PostgreSQL log_min_duration_statement = 1000ms (log slow queries)

---

## 10. Deployment Process

### 10.1 Deploy Checklist (Every Release)

```
Pre-deploy:
[ ] All tests passing on CI
[ ] No npm audit HIGH/CRITICAL issues
[ ] .env.example updated for any new variables
[ ] Migration files reviewed and tested on staging
[ ] Staging deployment completed and smoke-tested
[ ] Backup of production database taken
[ ] Rollback plan documented

Deploy:
[ ] git pull (main branch)
[ ] npm ci --production (install exact versions)
[ ] npm run db:migrate (run new migrations)
[ ] pm2 reload surplus-api (zero-downtime reload)
[ ] nginx -s reload (if config changed)

Post-deploy:
[ ] Health check: GET /health → 200
[ ] Smoke test: search nearby donations
[ ] Smoke test: admin login
[ ] Check error tracking (Sentry) for new errors
[ ] Check uptime monitoring no alerts triggered
```

### 10.2 Zero-Downtime Deploys
- PM2 cluster mode enables zero-downtime reloads (`pm2 reload`).
- Migrations that add columns/tables: non-breaking; run before code deploy.
- Migrations that remove columns: run after code no longer references them (two-phase deploy).

### 10.3 Rollback Procedure
```bash
# Rollback code
git checkout <previous-tag>
npm ci --production
pm2 reload surplus-api

# Rollback database (if migration deployed)
npm run db:rollback  # reverts last migration
```

---

## 11. Staging Environment

- Identical configuration to production (separate `.env.staging`)
- Separate PostgreSQL database (seeded with anonymized test data)
- Accessed at `staging.platform.org` (password-protected via Basic Auth at Nginx level)
- Deploys automatically from `develop` branch via CI/CD
- Production deploys from `main` branch only after manual approval

---

## 12. CI/CD Pipeline (GitHub Actions)

```yaml
# Simplified pipeline
on:
  push:
    branches: [develop, main]

jobs:
  test:
    - npm ci
    - npm run lint
    - npm run test
    - npm audit --audit-level=high

  deploy-staging:
    if: branch == 'develop'
    needs: test
    - SSH to staging server
    - git pull
    - npm ci --production
    - npm run db:migrate
    - pm2 reload

  deploy-production:
    if: branch == 'main'
    needs: test
    environment: production  # requires manual approval in GitHub
    - Backup production DB
    - SSH to production server
    - git pull
    - npm ci --production
    - npm run db:migrate
    - pm2 reload
    - Run health check
```

Secrets are stored in GitHub repository secrets, never in the repository.

---

## 13. Recovery Procedure

### 13.1 Full Server Failure
1. Provision new server (same spec) from provider.
2. Restore PostgreSQL from latest backup.
3. Clone repository, set up environment variables.
4. Install Node.js, PostgreSQL, Nginx, PM2, Certbot.
5. Run `npm ci --production`.
6. Run `npm run db:migrate`.
7. Start PM2: `pm2 start ecosystem.config.js --env production`.
8. Configure Nginx + SSL.
9. Point DNS to new IP.
10. Verify health check passes.

**Target RTO (Recovery Time Objective):** < 4 hours  
**Target RPO (Recovery Point Objective):** < 24 hours (last daily backup)

### 13.2 Database Corruption
1. Stop application: `pm2 stop surplus-api`.
2. Take snapshot of corrupted DB for investigation.
3. Restore from latest known-good backup.
4. Replay WAL logs if point-in-time recovery is configured.
5. Restart application.
6. Verify data consistency.

### 13.3 Security Incident
1. Immediately isolate affected service (firewall rules, PM2 stop).
2. Revoke all JWT secrets (forces re-login for all users deploy new secrets).
3. Revoke all refresh tokens in database.
4. Follow incident response in security-model.md.
5. Notify affected users if PII was involved.

---

## 14. Secrets Rotation Schedule

| Secret | Rotation Frequency | How |
|--------|--------------------|-----|
| JWT access secret | Every 90 days | Update .env, PM2 reload (forces token re-issuance) |
| JWT refresh secret | Every 180 days | Update .env, revoke all refresh tokens, PM2 reload |
| SMTP password | When changed at provider | Update .env, PM2 reload |
| Database password | Every 180 days | Update DB + .env, PM2 reload |
| Cookie secret | Every 90 days | Update .env, PM2 reload |

All rotations are logged in the platform operations log (separate from audit_logs).
