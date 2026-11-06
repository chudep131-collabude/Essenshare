# Business Rules
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Inventory Rules

### 1.1 Inventory Integrity
- Inventory may NEVER go below zero.
- Every inventory reduction must be the result of a confirmed donor handover stored in a PICKUP_TRANSACTION record with status COMPLETED.
- Inventory is reduced atomically using database transactions with appropriate locking to prevent race conditions.
- A recipient requesting a pickup code does NOT reduce inventory. Only a confirmed handover does.

### 1.2 Reservation During Pickup
- When a pickup code is issued, the quantity requested is soft-reserved (status: RESERVED) against the listing.
- If the code expires without a confirmed handover, the reservation is released and inventory returns to AVAILABLE.
- If the recipient cancels, the reservation is released immediately.
- Multiple active reservations can exist simultaneously up to the total available inventory.
- Available inventory for display = total quantity − all active RESERVED quantities.

### 1.3 Partial Handovers
- A donor may confirm a smaller quantity than originally reserved (e.g. only 3 loaves remain instead of the 5 requested).
- Inventory is reduced only by the confirmed quantity.
- The unreserved remainder is returned to available inventory.

### 1.4 Listing Status Transitions
- DRAFT → ACTIVE: donor submits listing; individual donors are auto-activated; business donors may require review.
- ACTIVE → LOW_STOCK: automatically when remaining inventory falls below 20% of original quantity.
- ACTIVE/LOW_STOCK → EXPIRED: automatically when the pickup_deadline timestamp passes.
- ACTIVE/LOW_STOCK → CLAIMED: automatically when all inventory has active reservations.
- Any status → REMOVED: admin or donor manually removes the listing.
- REMOVED listings are never shown publicly.
- EXPIRED listings are never shown publicly.
- Inventory reductions on EXPIRED listings are blocked; any pending codes against an expired listing are invalidated.

---

## 2. Pickup Rules

### 2.1 Code Issuance
- A pickup code is issued only when:
  a) The listing is in ACTIVE or LOW_STOCK state.
  b) Remaining available inventory (after active reservations) is ≥ 1 unit (or the minimum requested quantity).
  c) The recipient's session is not in a 4-hour cooldown with this donor.
- A code is always single-use.
- A code has a configurable expiry (default: 60 minutes).
- A code is cryptographically random (minimum 128-bit entropy via `crypto.randomBytes`).
- A code is stored hashed in the database; only the plaintext is shown to the recipient.
- One recipient session may hold at most one active code per listing at a time.

### 2.2 Code Validation
- On validation attempt:
  a) Code must exist in the database (matched by hash).
  b) Code must have status ACTIVE (not USED, EXPIRED, or CANCELLED).
  c) Code must not be past its expiry timestamp.
  d) Code must match the listing ID it was issued for.
- Failed validation is logged in the audit trail.
- Three failed code validation attempts from the same donor in 10 minutes generates an admin alert.

### 2.3 Code Lifecycle
| Status | Meaning |
|--------|---------|
| ACTIVE | Issued, not yet used or expired |
| USED | Successfully validated and handover confirmed |
| EXPIRED | Expiry timestamp passed before use |
| CANCELLED | Recipient or system cancelled before use |

- Once USED, a code can never be reactivated or reused.
- Once EXPIRED or CANCELLED, a new code may be requested (subject to cooldown and inventory).

### 2.4 Handover Confirmation
- Only the authenticated donor account that owns the listing can confirm a handover.
- The donor must confirm actual items and quantities given.
- The system records exactly what was confirmed not what was originally listed.
- Inventory is updated based on confirmed quantities, not requested quantities.
- A handover cannot be confirmed on a listing that is EXPIRED or REMOVED.

---

## 3. Cooldown Rules

### 3.1 Same-Donor Cooldown
- After a successful handover (PICKUP_TRANSACTION status becomes COMPLETED), a 4-hour cooldown begins between the recipient session and the specific donor account.
- The cooldown is tied to the recipient's session identifier and the donor's account ID.
- The cooldown starts at the timestamp of handover confirmation, not at code issuance.
- During the cooldown, the recipient cannot receive a new pickup code from the same donor.
- The recipient CAN receive codes from different donors at any time, including during cooldown.

