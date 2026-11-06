# Product Specification
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved for Implementation

---

## 1. Mission

> "No good food should become waste while someone nearby is hungry."

The Global Surplus Redistribution Platform is a free, nonprofit-operated digital infrastructure that connects donors of surplus food and usable products with recipients and distribution partners worldwide. The platform eliminates friction, respects dignity, and produces measurable real-world impact.

---

## 2. Core Principles (Non-Negotiable)

| # | Principle |
|---|-----------|
| 1 | Recipients do NOT need an account to find or receive donations |
| 2 | Recipients are never asked to prove poverty or need |
| 3 | Donors may be individuals or organizations/businesses |
| 4 | Every donor must provide a verified pickup location |
| 5 | Businesses do NOT upload registration documents during normal onboarding |
| 6 | Business verification uses publicly available information where practical |
| 7 | Donors must agree not to distribute unsafe food or products |
| 8 | Donors are responsible for accurate donation descriptions |
| 9 | Only confirmed donor handovers reduce inventory |
| 10 | Recipients cannot manually claim inventory |
| 11 | Pickup codes/QR tokens are temporary and single-use |
| 12 | Successful pickup creates a 4-hour same-donor cooldown for that recipient |
| 13 | The cooldown starts after confirmed handover, not at code generation |
| 14 | Recipients may use a different donor during cooldown |
| 15 | Recipient location must remain private |
| 16 | Donor pickup locations must be publicly visible |
| 17 | Impact statistics come only from completed transactions |
| 18 | Safety reports must create an immutable audit trail |
| 19 | Do not collect unnecessary personal information |
| 20 | Build globally from the beginning |
| 21 | The platform must work on mobile and slow/poor connections |
| 22 | No AI features unless explicitly requested |

---

## 3. User Types

### 3.1 Recipient
A person who seeks available free food or useful products. No account required. Location shared only with their own device for nearby search. No documentation of need required.

### 3.2 Individual Donor
A private individual donating surplus food, household items, or products. Requires registration, contact verification, pickup location, and safety agreement acceptance.

### 3.3 Business Donor
A restaurant, bakery, grocery store, farm, manufacturer, wholesaler, or other commercial entity. Requires registration, business information, pickup location, public-information-based verification, and safety agreement acceptance.

### 3.4 Organization Donor
A nonprofit, religious institution, school, or other organization that also generates surplus and wishes to donate. Similar onboarding to business donor with appropriate category.

### 3.5 Distribution Partner (Organization)
A food bank, shelter, NGO, community organization, school, religious organization, or disaster-relief body that receives and redistributes donations at scale. Requires registration, organizational verification, and approval.

### 3.6 Admin
Platform staff with access to the admin dashboard. Manages verification, moderation, reports, and operations. Cannot modify impact statistics.

### 3.7 Super Admin
Senior platform staff with access to all admin capabilities plus platform configuration, admin user management, and emergency mode controls.

---

## 4. Platform Overview

### 4.1 What the Platform Does

1. Donors list available surplus food or products with location and details.
2. Recipients discover nearby available listings without an account.
3. Recipients request a temporary single-use pickup code.
4. Recipients travel to the donor's location.
5. The donor scans or enters the code to verify the recipient.
6. The donor confirms the actual items and quantities handed over.
7. Inventory is reduced atomically.
8. Impact is recorded as a completed transaction.
9. A 4-hour cooldown begins for that recipient with that specific donor.

### 4.2 What the Platform Does NOT Do

- Ship or transport items (future logistics module planned)
- Guarantee availability (inventory is live)
- Validate recipient identity or means
- Require business registration certificates during normal onboarding
- Expose recipient location to donors
- Allow inventory to go negative
- Allow reuse of pickup tokens
- Collect unnecessary personal information

---

## 5. Technology Stack

### 5.1 Decision
The workspace is empty. No prior stack exists. The following stack is approved:

