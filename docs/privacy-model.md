# Privacy Model
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Privacy Principles

1. **Collect minimum:** Only collect information strictly necessary for the platform to function.
2. **Recipient first:** Recipients face the most risk. Their privacy is the highest priority.
3. **Proportionality:** The more powerful a user's role, the more information they may need to provide but only what is needed.
4. **Transparency:** Users know what is collected, why, and how long it is kept.
5. **Control:** Users can access and delete their data subject to audit trail constraints.
6. **Dignity:** The platform never treats users as suspects. No poverty testing.

---

## 2. Information Classification

### 2.1 Classification Levels

| Level | Meaning |
|-------|---------|
| `PUBLIC` | Visible to anyone without authentication |
| `AUTHENTICATED` | Visible to logged-in users of appropriate type |
| `PRIVATE` | Visible only to the owning user and admins |
| `ADMIN_ONLY` | Visible only to admin staff |
| `AUDIT_ONLY` | Retained for compliance/safety, never shown in UI |
| `TEMPORARY` | Exists only for the duration of a transaction/session, then deleted |

---

## 3. What Each Role Sees

### 3.1 Recipient (No Account)

**Can see (PUBLIC):**
- Donation listing title, description, category
- Pickup location map pin and street address
- Available quantity and unit
- Pickup deadline
- Allergen information
- Storage requirements
- Donor display name (first name or business name)
- Donor type (Individual / Business)
- Distance from current location
- Platform-wide impact statistics

**Cannot see:**
- Donor's personal surname (unless business display name)
- Donor's email or phone
- Other recipients' activity
- Who else requested a pickup from a listing
- Any other user's personal data

**What the platform collects from a recipient:**
| Data | Why | How Long | Stored Where |
|------|-----|----------|-------------|
| Session cookie (random UUID) | Enable pickup code flow, cooldown check | 24 hours | Browser cookie + sessions table |
| Approximate search location (lat/lng) | Find nearby donations | NOT stored query only | Not stored |
| Email address (voluntary) | Send pickup confirmation | Until session expires or user requests deletion | notifications table (masked) |

**Recipient location is NEVER stored server-side linked to their session.**

### 3.2 Individual Donor

**Provided at registration:**
| Data | Classification | Stored | Shown Publicly |
|------|---------------|--------|---------------|
| First name | PRIVATE | Yes | No |
| Last name | PRIVATE | Yes | No |
| Display name | PUBLIC | Yes | Yes |
| Email | PRIVATE | Yes | No |
| Phone (E.164) | PRIVATE | Yes | No |
| Password hash | AUDIT_ONLY | Yes | Never |
| Pickup address | PUBLIC | Yes | Yes |
| Pickup coordinates | PUBLIC | Yes | Yes (map pin) |
| Safety agreement acceptance | AUDIT_ONLY | Yes | No |

**Shown to other users:**
- Display name only (e.g. "Ahmed K." or "Green Corner Bakery")
- Pickup address and map pin
- Active donation listings

**Shown to admins:**
- Full profile including email, phone, verification status, trust history

### 3.3 Business Donor

| Data | Classification | Stored | Shown Publicly |
|------|---------------|--------|---------------|
| Business name | PUBLIC | Yes | Yes |
| Contact person name | PRIVATE | Yes | Admin only |
| Business email | PRIVATE | Yes | Admin only |
| Phone | PRIVATE | Yes | Admin only |
| Website URL | PUBLIC | Yes | Yes (if provided) |
| Business category | PUBLIC | Yes | Yes |
| Pickup address | PUBLIC | Yes | Yes |
| Admin verification notes | ADMIN_ONLY | Yes | No |

### 3.4 Organization

| Data | Classification | Stored | Shown Publicly |
|------|---------------|--------|---------------|
| Organization name | PUBLIC | Yes | Yes |
| Organization type | PUBLIC | Yes | Yes |
| Contact person | PRIVATE | Yes | Admin only |
| Email | PRIVATE | Yes | Admin only |
| Phone | PRIVATE | Yes | Admin only |
| Website | PUBLIC | Yes | Yes |
| Description | PUBLIC | Yes | Yes |
| Service area | PUBLIC | Yes | Yes |
| People served estimate | AUTHENTICATED | Yes | Org profile |

---

## 4. Data Minimization Rules

### 4.1 What We Do NOT Collect

- Recipient identity (name, ID, passport)
- Proof of poverty, income, or hardship
- Recipient precise GPS coordinates (at rest)
- Donor's personal residential address (only the designated pickup location)
- Payment information (platform is free)
- Biometric data
- Political or religious affiliation
- Health or medical conditions
- Race or ethnicity
- National identification numbers

### 4.2 What We Collect Only With Explicit Consent

- Recipient email for notifications (optional, can be skipped)
- Organization sensitive data (collected only because necessary for verification and communication)

---

## 5. Location Privacy

### 5.1 Recipient Location
- GPS coordinates are sent to the server **only** as query parameters for the nearby search.
- The server performs the geographic query and returns listings.
- Coordinates are **NOT logged** in server access logs (Nginx configured with a custom log format that excludes query strings containing coordinates).
- Coordinates are **NOT stored** in the database.
- The server NEVER returns the recipient's coordinates in any API response.
- Donors NEVER see where a recipient is.

### 5.2 Donor Pickup Location
- Donors must provide a publicly visible pickup location (required for recipients to collect).
- The specific address and map pin are PUBLIC.
- The location shown is the designated pickup point, not necessarily the donor's private residence.
- If a donor is an individual at home, they are encouraged to use a nearby public landmark or front door only guidance is provided during onboarding.

---