### 3.2 Cooldown Storage
- Stored as a COOLDOWN record: `{ recipient_session_id, donor_id, started_at, expires_at }`.
- Expiry checked server-side; never trusted from the client.
- Multiple cooldowns may exist simultaneously for the same recipient session (one per donor previously used within 4 hours).

### 3.3 Cooldown Expiry
- After 4 hours, the cooldown record is marked expired (or deleted by scheduled cleanup).
- Recipient may immediately request a new code from that donor after expiry.

### 3.4 Cooldown Bypass Prohibition
- No mechanism in the platform shall allow a recipient to bypass the cooldown for the same donor.
- Admin accounts cannot override or clear individual cooldowns (by policy).
- If a genuine exception is needed, it requires Super Admin action and audit log entry.

---

## 4. Expiration Rules

### 4.1 Donation Listing Expiry
- Every listing must have a `pickup_deadline` timestamp set by the donor.
- The system runs a scheduled job (every 5 minutes or via DB-level trigger) to mark listings as EXPIRED when `pickup_deadline < NOW()`.
- Listings without a pickup deadline may be set with a maximum default (e.g. 7 days) configurable per donation category.
- Expired listings are removed from public search immediately.
- Any active pickup codes tied to an expired listing are automatically invalidated (status: CANCELLED).
- Recipients with active codes for an expired listing receive notification: "This donation is no longer available."

### 4.2 Food-Specific Expiry
- For food categories, the `use_by_date` field is separate from `pickup_deadline`.
- A listing where `use_by_date < NOW()` is automatically flagged as EXPIRED regardless of donor-set deadline.
- Donors are notified when their listing is within 2 hours of use-by or pickup deadline.

### 4.3 Pickup Code Expiry
- Default expiry: 60 minutes after issuance (configurable per environment).
- A new code can be requested after expiry if inventory remains and cooldown has not triggered.

---

## 5. Donor Verification Rules

### 5.1 Individual Donor
- Status progression: PENDING → CONTACT_VERIFIED → ACTIVE
- CONTACT_VERIFIED requires: email verified AND phone verified.
- ACTIVE status granted automatically upon CONTACT_VERIFIED.
- Can post donations immediately.

### 5.2 Business Donor
- Status progression: PENDING → CONTACT_VERIFIED → BUSINESS_VERIFIED → ACTIVE
- CONTACT_VERIFIED: email + phone verified.
- BUSINESS_VERIFIED: passed public-information verification.
- Auto-verification pathway: domain match between email and website URL (e.g. `@bestbakery.com` matches `bestbakery.com`).
- Manual verification pathway: Admin reviews public sources when auto-verification is inconclusive.
- A business account may begin posting at CONTACT_VERIFIED status with the first 3 listings subject to admin review before going live.
- After BUSINESS_VERIFIED: listings go live without admin review (unless flagged by reports).

### 5.3 Verification Levels
| Level | Meaning | Granted When |
|-------|---------|-------------|
| CONTACT_VERIFIED | Email + phone confirmed | Both OTPs validated |
| LOCATION_VERIFIED | Pickup location confirmed at a geo level | Geocoding returns valid coordinates for address |
| BUSINESS_VERIFIED | Business identity confirmed via public info | Auto or manual verification passes |
| TRUSTED_DONOR | Long-term track record | ≥ 20 completed pickups, 0 suspensions, ≥ 90 days active |

### 5.4 Verification Downgrade
- A TRUSTED_DONOR status can be removed if a valid safety report leads to suspension.
- Downgrade is logged in trust history with reason and admin ID.

---

## 6. Trust Rules

### 6.1 Trust Score Components
A donor's trust score is a computed integer (0–100) based on:
- Completed pickups (positive weight)
- Age of account in days (positive weight, logarithmic)
- Safety reports received (negative weight, proportional to severity)
- Warnings issued (negative weight)
- Suspensions received (heavy negative weight)
- Cancelled donations by donor (mild negative weight)

### 6.2 Trust Score Thresholds
| Score | Trust Level | Behavior |
|-------|-------------|---------|
| 80–100 | TRUSTED | Eligible for TRUSTED_DONOR badge; listings auto-approved |
| 50–79 | STANDARD | Normal platform behavior |
| 25–49 | CAUTION | New listings may be held 15 min for automated review |
| 0–24 | AT_RISK | New listings require manual admin approval |