| Layer | Technology | Rationale |
|-------|------------|-----------|
| Frontend | HTML5 + Tailwind CSS + Vanilla JS | Simple, fast, no build overhead for basic pages |
| Backend | Node.js + Express | Widely understood, large ecosystem, beginner-accessible |
| Database | PostgreSQL | Production-grade relational DB, strong JSON support, PostGIS for geo |
| Geo Extension | PostGIS | Industry standard for geographic queries |
| Auth | JWT (access + refresh tokens) with bcrypt password hashing | Stateless, mobile-friendly |
| Maps | Leaflet.js + OpenStreetMap (default) | Free, open, configurable to swap providers |
| Geocoding | Nominatim (default, configurable) | Free baseline; swap to Google/Mapbox per region |
| QR Generation | qrcode npm library (server-side) | No external dependency |
| Email | Nodemailer + configurable SMTP | Provider-independent |
| SMS | Pluggable provider interface (Twilio/Africa's Talking adapters) | Not locked in |
| File Storage | Local filesystem (MVP) → S3-compatible API | Abstracted behind a storage service |
| Environment | dotenv | Standard Node.js config |
| Process Manager | PM2 | Production Node.js lifecycle |
| Reverse Proxy | Nginx | HTTPS, rate limiting, static assets |

### 5.2 Architecture Pattern
- Monorepo: `frontend/` and `backend/` directories
- RESTful API between frontend and backend
- Backend is stateless and horizontally scalable
- All secrets in environment variables never in source code
- Database migrations using a migration tool (db-migrate or similar)

---

## 6. Supported Donation Categories

### Food & Beverages
- Prepared meals
- Baked goods
- Fresh produce
- Packaged / non-perishable
- Dairy
- Meat / fish (frozen or chilled)
- Beverages
- Baby food / infant formula

### Household & Consumer
- Personal hygiene products
- Cleaning supplies
- Baby/infant supplies
- Clothing
- Household items

### Agricultural
- Farm surplus produce
- Seeds (where appropriate)

### Emergency / Disaster
- Emergency rations
- Water
- Medical supplies (non-prescription only)

Categories are stored as configurable data in the database, not hardcoded.

---

## 7. Platform Lifecycle States

### Donation Listing States
```
DRAFT → PENDING_REVIEW → ACTIVE → LOW_STOCK → CLAIMED → EXPIRED → REMOVED
```

| State | Meaning |
|-------|---------|
| DRAFT | Saved but not yet submitted |
| PENDING_REVIEW | Submitted, awaiting admin approval (flagged donors, new business donors) |
| ACTIVE | Publicly visible and available |
| LOW_STOCK | < 20% original quantity remaining |
| CLAIMED | All inventory assigned (but pickup may not be complete) |
| EXPIRED | Past use-by/pickup deadline automatically removed from public view |
| REMOVED | Admin-removed or donor-removed |

### Pickup Transaction States
```
PENDING → CODE_ISSUED → ARRIVED → CONFIRMED → COMPLETED → CANCELLED → EXPIRED
```

### Donor Account States
```
PENDING → CONTACT_VERIFIED → ACTIVE → WARNED → SUSPENDED → BANNED
```
Note: `CONTACT_VERIFIED` is the verification level, not a standalone account status. Account `status` field values are: `PENDING | ACTIVE | WARNED | SUSPENDED | BANNED | DELETED`. The `verification_level` field on the `donors` table tracks: `PENDING | CONTACT_VERIFIED | LOCATION_VERIFIED | BUSINESS_VERIFIED | TRUSTED_DONOR`. See verification-policy.md for full details.

### Organization States
```
PENDING → UNDER_REVIEW → APPROVED → ACTIVE → SUSPENDED |
```

---

## 8. Globalization Requirements

- All timestamps stored as UTC in the database
- All dates displayed in the user's local timezone
- UI language determined by browser locale (i18n strings in JSON files)
- Address format adapts to country
- Measurement units configurable per region (kg/lb, km/miles)
- No country-specific logic hardcoded in application code
- Country and region stored on all location records
- Platform supports RTL languages (CSS logical properties from day one)
- Phone number handling via E.164 format

---

## 9. Accessibility Requirements

- WCAG 2.1 AA minimum compliance
- All interactive elements keyboard-accessible
- Screen-reader-compatible semantic HTML
- Color contrast ratios meet AA standards
- Font sizes readable at default zoom on mobile
- No information conveyed by color alone
- Alt text on all meaningful images
- Forms have associated labels

---

## 10. Performance Requirements

| Metric | Target |
|--------|--------|
| LCP | < 2.5s on 4G |
| TTI | < 3.5s on 4G |
| CLS | < 0.1 |
| API response (read) | < 300ms p95 |
| API response (write) | < 500ms p95 |
| Map load | < 2s |
| Works on 3G | Yes core flow must complete |
| Works with JS disabled | Read-only content visible (graceful degradation) |

---

## 11. Design Principles

The visual design must feel:

- **Trustworthy** this is a nonprofit handling food safety
- **Human** not cold SaaS
- **Modern** but not trendy; built to last
- **Accessible** for all literacy levels globally
- **Global** no single-country cultural references
- **Professional** grant-maker facing as well as recipient-facing

Avoid:
- Generic dashboard/SaaS aesthetics
- Glowing or neon buttons
- Excessive animations
- Stock photography clichés

Color palette will center on warm, grounded, natural tones (greens, earth tones) conveying food, nature, community.

---

## 12. Legal and Compliance Considerations

- Platform is a facilitator, not a food vendor Good Samaritan laws apply in many jurisdictions
- Donors explicitly accept liability for accurate descriptions and food safety
- Platform Terms of Service and Donor Agreement required before any donor can list
- Privacy Policy required GDPR-compatible by default
- Data retention policy defined in privacy-model.md
- No PII logged in application logs
- Audit logs stored separately from application database

---

## 13. Phase Roadmap Summary

| Phase | Focus | Output |
|-------|-------|--------|
| 0 | Specification | All docs in `docs/` |
| 1 | Foundation | Project scaffold, server running |
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