## 6. Log Safety

### 6.1 What is Never in Logs
- Passwords (plaintext or hash)
- Pickup code tokens (even hashed)
- Full email addresses
- Phone numbers
- GPS coordinates
- Any PII that is not required for diagnosing technical errors

### 6.2 Log Masking Rules
| Data Type | Log Representation |
|-----------|-------------------|
| Email | `j****@example.com` (first char + domain) |
| Phone | `+254****567` (country code + last 3 digits) |
| Pickup token | `a3f2...` (first 4 chars only) |
| User ID | Full UUID (not PII) |
| IP address | Stored in audit_logs only; not in application logs |

### 6.3 Log Retention
- Application logs (stdout/stderr): 30 days
- Nginx access logs: 30 days
- Database audit_logs: indefinite (compliance requirement)
- Error tracking (Sentry or equivalent): 90 days

---

## 7. Data Retention and Deletion

### 7.1 Retention Periods

| Data Type | Retention | After Expiry |
|-----------|-----------|-------------|
| Recipient session | 24 hours inactive | Deleted |
| Recipient notification email (voluntary) | Until session expires | Deleted automatically |
| Donor account (active) | Indefinite while active | N/A |
| Donor account (deleted by user) | See 7.2 | Anonymized |
| Completed pickup transactions | 5 years (for impact reporting and compliance) | Anonymized |
| Audit logs | Indefinite | Never deleted |
| Impact records | Indefinite | Never deleted |
| Safety reports | 3 years | Anonymized |
| Verification OTPs | 15 minutes (email) / 10 minutes (SMS) | Deleted |
| Expired pickup codes | 30 days post-expiry | Deleted |
| Draft donation listings (never published) | 90 days inactive | Deleted |
| Cancelled/removed listings | 1 year | Anonymized |

### 7.2 Donor Account Deletion Request

When a donor requests account deletion:
1. Personal identifiers (name, email, phone) are replaced with anonymized placeholders.
2. Account status is set to `DELETED`.
3. Active listings are removed.
4. Active pickup codes are invalidated.
5. **Completed transaction records are retained (anonymized)** for impact reporting integrity.
6. **Audit log entries are retained** (immutable; cannot be deleted).
7. Trust history is retained in anonymized form.
8. The donor is notified by email that deletion has been completed.

Anonymization replaces:
- `first_name` → `[deleted]`
- `last_name` → `[deleted]`
- `email` → `deleted-{uuid}@platform.invalid`
- `phone` → `+00000000000`
- `display_name` → `[Former Donor]`

### 7.3 Organization Deletion Request
Same as donor, with the following addition:
- Pending allocations are cancelled and distribution partners notified.
- If the organization has active allocations, a 7-day notice period applies.

---

## 8. Data Sharing

### 8.1 What the Platform Shares

| Data | Shared With | Purpose |
|------|------------|---------|
| Pickup address + donor display name | Public (recipients) | Enable collection |
| Impact aggregate statistics | Public | Transparency, grant reporting |
| Safety report details | Admins only | Investigation |
| Donor information | Admins only | Verification, moderation |
| PII of any user | Third parties | NEVER unless legally compelled |

### 8.2 Third-Party Services
The platform uses these third-party services that may process data:

| Service | Data Processed | Privacy Requirement |
|---------|---------------|---------------------|
| Email provider (SMTP) | Email address, email body | No PII in email bodies beyond necessary context |
| SMS provider | Phone number, OTP text | Minimum data; OTP only |
| Geocoding API | Street address | No name or identity sent |
| Map tile provider (OSM) | Browser IP (tile requests) | OpenStreetMap no tracking |
| Error tracking (Sentry) | Stack traces | PII scrubbed from event payloads |

All third-party services are named in the Privacy Policy. No selling or sharing of data for advertising.

---

## 9. User Rights (GDPR-Compatible Baseline)

The platform respects the following rights for all users regardless of jurisdiction:

| Right | How to Exercise | Platform Response |
|-------|----------------|-------------------|
| Access | In-app "Download My Data" or email request | Within 30 days |
| Correction | Edit profile in-app | Immediate |
| Deletion | In-app "Delete Account" or email request | Within 7 days (with anonymization as per 7.2) |
| Portability | "Download My Data" JSON export | Within 30 days |
| Objection to processing | Email request | Reviewed within 14 days |
| Withdraw consent | Remove optional email from profile | Immediate |

Data requests are handled by the platform's Data Contact email (defined in `.env` and displayed in the Privacy Policy).

---

## 10. Privacy Policy Requirements

The public Privacy Policy must clearly state:

1. Who operates the platform and how to contact them
2. What personal data is collected and why
3. Legal basis for processing (legitimate interest / consent / contract)
4. How long data is retained
5. Who data is shared with (third-party services named)
6. User rights and how to exercise them
7. Cookie usage (session cookie: functional; no advertising cookies)
8. How to contact the Data Protection Officer or equivalent

The Privacy Policy is written in plain language at an accessible reading level.  
It is available at `/privacy` without login.  
It is linked from every page footer.

---

## 11. Cookie Policy

| Cookie | Name | Purpose | Duration | Type |
|--------|------|---------|----------|------|
| Recipient session | `recipient_session` | Anonymous pickup flow | 24 hours | Functional |
| Auth refresh token | `refresh_token` | Maintain donor/org login | 30 days | Functional |
| Language preference | `lang` | Remember UI language | 1 year | Functional |

No advertising, analytics, or tracking cookies are set.  
No third-party cookie scripts are loaded.  
No cookie consent banner required (functional-only cookies under GDPR guidelines) though a simple informational notice is shown on first visit.