### 6.3 Trust History
- Every event affecting trust is recorded in TRUST_HISTORY with: donor ID, event type, delta, reason, timestamp, admin ID (where applicable).
- Trust history is immutable events cannot be deleted or modified.

---

## 7. Report Rules

### 7.1 Who Can Report
- Any user (including recipients without accounts) can submit a safety report on a listing.
- Reports are tied to a listing ID, not necessarily to the reporter's identity.
- Anonymous reporting is allowed to protect recipient dignity and safety.

### 7.2 Report Categories
| Category | Severity | Auto-Action |
|----------|----------|-------------|
| UNSAFE_FOOD | CRITICAL | Immediately hide listing, alert admin |
| SPOILED_OR_EXPIRED | HIGH | Hide listing within 5 minutes if unreviewed |
| WRONG_DESCRIPTION | MEDIUM | Flag for review |
| ALREADY_GONE | LOW | No auto-action; update listing status after threshold |
| DONOR_MISCONDUCT | MEDIUM | Flag donor account for review |
| HARASSMENT | HIGH | Flag donor + alert admin immediately |
| OTHER | LOW | Queue for review |

### 7.3 Report Processing
- All reports create an immutable REPORT record with: listing ID, report category, description, timestamp, reporter session (anonymized), status.
- Reports with severity CRITICAL trigger: immediate listing status change to HIDDEN_PENDING_REVIEW + admin notification.
- Reports with severity HIGH trigger: auto-hide if 2+ reports within 24 hours OR single report confirmed critical.
- Admin must review and either: reinstate listing, remove listing, or escalate to donor action.

### 7.4 Report Audit Trail
- Every action taken on a report (hide, reinstate, warn, suspend, close) is recorded in AUDIT_LOGS.
- Reports cannot be deleted.

---

## 8. Suspension Rules

### 8.1 Warning Procedure
1. Admin issues warning with written reason.
2. Warning stored in TRUST_HISTORY.
3. Donor receives email notification.
4. Warning affects trust score.
5. Two warnings within 60 days triggers automatic escalation for admin review.

### 8.2 Suspension Procedure
1. Admin suspends account with reason.
2. Status changes to SUSPENDED.
3. All active listings immediately hidden (not deleted).
4. All active pickup codes invalidated.
5. Donor cannot log in or create new listings.
6. Donor receives notification with reason.
7. Suspension logged in AUDIT_LOGS.

### 8.3 Ban Procedure
1. Super Admin (or Admin with approval) bans account.
2. Status changes to BANNED.
3. Account permanently deactivated.
4. Email address and phone added to ban registry (cannot register new account with same contact).
5. All listings permanently removed.
6. Ban logged in AUDIT_LOGS with reason and authorizing admin ID.

### 8.4 Appeals
1. Suspended (not banned) donors may submit an appeal via email or in-app form.
2. Appeal creates a record in the admin queue.
3. Admin reviews appeal and either lifts suspension or maintains it.
4. Appeal decision recorded in AUDIT_LOGS.
5. Banned accounts cannot appeal via the platform (must contact platform administration directly).

---

## 9. Organization Allocation Rules

### 9.1 Eligibility
- Only accounts with role ORGANIZATION and status ACTIVE may request allocations.
- Organizations can request quantities greater than what a standard recipient pickup allows.

### 9.2 Allocation Request
- Organization selects a listing.
- Requests a quantity (up to available inventory).
- Donor receives notification and must confirm or decline.
- On confirmation: inventory reserved for organization.
- Organization receives single-use pickup authorization (bulk pickup code or scheduled pickup).

### 9.3 Large Allocation Workflow
- Allocations > 50% of a listing's total inventory require donor explicit confirmation.
- Allocations that span multiple listings require separate requests per listing.
- Future: transport partner integration (Phase 11 logistics module).

### 9.4 Allocation Inventory Rules
- Same atomic transaction rules apply as individual pickups.
- Inventory cannot go negative regardless of allocation size.
- Partial fulfillment is allowed: if 50 kg requested but only 40 kg available, donor may confirm 40 kg.

