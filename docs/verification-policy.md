# Verification Policy
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Purpose

Verification on this platform serves one goal: ensuring that people and organizations that list donations are real, can be contacted, and have committed to the platform's safety standards. It does not gatekeep; it builds trust and enables accountability.

Verification is NOT about proving donors are worthy. It is about:
- Ensuring pickup locations are real and reachable
- Ensuring contact information works (for safety-critical communication)
- Giving recipients confidence that a listing is from a legitimate source
- Creating accountability when something goes wrong

---

## 2. Verification Levels

| Level | Label | Meaning |
|-------|-------|---------|
| 0 | `PENDING` | Registered but nothing verified yet |
| 1 | `CONTACT_VERIFIED` | Email and phone confirmed via OTP |
| 2 | `LOCATION_VERIFIED` | Pickup address geocodes to valid coordinates |
| 3 | `BUSINESS_VERIFIED` | Business identity confirmed via public information |
| 4 | `TRUSTED_DONOR` | Long-term positive track record |

Each level builds on the previous. A donor cannot be `BUSINESS_VERIFIED` without first being `CONTACT_VERIFIED`.

---

## 3. Individual Donor Verification

### 3.1 Required Information

| Field | Required | Stored |
|-------|----------|--------|
| First name | Yes | Yes |
| Last name | Yes | Yes (not shown publicly) |
| Email address | Yes | Yes |
| Phone number | Yes | Yes (E.164) |
| Pickup location | Yes | Yes |
| Safety agreement acceptance | Yes | Timestamp + version |

### 3.2 Verification Process

**Step 1 Email Verification (required)**
- System sends a 6-digit OTP to provided email.
- OTP valid for 15 minutes.
- User enters OTP in the app.
- On success: `email_verified = true`
- Maximum 3 resend attempts per hour.

**Step 2 Phone Verification (required)**
- System sends a 6-digit OTP via SMS.
- OTP valid for 10 minutes.
- User enters OTP in the app.
- On success: `phone_verified = true`
- When both email and phone verified: status advances to `CONTACT_VERIFIED` → `ACTIVE`.

**Step 3 Location Verification (automatic)**
- When pickup location is saved, geocoding API validates the address.
- Valid coordinates returned: `LOCATION_VERIFIED` flag set on that location.
- Invalid or unresolvable address: donor is asked to correct or confirm the address manually.
- Admin can manually mark a location as verified after review.

**Individual donor goes ACTIVE automatically after CONTACT_VERIFIED.**

---

## 4. Business Donor Verification

### 4.1 Required Information

| Field | Required | Stored |
|-------|----------|--------|
| Business name | Yes | Yes |
| Business category | Yes | Yes |
| Contact person name | Yes | Yes |
| Business email | Yes | Yes |
| Phone | Yes | Yes |
| Pickup location | Yes | Yes |
| Website URL | Strongly recommended | Yes |
| Social media profile URL | Optional | Yes |
| Safety agreement acceptance | Yes | Timestamp + version |

**Business registration certificate upload is NOT required during normal onboarding.**

### 4.2 Business Verification Process

**Step 1 Contact Verification (same as individual)**
- Email OTP + Phone OTP → `CONTACT_VERIFIED`

**Step 2 Public Information Verification**

The system attempts automated verification via these methods (in order):

**Method A Email Domain Match (fastest, automated)**
- Extract domain from business email (e.g. `bob@greenmarket.co.ke` → `greenmarket.co.ke`).
- Extract domain from website URL (e.g. `https://greenmarket.co.ke` → `greenmarket.co.ke`).
- If domains match: auto-verification passes → status: `BUSINESS_VERIFIED`.
- If domains do not match (e.g. personal Gmail used): proceed to Method B.

**Method B Google Maps / OSM Listing Cross-Reference (automated)**
- Query geocoding/places API for the business name + address.
- If a matching business listing is found at that location: flag as auto-verified.
- If no match: proceed to Method C.

**Method C Social Profile Verification (automated assist)**
- If social profile URL provided (LinkedIn, Facebook Business Page, Instagram Business, etc.):
  - Check that the URL is accessible and the page name matches the business name.
  - If match found: flag as auto-assisted; admin reviews briefly.

**Method D Manual Admin Review (fallback)**
- If none of the above methods succeed, the business is placed in `PENDING_REVIEW`.
- Admin receives notification.
- Admin searches publicly available sources:
  - Business registration databases (country-specific)
  - Google Maps
  - Social media
  - News / web search
- Admin documents findings in the admin notes field.
- Admin approves → `BUSINESS_VERIFIED` or requests more information from the business.

### 4.3 Business Donor During Pending Review Period
- Business donor can post listings at `CONTACT_VERIFIED` status.
- First 3 listings are held for admin review (status: `PENDING_REVIEW`) before going ACTIVE.
- After `BUSINESS_VERIFIED`: all new listings go ACTIVE immediately (unless flagged by reports).

