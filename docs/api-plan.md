# API Plan
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## Conventions

- Base URL: `/api/v1`
- All request/response bodies: `application/json`
- All timestamps: ISO 8601 UTC (e.g. `2026-10-04T14:30:00Z`)
- Authentication: `Authorization: Bearer <access_token>` header
- Errors always return `{ "error": { "code": "ERROR_CODE", "message": "Human-readable message", "details": {} } }`
- Pagination: `?page=1&limit=20` → response includes `{ data: [], meta: { page, limit, total, totalPages } }`
- Auth codes: 401 = not authenticated, 403 = authenticated but not authorized
- Rate limits: see security-model.md; exceeded returns HTTP 429 with `Retry-After` header

### Auth Requirement Key
- `PUBLIC` no authentication required
- `SESSION` recipient session cookie required (anonymous)
- `DONOR` authenticated donor account
- `ORG` authenticated organization account
- `ADMIN` admin or super admin account
- `SUPER_ADMIN` super admin only

---

## 1. Authentication Endpoints

### POST /auth/register
Register a new donor or organization account.

- **Auth:** PUBLIC
- **Rate limit:** 10/IP/15min
- **Request:**
```json
{
  "role": "INDIVIDUAL_DONOR | BUSINESS_DONOR | ORGANIZATION",
  "email": "string (required)",
  "password": "string (required, min 8 chars)",
  "phone": "string (E.164 format)",
  "first_name": "string (required for individual)",
  "last_name": "string (required for individual)",
  "business_name": "string (required for business)",
  "business_category": "string (required for business)",
  "contact_person_name": "string (required for business/org)",
  "org_name": "string (required for org)",
  "org_type": "string (required for org)"
}
```
- **Validation:** email format, password min length 8, phone E.164, required fields by role
- **Response 201:**
```json
{
  "user_id": "uuid",
  "role": "string",
  "message": "Registration successful. Please verify your email."
}
```
- **Error responses:** 400 (validation), 409 (email/phone already registered)

---

### POST /auth/login
Authenticate and receive tokens.

- **Auth:** PUBLIC
- **Rate limit:** 10/IP/15min
- **Request:**
```json
{ "email": "string", "password": "string" }
```
- **Response 200:**
```json
{
  "access_token": "string (JWT, 15min expiry)",
  "user": {
    "id": "uuid",
    "role": "string",
    "status": "string",
    "display_name": "string"
  }
}
```
- Refresh token is set as `HttpOnly; Secure; SameSite=Strict` cookie named `refresh_token`.
- **Error responses:** 400 (validation), 401 (invalid credentials), 403 (account suspended/banned), 429 (rate limit)

---

### POST /auth/logout
Revoke refresh token.

- **Auth:** DONOR | ORG | ADMIN (any authenticated)
- **Request:** (empty refresh token read from cookie)
- **Response 204:** No content
- Refresh token cookie is cleared.

---

### POST /auth/refresh
Exchange refresh token for a new access token.

- **Auth:** SESSION cookie (refresh_token cookie)
- **Rate limit:** 20/IP/15min
- **Request:** (empty refresh token read from cookie)
- **Response 200:**
```json
{ "access_token": "string" }
```
- New refresh token issued in cookie; old one revoked.
- **Error responses:** 401 (invalid/expired refresh token)

---

### POST /auth/verify-email
Verify email address with OTP.

- **Auth:** PUBLIC
- **Request:**
```json
{ "user_id": "uuid", "code": "string (6-digit OTP)" }
```
- **Response 200:**
```json
{ "message": "Email verified successfully." }
```
- **Error responses:** 400 (invalid code), 410 (expired code)

---

### POST /auth/verify-phone
Verify phone with SMS OTP.

- **Auth:** DONOR | ORG
- **Request:**
```json
{ "code": "string (6-digit OTP)" }
```
- **Response 200:**
```json
{ "message": "Phone verified successfully." }
```
- **Error responses:** 400 (invalid code), 410 (expired code)

