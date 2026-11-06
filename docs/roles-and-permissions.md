# Roles and Permissions
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Role Definitions

| Role | Description | Account Required |
|------|-------------|-----------------|
| `RECIPIENT` | Person seeking available donations | No (session-based) |
| `INDIVIDUAL_DONOR` | Private person donating surplus | Yes |
| `BUSINESS_DONOR` | Business/organization donating surplus | Yes |
| `ORGANIZATION` | Distribution partner receiving and redistributing | Yes |
| `ADMIN` | Platform staff verification, moderation, operations | Yes |
| `SUPER_ADMIN` | Senior platform staff full access including platform config | Yes |

The database stores `INDIVIDUAL_DONOR` and `BUSINESS_DONOR` as separate roles for verification handling. Both are treated as `DONOR` for most permission checks. The backend has a `isDonor()` helper that returns true for both.

---

## 2. Permission Matrix

### 2.1 Donation Listings

| Action | RECIPIENT | INDIVIDUAL_DONOR | BUSINESS_DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-----------------|----------------|--------------|-------|-------------|
| Browse public listings | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| View listing details | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Create listing | | ✓ | ✓ | | | |
| Edit own listing | | ✓ (own) | ✓ (own) | | | |
| Delete own listing | | ✓ (own) | ✓ (own) | | | |
| Extend own listing deadline | | ✓ (own) | ✓ (own) | | | |
| Hide any listing | | | | | ✓ | ✓ |
| Remove any listing | | | | | ✓ | ✓ |
| Reinstate hidden listing | | | | | ✓ | ✓ |
| View all listings (admin) | | | | | ✓ | ✓ |

### 2.2 Pickup / Handover

| Action | RECIPIENT | IND. DONOR | BIZ. DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-----------|-----------|--------------|-------|-------------|
| Request pickup code | ✓ (session) | | | | | |
| View own pickup code | ✓ (session) | | | | | |
| Cancel own pickup | ✓ (session) | | | | | |
| Verify pickup code (scan) | | ✓ (own listings) | ✓ (own listings) | | | |
| Confirm handover | | ✓ (own listings) | ✓ (own listings) | | | |
| View own pickup history | ✓ (session, limited) | ✓ | ✓ | ✓ | | |
| View all pickups (admin) | | | | | ✓ | ✓ |
| View any pickup detail | | | | | ✓ | ✓ |

### 2.3 Donor Accounts

| Action | RECIPIENT | IND. DONOR | BIZ. DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-----------|-----------|--------------|-------|-------------|
| Register as donor | ✓ | | | | | |
| View own profile | | ✓ | ✓ | | | |
| Update own profile | | ✓ | ✓ | | | |
| View own verification status | | ✓ | ✓ | | | |
| Manage own pickup locations | | ✓ | ✓ | | | |
| View own impact stats | | ✓ | ✓ | | | |
| Issue warning | | | | | ✓ | ✓ |
| Suspend donor | | | | | ✓ | ✓ |
| Reinstate donor | | | | | ✓ | ✓ |
| Ban donor | | | | | | ✓ |
| View any donor profile | | | | | ✓ | ✓ |
| Update verification level | | | | | ✓ | ✓ |

### 2.4 Organization Accounts

| Action | RECIPIENT | DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-------|--------------|-------|-------------|
| Register as organization | ✓ | | | | |
| View own org profile | | | ✓ | | |
| Update own org profile | | | ✓ | | |
| Browse donations (org view) | | | ✓ | | |
| Request allocation | | | ✓ | | |
| View own allocations | | | ✓ | | |
| Approve org application | | | | ✓ | ✓ |
| Reject org application | | | | ✓ | ✓ |
| Suspend org | | | | ✓ | ✓ |
| View all orgs | | | | ✓ | ✓ |

### 2.5 Reports

| Action | RECIPIENT | DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-------|--------------|-------|-------------|
| Submit safety report | ✓ (anonymous) | ✓ | ✓ | | |
| View own submitted reports | ✓ (session, limited) | ✓ | ✓ | | |
| View all reports | | | | ✓ | ✓ |
| Resolve report | | | | ✓ | ✓ |
| Dismiss report | | | | ✓ | ✓ |

### 2.6 Admin and Platform