---

## 10. Location and Privacy Rules

### 10.1 Donor Location (Public)
- Donor pickup address is visible to recipients (they need to travel there).
- Pickup address is visible on the map as a pin.
- Street-level address is displayed on donation detail screen.
- Donor's personal residential address is not displayed; only the designated pickup location.

### 10.2 Recipient Location (Private)
- Recipient location is used only for nearby search, entirely client-side where possible.
- GPS coordinates are sent to the server only for the search query (bounding box / radius).
- Coordinates are not stored in the database linked to a session.
- Server-side search accepts: latitude, longitude, radius returns nearby listings. Coordinates are not logged.
- Donors never see where a recipient is located.

### 10.3 Approximate Distance
- Recipients see approximate distance to listings (e.g. "0.4 km").
- Distance is calculated server-side from the submitted search coordinates.
- The exact recipient coordinates are not returned in API responses.

---

## 11. Notification Rules

### 11.1 Required Notifications (MVP)
| Event | Recipient of Notification | Channel |
|-------|--------------------------|---------|
| Email verification | Donor / Org | Email |
| Phone verification | Donor / Org | SMS |
| Account approved | Org | Email |
| Account suspended | Donor / Org | Email |
| Listing going live | Donor | Email |
| Listing expiring soon | Donor | Email |
| Pickup code issued | Recipient (if email provided) | Email |
| Pickup confirmed | Recipient (if email provided), Donor | Email |
| Safety report received | Admin | Internal alert |
| Safety report action | Donor (if listing hidden/removed) | Email |
| Warning issued | Donor | Email |
| New allocation request | Donor | Email |
| Allocation confirmed | Organization | Email |
| New application | Admin | Internal alert |

### 11.2 Notification Principles
- All notification sending is abstracted behind a NotificationService interface.
- Business logic never imports the email/SMS provider directly.
- Each notification type is a named event with a payload; the NotificationService routes to the correct channels.
- Recipients without accounts receive notifications only if they voluntarily provide contact info.

---

## 12. Emergency Mode Rules

### 12.1 Activation
- Emergency mode is activated by a Super Admin.
- Activation requires a named emergency event (e.g. "Flood Nairobi Region, October 2026").
- Emergency mode affects only the specified geographic region(s).

### 12.2 Emergency Mode Behavior
- Listings in the affected region are prioritized in search results.
- Organization allocation limits are relaxed for verified disaster-relief organizations.
- Minimum verification requirements for new distribution partners in the region are expedited.
- Emergency donations can be tagged with `emergency_flag = true` for fast-track review.
- Cooldown rules remain in force (cannot be waived in emergency mode).
- Safety rules remain in force.

### 12.3 Emergency Mode Deactivation
- Deactivated by Super Admin.
- All emergency-mode overrides automatically revert.
- Emergency event and duration recorded in AUDIT_LOGS.

---

## 13. Impact Calculation Rules

### 13.1 What Counts
Only records with PICKUP_TRANSACTION status = COMPLETED are counted in impact statistics.

### 13.2 Formulas
| Metric | Formula |
|--------|---------|
| Total pickups | COUNT(PICKUP_TRANSACTIONS WHERE status = COMPLETED) |
| Meals redistributed | SUM(pickup_items.quantity * item.meals_per_unit) WHERE meals_per_unit is defined |
| Kg redistributed | SUM(pickup_items.quantity * item.weight_kg) WHERE weight_kg is defined |
| Items redistributed | SUM(pickup_items.quantity) |
| Active donors | COUNT(DISTINCT donor_id) in completed transactions last 30 days |
| Partner organizations | COUNT(DISTINCT org_id) in completed transactions last 30 days |
| Countries reached | COUNT(DISTINCT country_code) in completed transactions |
| People reached | COUNT(DISTINCT recipient_session fingerprint) approximate, privacy-safe estimate |

### 13.3 Prohibitions
- No admin UI control to manually edit impact totals.
- No impact record can be created without a corresponding PICKUP_TRANSACTION record.
- Impact records are write-once never updated after creation.
- Impact statistics in the public dashboard are refreshed from the database on request (or cached with short TTL).
