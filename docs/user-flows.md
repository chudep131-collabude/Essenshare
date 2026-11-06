# User Flows
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## Overview

This document defines every user journey for each role on the platform. Each flow is described step-by-step with decision points, alternative paths, and screen references.

---

## 1. Recipient Flow

Recipients require NO account. The entire experience is frictionless and dignity-preserving.

### 1.1 Find and Collect a Donation (Primary Flow)

```
STEP 1 LAND ON PLATFORM
  User opens the platform URL on any device.
  Screen: Home / Find Food
  Primary CTA: "Find Food Near Me"

STEP 2 LOCATION PERMISSION
  Browser asks for location permission.
  ├── Granted → use GPS coordinates for nearby search
  └── Denied / Unavailable →
        Show: manual location entry field (city, postcode, or address)
        User enters location manually → geocode → proceed

STEP 3 NEARBY DONATIONS
  Screen: Nearby Donations (Map + List toggle)
  Displays: donation cards sorted by distance
  Each card shows:
    - Category icon
    - Title / description (brief)
    - Distance (e.g. "0.4 km away")
    - Quantity available
    - Pickup window / available until
    - Donor display name (no personal address details beyond map pin)
  Controls:
    - Toggle: Map / List view
    - Filter by: category, distance radius, dietary needs
    - Sort by: distance, most recent, quantity
  No login prompt on this screen.

STEP 4 VIEW DONATION DETAILS
  Screen: Donation Detail
  Shows:
    - Full description
    - Category, items, quantities
    - Allergen information (if food)
    - Storage / handling notes
    - Pickup location (map pin + street-level address)
    - Pickup hours / deadline
    - Donor display name and type (Individual / Business)
    - Approximate distance from user
  CTA: "Pickup Code"

STEP 5 RECEIVE PICKUP CODE
  System checks:
    ├── Is there remaining inventory? → Yes → proceed
    │   Is recipient in 4-hour cooldown with this donor? 
    │   ├── Yes → show: "You collected from this donor recently.
    │   │          Try again after [time]. Other donors are available."
    │   └── No → generate temporary single-use code
    └── No inventory → show: "This donation is no longer available."
  
  Screen: Your Pickup Code
  Shows:
    - Large QR code (scannable by donor)
    - Alphanumeric code (fallback if QR fails)
    - Donation name and pickup address
    - Code expiry time (e.g. "Valid for 60 minutes")
    - "Get Directions" button → opens native maps app
    - Safety note: "Only share this code with the donor at pickup"
  
  Code is:
    - Single-use
    - Time-limited (configurable; default 60 minutes)
    - Bound to: recipient session ID + donation listing ID
    - Not reusable after expiry or after successful scan

STEP 6 TRAVEL TO DONOR
  Screen: On My Way (persistent)
  Shows:
    - Pickup address
    - "Get Directions" → external navigation
    - Countdown timer on code expiry
    - Option to cancel (code invalidated, inventory released)
    - "I've arrived" (optional, informational only)

STEP 7 DONOR VERIFIES CODE
  At the donor's location:
    Donor opens their app → "Verify Pickup"
    Donor scans recipient's QR code OR enters alphanumeric code
    System validates:
      ├── Code exists and is active → proceed to handover
      ├── Code expired → show error to donor; recipient must request new code
      └── Code already used → show error; alert admin log

STEP 8 DONOR CONFIRMS HANDOVER
  Screen (Donor side): Confirm Handover
  Donor selects:
    - Which items they are giving
    - Actual quantities given (may differ from requested)
  Donor taps: "Confirm Handover"
  
  System (atomic transaction):
    - Marks pickup code as USED
    - Reduces inventory by confirmed quantities
    - Creates PICKUP_TRANSACTION record (status: COMPLETED)
    - Creates IMPACT_RECORD
    - Starts 4-hour same-donor cooldown for recipient session
    - Sends confirmation to recipient (if contact provided)

STEP 9 CONFIRMATION
  Screen (Recipient): Pickup Complete
  Shows:
    - "Pickup confirmed!"
    - Summary of items received
    - Option to report a problem
    - "Find more donations" button
  
  Screen (Donor): Handover Confirmed
  Shows:
    - "Handover recorded"
    - Items given + quantities
    - Remaining inventory
    - "Return to dashboard"
```