---

### POST /auth/resend-verification
Resend verification OTP.

- **Auth:** PUBLIC
- **Rate limit:** 3/email/hour
- **Request:**
```json
{ "user_id": "uuid", "type": "EMAIL | PHONE" }
```
- **Response 200:**
```json
{ "message": "Verification code sent." }
```

---

### POST /auth/forgot-password
Request a password reset email.

- **Auth:** PUBLIC
- **Rate limit:** 3/email/hour
- **Request:**
```json
{ "email": "string" }
```
- **Response 200:** (always 200 to prevent email enumeration)
```json
{ "message": "If that email exists, a reset link has been sent." }
```

---

### POST /auth/reset-password
Reset password using reset token.

- **Auth:** PUBLIC
- **Request:**
```json
{ "token": "string", "new_password": "string (min 8 chars)" }
```
- **Response 200:**
```json
{ "message": "Password reset successfully." }
```
- **Error responses:** 400 (invalid token or weak password), 410 (expired token)

---

## 2. Recipient / Session Endpoints

### POST /sessions
Create an anonymous recipient session.

- **Auth:** PUBLIC
- **Rate limit:** 30/IP/min
- **Request:** (empty or `{}`)
- **Response 201:**
```json
{ "session_token": "string" }
```
- Session token set as `HttpOnly; Secure; SameSite=Strict` cookie named `recipient_session`.
- Session TTL: 24 hours (refreshed on activity).

---

### GET /donations/nearby
Search for nearby donations. Core recipient endpoint.

- **Auth:** PUBLIC (SESSION preferred for cooldown check)
- **Rate limit:** 60/IP/min
- **Query params:**
  - `lat` (float, required) recipient's latitude
  - `lng` (float, required) recipient's longitude
  - `radius` (integer, metres, default 5000, max 50000)
  - `category` (string, optional)
  - `page`, `limit`