| Action | RECIPIENT | DONOR | ORGANIZATION | ADMIN | SUPER_ADMIN |
|--------|-----------|-------|--------------|-------|-------------|
| View admin dashboard | | | | ✓ | ✓ |
| View audit logs | | | | ✓ | ✓ |
| Export audit logs | | | | ✓ | ✓ |
| View full analytics | | | | ✓ | ✓ |
| Update platform settings | | | | | ✓ |
| Activate emergency mode | | | | | ✓ |
| Manage admin accounts | | | | | ✓ |
| Promote user to admin | | | | | ✓ |
| Delete admin account | | | | | ✓ |
| View public impact stats | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## 3. Ownership Rules

- **Donation listings:** a donor can only modify or delete listings where `donations.donor_id = authenticatedUser.donor_id`.
- **Pickup code verification:** a donor can only verify codes tied to listings they own.
- **Pickup handover confirmation:** same as above listing ownership required.
- **Organization actions:** organization users can only act on records where `organizations.user_id = authenticatedUser.id`.
- **Recipient session actions:** pickup actions require the matching `recipient_session` cookie; sessions are tied to the browser and expire after 24 hours.

---

## 4. Role Escalation Rules

- No endpoint allows a user to change their own role.
- No endpoint allows an ADMIN to promote another user to SUPER_ADMIN.
- SUPER_ADMIN accounts are created by database seed on first deployment or by an existing SUPER_ADMIN through the dedicated admin endpoint.
- All role changes by SUPER_ADMIN are recorded in AUDIT_LOGS.

---

## 5. Account Status vs. Permissions

Account status affects what an authenticated user can do, even if their role would normally permit it:

| Status | Can Log In | Can Create Listings | Can Verify Pickups | Can Post Reports |
|--------|-----------|--------------------|--------------------|-----------------|
| PENDING | Yes (limited) | No | No | No |
| ACTIVE | Yes | Yes | Yes | Yes |
| WARNED | Yes | Yes | Yes | Yes |
| SUSPENDED | No (blocked at login) | No | No | No |
| BANNED | No (blocked at login) | No | No | No |

---

## 6. Middleware Implementation

### 6.1 Required Middleware Chain for Protected Routes

```
request
  → requireAuth()          // validates JWT, attaches user to req
  → requireRole(['DONOR']) // checks role membership
  → requireStatus(['ACTIVE', 'WARNED']) // checks account status
  → requireOwnership()     // checks resource belongs to user (where applicable)
  → handler()
```

### 6.2 `requireAuth` Logic
1. Extract `Authorization: Bearer <token>` from header.
2. Verify JWT signature using server-side secret.
3. Check token expiry.
4. Fetch user from database (or use cached token payload).
5. Attach user to `req.user`.
6. On any failure: return 401 UNAUTHORIZED.

### 6.3 `requireRole` Logic
1. Check `req.user.role` is in the allowed roles array.
2. Handle `isDonor` helper (matches both INDIVIDUAL_DONOR and BUSINESS_DONOR).
3. On failure: return 403 FORBIDDEN.

### 6.4 `requireOwnership` Logic
- For donation listings: query `WHERE id = :listingId AND donor_id = :donorId`.
- For pickup transactions (donor-side): query `WHERE listing.donor_id = :donorId`.
- For organization records: query `WHERE user_id = :userId`.
- On failure: return 403 FORBIDDEN (not 404, to avoid leaking existence).

---

## 7. Session-Based Recipient Permissions

Recipients do not have JWT tokens. They use a `recipient_session` cookie.

- Session is created automatically on first visit via `POST /sessions`.
- Session ID is stored in HttpOnly Secure cookie.
- Pickup code requests require this session cookie.
- Cooldown is checked against `session_id + donor_id`.
- Session expires after 24 hours of inactivity; new session created transparently.
- No PII is attached to the session (optional email only, stored separately).

### Session Middleware
```
request
  → attachRecipientSession()  // reads cookie, fetches session, attaches to req
  → handler()
```
If session not found or expired: create a new session transparently.

---

## 8. Admin Role Scope Summary

| Capability | ADMIN | SUPER_ADMIN |
|-----------|-------|-------------|
| Verify donors | ✓ | ✓ |
| Warn donors | ✓ | ✓ |
| Suspend donors | ✓ | ✓ |
| Reinstate donors | ✓ | ✓ |
| Ban donors | | ✓ |
| Approve organizations | ✓ | ✓ |
| Moderate listings | ✓ | ✓ |
| Resolve reports | ✓ | ✓ |
| View audit logs | ✓ | ✓ |
| Export data | ✓ | ✓ |
| Platform settings | | ✓ |
| Emergency mode | | ✓ |
| Manage admins | | ✓ |
| Ban email addresses | | ✓ |