### 1.2 Alternative: Expired Code
```
Recipient arrives but code has expired (> 60 min):
  Screen: "Your code has expired"
  CTA: "Request a new code"
  System: old code invalidated, new code issued if inventory still available
  Cooldown does NOT start (no handover occurred)
```

### 1.3 Alternative: No Donations Nearby
```
Search returns 0 results:
  Screen: "No donations found near you right now"
  Shows:
    - Expand radius option
    - "Check back later" messaging
    - Option to enter email for notification when donations appear nearby
      (email stored only for this notification purpose, not for account creation)
```

### 1.4 Alternative: Recipient Cancels
```
Recipient taps "Cancel Pickup":
  Code invalidated
  Inventory reservation released
  Cooldown does NOT start
  Recipient may immediately request a new code from any donor
```

---

## 2. Individual Donor Flow

### 2.1 Registration and Onboarding

```
STEP 1 SIGN UP
  Screen: Register as a Donor
  Fields:
    - First name, Last name
    - Email address
    - Phone number
    - Password (confirm)
    - Account type: Individual
  CTA: "Create Account"

STEP 2 EMAIL VERIFICATION
  System sends verification email with 6-digit OTP or link.
  Screen: "Check your email"
  User enters OTP or clicks link.
  ├── Verified → proceed
  └── Expired → resend option

STEP 3 PHONE VERIFICATION (optional at MVP, required for higher trust)
  System sends SMS OTP.
  User enters code.
  Marks: PHONE_VERIFIED

STEP 4 PICKUP LOCATION
  Screen: Add Pickup Location
  Fields:
    - Address (autocomplete via geocoding API)
    - Unit / floor / building name (optional)
    - Pickup instructions (e.g. "Ring buzzer 3B")
    - Available hours (days + time ranges)
    - Landmark / notes
  Map pin appears for confirmation.
  User adjusts pin if needed.
  CTA: "Save Location"

STEP 5 SAFETY AGREEMENT
  Screen: Donor Safety Agreement
  Displays full text of the Donor Safety Agreement (see food-safety-policy.md).
  Checkbox: "I have read and agree to the Donor Safety Agreement"
  CTA: "I Agree Continue"
  Timestamp and version recorded on acceptance.

STEP 6 DONOR ACCOUNT ACTIVE
  Status: ACTIVE (Individual donors are auto-approved after contact verification)
  Screen: "You're ready to donate!"
  CTA: "Create Your First Donation"
```

### 2.2 Create a Donation

```
STEP 1 NEW DONATION
  Screen: Create Donation
  Fields:
    - Donation title (e.g. "Fresh bread loaves end of day")
    - Category (select from list)
    - Description (free text)
    - Items (add multiple):
        - Item name
        - Quantity
        - Unit (kg, portions, boxes, items, litres, etc.)
    - Photos (optional, up to 4)
    
  Food-specific fields (shown when food category selected):
    - Preparation / production date
    - Best before / use-by date
    - Storage requirements (room temp / chilled / frozen)
    - Allergens (multi-select checklist)
    - Ingredients or description
    - Condition (freshly made / day old / near expiry / frozen surplus)
  
  - Pickup available from (date/time)
  - Pickup available until (date/time or "while stock lasts")
  - Pickup location (from saved locations, or add new)
  - Any special instructions for pickup

STEP 2 REVIEW AND CONFIRM
  Screen: Review Donation
  Shows all fields for review.
  Safety reminder: "By posting this donation, you confirm it is safe."
  CTA: "Post Donation"

STEP 3 DONATION LIVE
  System:
    - Creates DONATION_LISTING record (status: ACTIVE)
    - Listing becomes publicly visible immediately (individual donors)
    - Business donors may require review see business flow
  Screen: "Your donation is live!"
  Shows: link to donation listing, share button
```

### 2.3 Manage Active Donations

```
Screen: My Donations (Donor Dashboard)
Lists all donations with status badges.
Actions per listing:
  - Edit (while no active pickups in progress)
  - Mark as Gone (manual close all pending codes invalidated)
  - Extend deadline
  - View pickup history
  - Report a problem with a recipient
```

### 2.4 Confirm a Pickup (Donor-side)

