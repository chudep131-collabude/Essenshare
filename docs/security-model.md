# Security Model
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Authentication

### 1.1 Token Strategy
- All authenticated sessions use JWT (JSON Web Tokens).
- **Access token:** short-lived, 15 minutes, signed with HS256 using a strong secret (minimum 256-bit).
- **Refresh token:** long-lived, 30 days, stored in an HttpOnly, Secure, SameSite=Strict cookie.
- Access tokens are sent in the `Authorization: Bearer <token>` header.
- Refresh tokens are never sent in URL parameters or response bodies after initial issuance.
- Token secrets are stored in environment variables, never in source code.

### 1.2 Token Refresh
- Access token is refreshed by sending the refresh token to `POST /auth/refresh`.
- Refresh tokens are rotated on every use (new refresh token issued, old one invalidated).
- Refresh token rotation prevents token replay from stolen tokens.
- Invalidated refresh tokens are stored in a revocation table until their original expiry.

### 1.3 Password Handling
- Passwords are hashed using bcrypt with a minimum cost factor of 12.
- Plain-text passwords are never logged, stored, or included in API responses.
- Password reset uses a time-limited (15-minute) single-use cryptographically random token sent via email.
- Password reset tokens are stored hashed in the database.
- After use, password reset tokens are immediately invalidated.

### 1.4 Session Management
- Admin sessions have a maximum idle timeout of 8 hours.
- Admin sessions require re-authentication for sensitive actions (suspensions, bans, platform config changes) if idle > 30 minutes.
- On logout, the refresh token is revoked in the database.
- Multiple concurrent sessions per account are allowed (tracked by device/session).

### 1.5 Account Lockout
- After 5 consecutive failed login attempts, the account is locked for 15 minutes.
- After 10 consecutive failures, the account is locked until admin unlock or password reset.
- Lockout events are logged in AUDIT_LOGS.
- Failed attempts are counted server-side (never client-side).

---

## 2. Authorization

### 2.1 Principle of Least Privilege
- Every endpoint checks the authenticated user's role and the resource ownership before executing.
- A donor can only modify their own donations.
- An organization user can only manage their own organization's records.
- An admin cannot exceed their assigned admin role permissions.
- Authorization is always enforced server-side. Frontend state is decorative only.

### 2.2 Role Hierarchy
```
SUPER_ADMIN
  └── ADMIN
        ├── DONOR (Individual or Business)
        │     └── (self-service only)
        ├── ORGANIZATION
        │     └── (own org only)
        └── RECIPIENT
              └── (no account session-based only)
```

### 2.3 Middleware Enforcement
- Every protected route has an authentication middleware (`requireAuth`) applied.
- Every role-restricted route has a role-check middleware (`requireRole([...])`) applied.
- Every resource-ownership-restricted action has an ownership check (`requireOwnership`).
- These checks are applied at the router level, not inside handler functions, to prevent accidental bypass.

### 2.4 Horizontal Privilege Escalation Prevention
- Donor A cannot view, edit, or delete Donor B's donations.
- Organization A cannot view Organization B's allocations.
- All resource queries are scoped to `WHERE donor_id = :authenticatedUserId` (or equivalent).

### 2.5 Admin Escalation Prevention
- Admins cannot promote themselves to Super Admin.
- Super Admin accounts are created only via a seeded database record or by another Super Admin.
- Admin account changes are logged in AUDIT_LOGS.

---

## 3. Input Validation and Sanitization

### 3.1 Server-Side Validation
- ALL input is validated on the server regardless of client-side validation.
- Client-side validation is for UX only; the server is the source of truth.
- Validation uses a schema validation library (e.g. Joi or Zod) applied before any business logic.

### 3.2 Validation Rules
- String fields: maximum length enforced, trimmed, forbidden control characters stripped.
- Email: RFC 5322-compliant format check + lowercase normalization.
- Phone: E.164 format normalization (e.g. `+254712345678`).
- URLs: must be valid HTTP/HTTPS URLs; rejected if containing credentials in URL.
- Coordinates: latitude must be −90 to 90; longitude must be −180 to 180.
- Quantities: must be positive integers or positive decimals with defined precision.
- Dates: must be valid ISO 8601 timestamps; past dates rejected where inappropriate.
- Enum fields: must be one of the defined allowed values.