- **Validation:** lat −90 to 90, lng −180 to 180, radius positive integer
- **Response 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "title": "string",
      "category": "string",
      "description": "string (truncated)",
      "remaining_quantity": 10,
      "unit": "string",
      "pickup_deadline": "ISO8601",
      "distance_meters": 420,
      "donor_display_name": "string",
      "donor_type": "INDIVIDUAL | BUSINESS",
      "pickup_location": {
        "address_line1": "string",
        "city": "string",
        "country_code": "string",
        "lat": 0.0,
        "lng": 0.0,
        "pickup_instructions": "string"
      },
      "is_food": true,
      "allergens": [],
      "storage_requirement": "string",
      "in_cooldown": false
    }
  ],
  "meta": { "page": 1, "limit": 20, "total": 45, "totalPages": 3 }
}
```
- Note: recipient GPS coordinates are NOT stored server-side. They are used only for this query and discarded.
- `in_cooldown` is included only when a valid session token is provided.

---

### GET /donations/:id
Get full details of a single donation listing.

- **Auth:** PUBLIC
- **Response 200:** Full listing object including items, allergens, pickup location, donor display info
- **Error responses:** 404 (listing not found or not publicly visible)

---

## 3. Pickup Endpoints

### POST /pickups
Request a pickup code for a donation.

- **Auth:** SESSION (recipient session cookie required)
- **Rate limit:** 5/session/15min
- **Request:**
```json
{
  "listing_id": "uuid",
  "requested_items": [
    { "item_name": "string", "quantity": 2, "unit": "string" }
  ]
}
```
- **Server checks (in order):**
  1. Listing exists and status is ACTIVE or LOW_STOCK
  2. Requested quantity ≤ available (remaining − reserved)
  3. No active cooldown between session and donor
  4. No existing active code for this session + listing
- **Atomic:** listing.reserved_quantity incremented inside DB transaction
- **Response 201:**
```json
{
  "transaction_id": "uuid",
  "code": "string (32-char hex token)",
  "display_code": "string (8-char alphanumeric)",
  "qr_data": "string (URL or data for QR rendering)",
  "expires_at": "ISO8601",
  "pickup_location": {
    "address_line1": "string",
    "city": "string",
    "lat": 0.0,
    "lng": 0.0,
    "pickup_instructions": "string"
  },
  "listing_title": "string"
}
```
- **Error responses:** 400 (validation), 404 (listing not found), 409 (inventory gone or cooldown active), 410 (listing expired)

---

### GET /pickups/:transaction_id
Get current state of a pickup transaction.

- **Auth:** SESSION (must be the session that created the transaction)
- **Response 200:**
```json
{
  "transaction_id": "uuid",
  "status": "string",
  "listing_title": "string",
  "display_code": "string",
  "expires_at": "ISO8601",
  "pickup_location": {}
}
```
- **Error responses:** 403 (wrong session), 404 (not found)

---

### DELETE /pickups/:transaction_id
Cancel a pickup (recipient cancels).

- **Auth:** SESSION
- **Server:** code invalidated, reserved inventory released, cooldown NOT triggered
- **Response 200:**
```json
{ "message": "Pickup cancelled." }
```
- **Error responses:** 403, 404, 409 (already completed or expired)

---

### POST /pickups/verify
Donor verifies a pickup code (initiates handover).

- **Auth:** DONOR
- **Rate limit:** 10/donor/10min
- **Request:**
```json
{ "code": "string (token or display_code)" }
```
- **Server checks:**
  1. Code exists (hash lookup)
  2. Code status is ACTIVE
  3. Code not expired
  4. Listing belongs to this donor
- **Response 200:**
```json
{
  "transaction_id": "uuid",
  "listing_id": "uuid",
  "listing_title": "string",
  "items": [
    { "item_name": "string", "quantity": 2, "unit": "string" }
  ],
  "message": "Code verified. Please confirm the actual handover."
}
```
- **Error responses:** 400 (invalid code format), 404 (code not found), 409 (code already used or expired), 403 (code belongs to a different donor's listing)

---

### POST /pickups/:transaction_id/confirm
Donor confirms actual items handed over.

- **Auth:** DONOR (must own the listing)
- **Request:**
```json
{
  "items_given": [
    { "item_name": "string", "quantity": 2, "unit": "string", "weight_kg": 0.5 }
  ]
}
```
- **Server (atomic transaction):**
  1. Marks pickup code as USED
  2. Reduces listing.remaining_quantity by confirmed quantity
  3. Releases listing.reserved_quantity reservation
  4. Updates transaction status to COMPLETED
  5. Creates IMPACT_RECORD
  6. Creates COOLDOWN record (expires_at = NOW() + 4 hours)
  7. Triggers notification to recipient (if email provided)
  8. Writes AUDIT_LOG entry
- **Response 200:**
```json
{
  "transaction_id": "uuid",
  "status": "COMPLETED",
  "confirmed_at": "ISO8601",
  "items_given": [],
  "impact": {
    "total_items": 2,
    "total_weight_kg": 1.0
  }
}
```
- **Error responses:** 400 (validation), 403 (not listing owner), 404, 409 (transaction already completed or expired listing)

---

## 4. Donor Endpoints

### GET /donor/profile
Get authenticated donor's profile.

- **Auth:** DONOR
- **Response 200:** Full donor profile (no password hash, no internal tokens)

---

### PATCH /donor/profile
Update donor profile.

- **Auth:** DONOR
- **Request:** Partial donor fields (name, display_name, website_url, business_category, etc.)
- **Not updatable:** email, phone (separate verification endpoints), role, status, verification_level
- **Response 200:** Updated profile

---

### GET /donor/locations
List donor's pickup locations.

- **Auth:** DONOR
- **Response 200:** Array of pickup_locations

---

### POST /donor/locations
Add a new pickup location.

- **Auth:** DONOR
- **Request:**
```json
{
  "label": "string",
  "address_line1": "string",
  "city": "string",
  "country_code": "string",
  "lat": 0.0,
  "lng": 0.0,
  "pickup_instructions": "string",
  "operating_hours": []
}
```
- **Response 201:** Created location

---

### PATCH /donor/locations/:id
Update a pickup location.

- **Auth:** DONOR (must own location)
- **Response 200:** Updated location

---

### DELETE /donor/locations/:id
Deactivate a pickup location.

- **Auth:** DONOR (must own location)
- **Constraint:** Cannot deactivate if active listings reference this location
- **Response 200** or **409** (active listings exist)

---

### GET /donor/donations
List donor's own donation listings.

- **Auth:** DONOR
- **Query:** `?status=ACTIVE&page=1&limit=20`
- **Response 200:** Paginated listings

---

### GET /donor/pickups
Donor's pickup history.

- **Auth:** DONOR
- **Query:** `?status=COMPLETED&page=1&limit=20`
- **Response 200:** Paginated transactions

---

### GET /donor/impact
Donor's personal impact summary.

- **Auth:** DONOR
- **Response 200:**
```json
{
  "total_pickups": 47,
  "total_items_donated": 230.5,
  "total_weight_kg": 115.0,
  "total_meals": 460,
  "active_since": "ISO8601"
}
```

---

## 5. Donation Listing Endpoints

### POST /donations
Create a new donation listing.

- **Auth:** DONOR (status must be ACTIVE)
- **Request:** Full listing object (see data-model.md donation_listings fields)
- **Validation:** pickup_deadline in future, quantities positive, category valid, food fields required when is_food=true
- **Response 201:** Created listing (status: ACTIVE for individual verified donors; PENDING_REVIEW for new business donors)

---

### GET /donations/:id
Get a single listing (public).

- **Auth:** PUBLIC
- **Response 200:** Full listing (only if status ACTIVE or LOW_STOCK)

---

### PATCH /donations/:id
Edit a listing.

- **Auth:** DONOR (must own listing)
- **Constraint:** Cannot edit quantity fields if active pickup transactions exist; must cancel them first
- **Not editable:** status (use dedicated endpoints), donor_id, created_at
- **Response 200:** Updated listing

---

### DELETE /donations/:id
Close/remove a donor's own listing.

- **Auth:** DONOR (must own listing)
- **Server:** Status set to REMOVED, all active codes invalidated, reservations released
- **Response 200**

---

### PATCH /donations/:id/extend
Extend pickup deadline.

- **Auth:** DONOR (must own listing)
- **Request:** `{ "new_deadline": "ISO8601" }`
- **Validation:** new_deadline must be in the future
- **Response 200:** Updated listing

---

## 6. Organization Endpoints

### GET /org/profile
Get organization profile.

- **Auth:** ORG

---

### PATCH /org/profile
Update organization profile.

- **Auth:** ORG

---

### GET /org/donations
Browse donations available for organization allocation.

- **Auth:** ORG
- **Query:** `?lat=&lng=&radius=&category=&page=&limit=`
- **Response:** Similar to nearby search but includes larger-quantity listings

---

### POST /org/allocations
Request an allocation from a listing.

- **Auth:** ORG
- **Request:**
```json
{
  "listing_id": "uuid",
  "requested_quantity": 50,
  "requested_items": [],
  "notes": "string"
}
```
- **Response 201:** Allocation request created (status: PENDING_DONOR_APPROVAL)

---

### GET /org/allocations
List organization's allocations.

- **Auth:** ORG
- **Response 200:** Paginated allocations

---

## 7. Verification Endpoints

### GET /verification/status
Get own verification status.

- **Auth:** DONOR | ORG
- **Response 200:**
```json
{
  "email_verified": true,
  "phone_verified": true,
  "verification_level": "CONTACT_VERIFIED",
  "business_verified": false
}
```

---

### POST /verification/business/submit
Submit additional information for business verification.

- **Auth:** DONOR (business type)
- **Request:**
```json
{
  "website_url": "string",
  "social_profile_url": "string",
  "additional_notes": "string"
}
```
- **Response 200:** Verification request queued

---

## 8. Report Endpoints

### POST /reports
Submit a safety or misconduct report.

- **Auth:** PUBLIC (SESSION preferred)
- **Rate limit:** 5/session/hour
- **Request:**
```json
{
  "listing_id": "uuid",
  "category": "UNSAFE_FOOD | SPOILED_OR_EXPIRED | WRONG_DESCRIPTION | ALREADY_GONE | DONOR_MISCONDUCT | HARASSMENT | OTHER",
  "description": "string (optional, max 500 chars)"
}
```
- **Server:** Creates report, triggers auto-hide if CRITICAL severity
- **Response 201:**
```json
{ "message": "Report submitted. Thank you for helping keep the platform safe." }
```
- **Error responses:** 400 (validation), 404 (listing not found), 429 (rate limit)

---

## 9. Notification Endpoints

### GET /notifications
Get authenticated user's notifications.

- **Auth:** DONOR | ORG
- **Query:** `?read=false&page=1&limit=20`
- **Response 200:** Paginated notifications

---

### PATCH /notifications/:id/read
Mark a notification as read.

- **Auth:** DONOR | ORG (must own notification)
- **Response 200**

---

## 10. Impact Endpoints

### GET /impact/summary
Public platform-wide impact summary.

- **Auth:** PUBLIC
- **Cache:** 5 minutes
- **Response 200:**
```json
{
  "total_pickups": 12450,
  "total_weight_kg": 62250.5,
  "total_meals": 124500,
  "total_items": 89000,
  "active_donors": 342,
  "partner_organizations": 87,
  "countries": 14,
  "last_updated": "ISO8601"
}
```

---

### GET /impact/by-country
Impact breakdown by country.

- **Auth:** PUBLIC
- **Cache:** 10 minutes
- **Response 200:** Array of `{ country_code, country_name, total_pickups, total_kg }`

---

### GET /impact/recent
Recent completed pickups (privacy-safe).

- **Auth:** PUBLIC
- **Response 200:** Array of `{ category, city, country_code, total_items, completed_at }` no donor/recipient identity

---

## 11. Admin Endpoints

All admin endpoints require `ADMIN` or `SUPER_ADMIN` role unless otherwise noted.  
All admin actions are written to AUDIT_LOGS.

### GET /admin/dashboard
Dashboard summary stats.

- **Auth:** ADMIN
- **Response 200:** Today's pickups, pending verifications, open reports, new registrations, platform health

---

### GET /admin/donors
List all donors with filters.

- **Auth:** ADMIN
- **Query:** `?status=&verification_level=&search=&page=&limit=`
- **Response 200:** Paginated donors

---

### GET /admin/donors/:id
Get single donor full profile (including trust history, reports received).

- **Auth:** ADMIN

---

### POST /admin/donors/:id/warn
Issue a warning to a donor.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### POST /admin/donors/:id/suspend
Suspend a donor account.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Server:** Status → SUSPENDED, active listings hidden, active codes invalidated
- **Response 200**

---

### POST /admin/donors/:id/reinstate
Reinstate a suspended donor.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### POST /admin/donors/:id/ban
Permanently ban a donor.

- **Auth:** SUPER_ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### PATCH /admin/donors/:id/verification
Update donor verification level.

- **Auth:** ADMIN
- **Request:** `{ "level": "BUSINESS_VERIFIED | TRUSTED_DONOR", "notes": "string" }`
- **Response 200**

---

### GET /admin/organizations
List all organizations.

- **Auth:** ADMIN
- **Query:** `?status=&page=&limit=`

---

### POST /admin/organizations/:id/approve
Approve an organization application.

- **Auth:** ADMIN
- **Request:** `{ "notes": "string (optional)" }`
- **Response 200**

---

### POST /admin/organizations/:id/reject
Reject an organization application.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### GET /admin/donations
List all listings with admin filters.

- **Auth:** ADMIN
- **Query:** `?status=&donor_id=&flagged=true&page=&limit=`

---

### POST /admin/donations/:id/hide
Hide a listing pending review.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### POST /admin/donations/:id/reinstate
Reinstate a hidden listing.

- **Auth:** ADMIN
- **Request:** `{ "notes": "string" }`
- **Response 200**

---

### POST /admin/donations/:id/remove
Permanently remove a listing.

- **Auth:** ADMIN
- **Request:** `{ "reason": "string (required)" }`
- **Response 200**

---

### GET /admin/reports
List safety reports.

- **Auth:** ADMIN
- **Query:** `?status=OPEN&severity=CRITICAL&page=&limit=`

---

### PATCH /admin/reports/:id
Resolve or update a report.

- **Auth:** ADMIN
- **Request:** `{ "status": "RESOLVED | DISMISSED", "action_taken": "string", "notes": "string" }`
- **Response 200**

---

### GET /admin/verification-queue
List donors awaiting manual business verification.

- **Auth:** ADMIN
- **Response 200:** Paginated pending verifications

---

### GET /admin/audit-logs
Query audit logs.

- **Auth:** ADMIN
- **Query:** `?actor_id=&action=&entity_type=&from=&to=&page=&limit=`
- **Response 200:** Paginated audit log entries (read-only)

---

### GET /admin/impact
Full impact analytics.

- **Auth:** ADMIN
- **Query:** `?from=&to=&country=`
- **Response 200:** Full metrics breakdown with time series data

---

### GET /admin/settings
Get platform settings.

- **Auth:** SUPER_ADMIN

---

### PATCH /admin/settings
Update platform settings.

- **Auth:** SUPER_ADMIN
- **Request:** `{ "key": "string", "value": "string" }`
- **Response 200**

---

### POST /admin/emergency/activate
Activate emergency mode for a region.

- **Auth:** SUPER_ADMIN
- **Request:** `{ "event_name": "string", "regions": ["string"], "notes": "string" }`
- **Response 200**

---

### POST /admin/emergency/deactivate
Deactivate emergency mode.

- **Auth:** SUPER_ADMIN
- **Request:** `{ "notes": "string" }`
- **Response 200**

---

### GET /admin/admins
List admin accounts.

- **Auth:** SUPER_ADMIN

---

### POST /admin/admins
Create a new admin account.

- **Auth:** SUPER_ADMIN
- **Request:** `{ "email": "string", "role": "ADMIN | SUPER_ADMIN", "password": "string" }`
- **Response 201**

---

## 12. Error Response Format

All errors follow this envelope:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "The request contained invalid fields.",
    "details": {
      "fields": {
        "email": "Must be a valid email address.",
        "quantity": "Must be a positive number."
      }
    }
  }
}
```

### Standard Error Codes

| HTTP | Code | Meaning |
|------|------|---------|
| 400 | `VALIDATION_ERROR` | Invalid request data |
| 400 | `INVALID_CODE` | Pickup code format invalid |
| 401 | `UNAUTHORIZED` | Not authenticated |
| 401 | `TOKEN_EXPIRED` | Access token expired |
| 403 | `FORBIDDEN` | Authenticated but not permitted |
| 403 | `ACCOUNT_SUSPENDED` | Account is suspended |
| 404 | `NOT_FOUND` | Resource not found |
| 409 | `CONFLICT` | Business rule conflict (inventory, cooldown, duplicate) |
| 409 | `COOLDOWN_ACTIVE` | Recipient in 4-hour same-donor cooldown |
| 409 | `CODE_ALREADY_USED` | Pickup code already redeemed |
| 409 | `INVENTORY_UNAVAILABLE` | Not enough inventory for request |
| 410 | `LISTING_EXPIRED` | Listing is expired |
| 410 | `CODE_EXPIRED` | Pickup code has expired |
| 429 | `RATE_LIMITED` | Too many requests |
| 500 | `INTERNAL_ERROR` | Unexpected server error |