```
STEP 1 RECIPIENT ARRIVES
  Notification: "A recipient is on their way" (if push notifications enabled)
  
STEP 2 VERIFY CODE
  Screen: Verify Pickup Code
  Options:
    a) Tap "Scan QR" → open camera → scan
    b) Tap "Enter Code" → type alphanumeric code
  System validates code.

STEP 3 CONFIRM HANDOVER
  Screen: What are you giving?
  Shows items from the donation listing.
  Donor adjusts actual quantities given (defaults to requested).
  Donor taps "Confirm Handover".
  
STEP 4 COMPLETE
  Screen: "Handover recorded. Thank you!"
  Shows: updated inventory, total impact to date.
```

---

## 3. Business Donor Flow

### 3.1 Registration and Onboarding

```
STEP 1 SIGN UP AS BUSINESS
  Screen: Register as a Business Donor
  Fields:
    - Business name
    - Business category (restaurant / bakery / grocery / farm / manufacturer / wholesaler / other)
    - Contact person name
    - Business email
    - Phone number
    - Website (optional)
    - Social media profile URL (optional used for public verification)
    - Password (confirm)
  CTA: "Create Business Account"
  Note: No business registration certificate upload required.

STEP 2 EMAIL + PHONE VERIFICATION
  Same as individual donor.

STEP 3 PICKUP LOCATION
  Same as individual donor.
  Businesses may add multiple pickup locations.

STEP 4 SAFETY AGREEMENT
  Same as individual donor.
  Additional business-specific clause acknowledged.

STEP 5 PUBLIC VERIFICATION (automated where possible)
  System attempts to verify business via:
    - Website URL (domain match to email domain)
    - Google Maps / OSM business listing cross-reference
    - Social profile if provided
  Verification result:
    ├── Auto-verified → status: BUSINESS_VERIFIED → ACTIVE
    └── Cannot auto-verify → status: PENDING_REVIEW
        Admin reviews and either:
          - Approves (marks BUSINESS_VERIFIED)
          - Requests more information (sends message to business)
          - Rejects with reason

STEP 6 ACCOUNT ACTIVE
  Status: ACTIVE (CONTACT_VERIFIED at minimum; BUSINESS_VERIFIED after verification)
  Donations may be posted; first few may be held for review.
  Screen: "Your business account is active"
```

---

## 4. Organization (Distribution Partner) Flow

### 4.1 Registration and Onboarding

```
STEP 1 APPLY AS DISTRIBUTION PARTNER
  Screen: Register as Distribution Partner
  Fields:
    - Organization name
    - Organization type (food bank / shelter / NGO / school / religious org / disaster relief / community org)
    - Country and region
    - Contact person name + role
    - Email + phone
    - Organization website
    - Brief description of what they do and who they serve
    - Estimated people served per week/month
    - Service area (address / region)
    - Password (confirm)
  CTA: "Submit Application"

STEP 2 EMAIL + PHONE VERIFICATION
  Standard.

STEP 3 ADMIN REVIEW
  Application enters review queue.
  Admin checks:
    - Website / public information
    - Organization type legitimacy
    - Service area and coverage
  Admin approves or rejects (with reason).

STEP 4 APPROVED
  Status: ACTIVE
  Organization receives confirmation email.
  Access to organization dashboard.

STEP 5 BROWSE AND REQUEST ALLOCATIONS
  Screen: Available Donations (Organization View)
  Shows larger-quantity or organization-flagged listings.
  Organization can request bulk allocation.
  Donor confirms allocation.
  Organization receives pickup codes for their drivers/staff.
```

---

## 5. Admin Flow

### 5.1 Login

```
Screen: Admin Login
  - Email + password
  - Optional 2FA (TOTP)
  - Locked after 5 failed attempts
  - Session expires after 8 hours of inactivity
```

### 5.2 Admin Dashboard Overview

```
Screen: Admin Dashboard
Panels:
  - Today's pickups (count)
  - Pending verifications (count + quick-approve queue)
  - Active safety reports (count + urgency indicator)
  - New donor registrations (count)
  - New organization applications (count)
  - Platform health (error rate, active listings, total impact)
```

### 5.3 Donor Management

```
Screen: Donors
  - Search / filter donors
  - View donor profile
  - View donation history
  - View trust score and history
  - Issue warning
  - Suspend account (with reason)
  - Ban account (with reason)
  - Verify / upgrade verification level
  - View audit log for donor
```

### 5.4 Organization Management