### 3.3 SQL Injection Prevention
- All database queries use parameterized queries or ORM-generated queries.
- Raw string SQL concatenation with user input is prohibited.
- Database user account has minimum permissions (no DROP, no TRUNCATE, no schema changes from app).

### 3.4 XSS Prevention
- All user-supplied content rendered in HTML is escaped before output.
- API responses are JSON Content-Type: application/json enforced.
- HTML pages that display user-supplied data use a templating engine with auto-escaping.
- CSP headers are set (see section 5).

### 3.5 Path Traversal Prevention
- File upload paths are validated; filenames are sanitized and replaced with UUID-based names.
- Uploaded files are stored outside the web root.
- File type is validated by MIME type inspection (not file extension alone).

---

## 4. Pickup Code and QR Security

### 4.1 Code Generation
- Pickup codes are generated using `crypto.randomBytes(16)` → hex-encoded = 32 characters.
- QR codes encode the same token.
- The alphanumeric display code is a different, shorter representation of the same token (8 characters, base32-encoded subset for human readability).
- The server stores only the hashed version (SHA-256) of the token.
- The plaintext token is shown to the recipient once and never stored in plaintext.

### 4.2 Code Validation Security
- Token submitted by donor is hashed server-side, then compared to the stored hash (timing-safe comparison using `crypto.timingSafeEqual`).
- Brute-force protection: maximum 10 code validation attempts per donor account per 10 minutes. Excess attempts are rate-limited (HTTP 429).
- Failed validation attempts are logged with timestamp and donor ID.

### 4.3 QR Replay Prevention
- After a code is marked USED, any subsequent validation attempt returns an error.
- Donors are shown a clear message if a code has already been used.
- Attempted reuse is logged in AUDIT_LOGS for review.

### 4.4 Code Confidentiality
- Pickup codes are NOT transmitted in URL query parameters.
- The pickup page loads from a route like `/pickup/:token` where the token is a URL path segment (not a query param); this prevents logging in server access logs if log format is restricted appropriately.
- For extra safety in production, the token in the URL is a session reference; the actual code is loaded via an authenticated API call.

---

## 5. HTTP Security Headers

Applied to all responses via middleware:

| Header | Value |
|--------|-------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Content-Type-Options` | `nosniff` |
| `X-Frame-Options` | `DENY` |
| `Content-Security-Policy` | `default-src 'self'; img-src 'self' data: https://tile.openstreetmap.org; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self'` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | `geolocation=(self), camera=(self), microphone=()` |
| `X-XSS-Protection` | `1; mode=block` (legacy browsers) |

- `Server` header is removed or replaced with a generic value.
- No framework version headers are exposed.

---

## 6. Rate Limiting

| Endpoint Group | Limit | Window |
|----------------|-------|--------|
| `POST /auth/*` (login, register) | 10 requests | per IP per 15 min |
| `POST /auth/refresh` | 20 requests | per IP per 15 min |
| `GET /donations` (search) | 60 requests | per IP per minute |
| `POST /pickups` (code request) | 5 requests | per session per 15 min |
| `POST /pickups/verify` (code validation) | 10 requests | per donor account per 10 min |
| `POST /reports` | 5 requests | per session per hour |
| `POST /password-reset` | 3 requests | per email per hour |
| All other authenticated endpoints | 200 requests | per user per minute |
| All other unauthenticated endpoints | 30 requests | per IP per minute |

- Rate limiting is applied at the Nginx reverse proxy level AND at the Express middleware level.
- HTTP 429 responses include a `Retry-After` header.
- Rate limit counters use Redis in production (or in-memory for development).

---

## 7. Transport Security

- HTTPS enforced for all production traffic via Nginx.
- HTTP requests are redirected to HTTPS (301) at the Nginx level.
- TLS 1.2 minimum; TLS 1.3 preferred.
- Certificate auto-renewal via Let's Encrypt / Certbot.
- HSTS header ensures browsers only use HTTPS after first visit.
- All external HTTP calls from the backend (geocoding, SMTP, etc.) use HTTPS.