---

## 5. Organization (Distribution Partner) Verification

### 5.1 Required Information

| Field | Required | Stored |
|-------|----------|--------|
| Organization name | Yes | Yes |
| Organization type | Yes | Yes |
| Contact person name + role | Yes | Yes |
| Email | Yes | Yes |
| Phone | Yes | Yes |
| Website URL | Yes | Yes |
| Description of services | Yes | Yes |
| Service area | Yes | Yes |
| Estimated people served | Recommended | Yes |
| Country and region | Yes | Yes |

### 5.2 Organization Verification Process

Organizations always require manual admin review before activation.

**Step 1 Contact Verification**
- Email OTP + Phone OTP.

**Step 2 Admin Review**
Admin verifies the organization via:
- Website review (does it describe a legitimate nonprofit/food bank/shelter/etc.?)
- Google search for organization name + location
- Cross-reference with known registries (charity databases, UN OCHA partner lists, etc.)
- Direct contact if needed (phone or email)

**Step 3 Approval**
- Admin approves: status → `ACTIVE`
- Admin rejects: email sent to organization with reason
- Admin requests more info: organization receives email with questions; review paused until response

Organizations do not post donations; they request allocations. The verification bar is therefore about ensuring they are a legitimate distribution entity.

---

## 6. Verification Level Grant Conditions

| Level | Granted When |
|-------|-------------|
| `CONTACT_VERIFIED` | Email OTP ✓ AND Phone OTP ✓ |
| `LOCATION_VERIFIED` | Geocoding returns valid coordinates for submitted address |
| `BUSINESS_VERIFIED` | Method A/B/C auto-pass OR Admin manual approval |
| `TRUSTED_DONOR` | ≥ 20 completed pickups AND account ≥ 90 days old AND zero suspensions AND trust score ≥ 80 |

`TRUSTED_DONOR` is evaluated automatically by a nightly batch job. Admins can manually grant or revoke it with a reason.

---

## 7. Verification Level Effects

| Level | Effect on Platform Behavior |
|-------|---------------------------|
| `PENDING` | Cannot post donations |
| `CONTACT_VERIFIED` (Individual) | Can post donations immediately; listings go ACTIVE |
| `CONTACT_VERIFIED` (Business) | Can post; first 3 listings held for admin review |
| `BUSINESS_VERIFIED` | All listings go ACTIVE immediately; no per-listing review |
| `TRUSTED_DONOR` | Displayed with "Trusted Donor" badge on listings; lower scrutiny threshold |

---

## 8. Verification Downgrade

A verified status can be revoked under these conditions:

| Status Revoked | Trigger |
|---------------|---------|
| `TRUSTED_DONOR` | Any suspension, or trust score drops below 80 |
| `BUSINESS_VERIFIED` | Evidence of fraudulent business information |
| `LOCATION_VERIFIED` | Multiple failed pickups from that location suggesting incorrect address |
| `CONTACT_VERIFIED` | Email or phone found invalid (bounce / carrier rejection) |

All downgrades are logged in `trust_history` and `audit_logs` with reason and admin ID.

---

## 9. Large-Volume and Higher-Risk Donors

Donors whose listings regularly contain:
- > 100 kg food items per listing
- Meat, dairy, or other high-risk food categories
- Items requiring cold chain management

...may be flagged for enhanced verification at admin discretion:
- Telephone contact by platform admin
- Confirmation of storage facilities
- Confirmation of food handling practices

This is not mandatory for all business donors. It is triggered at admin discretion based on listing content and volume. It does not require uploading business registration certificates unless the admin specifically requests it.

---

## 10. What Verification Does NOT Guarantee

The platform explicitly states in its Terms of Service and donor-facing documentation:

> Verification confirms that a donor's contact information is valid and that their business identity appears to match publicly available information. It does NOT certify the safety, quality, or condition of any food or product donated. Donors bear sole responsibility for the accuracy of their listings and the safety of items they distribute.

This statement is shown to recipients on the donation detail screen.

---

## 11. Verification Communication Templates

| Event | Channel | Template |
|-------|---------|---------|
| Email OTP sent | Email | `email-otp` |
| Phone OTP sent | SMS | `phone-otp` |
| Email verified | Email | `email-verified-confirmation` |
| Account active | Email | `account-active` |
| Business under review | Email | `business-under-review` |
| Business verified | Email | `business-verified` |
| Business verification failed | Email | `business-verification-failed` |
| Business: more info requested | Email | `verification-more-info` |
| Organization approved | Email | `org-approved` |
| Organization rejected | Email | `org-rejected` |
| Trusted donor granted | Email | `trusted-donor-granted` |
| Trusted donor revoked | Email | `trusted-donor-revoked` |