```
Screen: Organizations
  - Review pending applications
  - Approve / reject with reason
  - View organization profile
  - Manage allocations
  - Suspend / reinstate
```

### 5.5 Donation Moderation

```
Screen: Donations
  - View all active listings
  - Search / filter by donor, category, status, flag
  - View individual listing
  - Hide listing (pending review)
  - Remove listing (with reason + notification to donor)
  - View flagged listings (auto-flagged by reports)
```

### 5.6 Report Handling

```
Screen: Safety Reports
  - List of open reports sorted by severity
  - View report details: reporter session, listing, description, timestamp
  - View associated audit trail
  - Take action: hide listing / warn donor / suspend donor / close report
  - All actions logged with admin ID + timestamp
```

### 5.7 Verification Queue

```
Screen: Verification
  - List of donors awaiting manual business verification
  - View submitted business information
  - Check public sources
  - Approve / request more info / reject
  - Notes field (admin-only)
```

### 5.8 Impact and Analytics

```
Screen: Impact
  - Real-time totals: pickups, items, kg, meals, donors, orgs, countries
  - Charts: pickups over time, categories, geographic distribution
  - Export: CSV for grant reporting
  - All figures derived from COMPLETED transactions only
  - No manual edit controls
```

### 5.9 Audit Logs

```
Screen: Audit Logs
  - Immutable log of all significant events
  - Filterable by: user, action type, entity, date range
  - Cannot be deleted or modified (read-only interface)
  - Export for compliance
```

---

## 6. Screen Inventory

### Public / Unauthenticated
| Screen | Path | Description |
|--------|------|-------------|
| Home | `/` | Landing + "Find Food" entry |
| Find Donations | `/find` | Map/list of nearby donations |
| Donation Detail | `/donations/:id` | Full listing details |
| Pickup Code | `/pickup/:token` | QR + code for recipient |
| On My Way | `/pickup/:token/travel` | Travel + countdown |
| Pickup Confirmed | `/pickup/:token/complete` | Post-handover confirmation |
| No Donations | `/find?empty=1` | Empty state with guidance |
| Impact | `/impact` | Public impact dashboard |
| About | `/about` | Mission and how it works |
| Safety Policy | `/safety` | Donor food safety policy |
| Privacy Policy | `/privacy` | User privacy policy |
| Terms | `/terms` | Terms of service |

### Donor (Authenticated)
| Screen | Path | Description |
|--------|------|-------------|
| Register | `/register` | Account creation |
| Login | `/login` | Donor/Org login |
| Verify Email | `/verify-email` | Email OTP entry |
| Onboarding | `/onboarding` | Step-by-step setup wizard |
| Donor Dashboard | `/dashboard` | Overview, active donations |
| Create Donation | `/donations/new` | New listing form |
| Edit Donation | `/donations/:id/edit` | Edit listing |
| Donation Detail (own) | `/donations/:id` | Own listing view with actions |
| Verify Pickup | `/verify` | QR scanner + code entry |
| Confirm Handover | `/verify/confirm` | Select items, confirm |
| Profile / Settings | `/settings` | Account settings |
| Pickup History | `/history` | Past pickups |

### Organization (Authenticated)
| Screen | Path | Description |
|--------|------|-------------|
| Org Dashboard | `/org/dashboard` | Overview and quick actions |
| Browse Donations | `/org/donations` | Filtered for org-relevant listings |
| Request Allocation | `/org/request/:id` | Bulk request form |
| My Allocations | `/org/allocations` | Pending and fulfilled |
| Profile | `/org/settings` | Org profile management |

### Admin (Authenticated)
| Screen | Path | Description |
|--------|------|-------------|
| Admin Login | `/admin/login` | Separate admin login |
| Dashboard | `/admin` | Overview panels |
| Donors | `/admin/donors` | Donor management |
| Organizations | `/admin/organizations` | Org management |
| Donations | `/admin/donations` | Listing management |
| Reports | `/admin/reports` | Safety reports |
| Verification | `/admin/verification` | Verification queue |
| Pickups | `/admin/pickups` | Transaction log |
| Users | `/admin/users` | All user accounts |
| Audit Logs | `/admin/audit` | Immutable event log |
| Impact | `/admin/impact` | Full analytics |
| Settings | `/admin/settings` | Platform configuration |
| Admin Users | `/admin/admins` | Super Admin only |