---

## 8. Data Security

### 8.1 Sensitive Data at Rest
- Passwords: bcrypt hash (never plaintext).
- Pickup code tokens: SHA-256 hash (never plaintext).
- Password reset tokens: SHA-256 hash.
- PII in the database: no unnecessary PII collected; what is collected follows the privacy model.
- Database-level encryption at rest: configured at the database server/hosting level.

### 8.2 Secrets Management
- All secrets in `.env` files (never committed to source control).
- `.env` is in `.gitignore` and verified before every commit.
- A `.env.example` file documents every required key with placeholder values.
- In production, secrets are injected via the hosting environment (environment variables, secrets manager).

### 8.3 Logging Safety
- Application logs never include: passwords, tokens, full email addresses, phone numbers, GPS coordinates, or credit card data.
- Email addresses in logs are masked: `j****@example.com`.
- Tokens in logs show only first 4 characters: `a3f2...`.
- Log levels: ERROR and WARN in production; INFO in staging; DEBUG only in development.

---

## 9. CSRF Protection

- The API is stateless (JWT in Authorization header) CSRF does not apply to API endpoints.
- Any server-rendered HTML forms (admin panel) use a synchronizer token pattern (CSRF token in hidden field).
- SameSite=Strict on the refresh token cookie provides additional CSRF protection.

---

## 10. Dependency Security

- `npm audit` run after every dependency change.
- No known HIGH or CRITICAL CVE vulnerabilities in production dependencies.
- Exact versions pinned in `package.json` (no `^` or `~` in production).
- Dependency review performed before adding any new package.
- `package-lock.json` committed to source control.

---

## 11. Admin Security

- Admin login is on a separate route (`/admin/login`) with additional monitoring.
- Admin accounts require TOTP two-factor authentication (optional at MVP, required by Phase 14).
- Admin actions that affect user accounts (suspension, banning, verification) require explicit confirmation.
- All admin actions are logged in AUDIT_LOGS with: admin_id, action, target entity, timestamp, IP address, reason.
- Admins cannot delete audit log entries.
- Super Admin account creation is a one-time seeded database process, not accessible via the UI to prevent privilege escalation.

---

## 12. Abuse Prevention

| Threat | Mitigation |
|--------|-----------|
| Fake accounts | Email + phone verification required to post donations |
| Duplicate accounts | Email address uniqueness enforced at DB level; phone uniqueness enforced |
| Pickup code sharing | Codes are single-use and time-limited |
| QR replay | Used codes are permanently invalidated in the database |
| Inventory manipulation | All changes go through atomic transactions; no direct client inventory updates |
| Fake donations | Trust system; new business donors require review; reports trigger hiding |
| Fraudulent business accounts | Public verification + admin review for unverifiable businesses |
| Location abuse | Recipient location is never stored; donor location validated by geocoding |
| Automated abuse | Rate limiting on all endpoints; CAPTCHA optionally added on registration |
| Repeated pickups | 4-hour same-donor cooldown enforced server-side |
| Harassment | Report system; donor suspension; admin investigation |
| Privilege escalation | Role checks on every endpoint; no self-promotion to higher role |
| Cooldown bypass | Cooldowns are per donor, checked server-side at every code issuance |

---

## 13. Incident Response

### 13.1 Security Incident Classification
| Level | Description | Response Time |
|-------|-------------|---------------|
| P1 Critical | Unauthorized data access, mass PII exposure, token forgery | < 1 hour |
| P2 High | Account takeover, inventory manipulation, safety system bypass | < 4 hours |
| P3 Medium | Elevated abuse, partial service disruption | < 24 hours |
| P4 Low | Minor abuse, non-sensitive data inconsistency | < 72 hours |

### 13.2 Response Steps
1. Detect (via monitoring alerts, user reports, or audit log anomalies).
2. Contain (disable affected feature, revoke tokens, suspend accounts as needed).
3. Investigate (audit logs, server logs, database queries).
4. Remediate (patch, configuration change, data correction).
5. Notify (affected users if PII involved; relevant authorities if required by law).
6. Post-mortem (document, update rules, prevent recurrence).
