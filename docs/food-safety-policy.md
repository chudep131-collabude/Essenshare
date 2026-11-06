# Food Safety Policy
# Global Surplus Redistribution Platform

**Version:** 1.0  
**Date:** October 2026  
**Status:** Phase 0 Approved

---

## 1. Purpose

The platform facilitates the redistribution of surplus food. Food safety is non-negotiable. This policy defines:
- What donors must agree to before listing food
- What information donors must provide
- What the platform will and will not do regarding safety enforcement
- How safety concerns are reported and handled
- How the platform protects recipients from unsafe donations

---

## 2. Donor Safety Agreement

Every donor must accept the following agreement before they can post any donation. The agreement is shown in full at onboarding and the timestamp, version, and user ID are recorded.

---

### Donor Safety Agreement v1.0

> **I confirm that:**
>
> 1. The items I am donating are safe, fit for their intended use, and suitable for distribution to members of the public.
>
> 2. I will not knowingly distribute food or products that are spoiled, contaminated, improperly stored, past their use-by date, subject to a recall, or otherwise unsafe or prohibited from distribution.
>
> 3. The information I provide about my donation including descriptions, quantities, allergens, storage requirements, and use-by dates is accurate to the best of my knowledge.
>
> 4. I understand that recipients may include people with dietary needs, allergies, or medical conditions, and I take that responsibility seriously.
>
> 5. I accept that the platform is a facilitator and not responsible for the safety of food or products I list. I bear sole responsibility for items I choose to distribute.
>
> 6. I understand that deliberately providing false or misleading safety information may result in my account being suspended or permanently banned, and may have legal consequences.
>
> 7. I will remove or update my listing immediately if I become aware that any item may be unsafe.

---

## 3. Required Listing Fields by Category

### 3.1 All Food Donations

| Field | Required | Notes |
|-------|----------|-------|
| Category | Yes | From predefined list |
| Description | Yes | Plain text, min 20 chars |
| Items + quantities | Yes | At least one item |
| Use-by / best-before date | Yes | Must not be in the past |
| Storage requirement | Yes | ROOM_TEMP / REFRIGERATED / FROZEN |
| Pickup deadline | Yes | Must be ≤ use-by date |
| Condition | Yes | FRESHLY_MADE / DAY_OLD / NEAR_EXPIRY / FROZEN_SURPLUS |

### 3.2 High-Risk Food Categories

These categories require additional fields:

**Prepared Meals / Cooked Food:**
| Field | Required |
|-------|----------|
| Preparation date + time | Yes |
| Ingredients or description | Yes |
| Allergens (multi-select) | Yes |
| Reheat/serving instructions | Recommended |

**Meat / Fish / Poultry:**
| Field | Required |
|-------|----------|
| Preparation date | Yes |
| Storage (must be REFRIGERATED or FROZEN) | Yes |
| Whether raw or cooked | Yes |
| Allergens | Yes |

**Dairy:**
| Field | Required |
|-------|----------|
| Use-by date | Yes |
| Storage (must be REFRIGERATED) | Yes |
| Allergens (dairy declared by default) | Yes |

**Baby Food / Infant Formula:**
| Field | Required |
|-------|----------|
| Use-by date | Yes |
| Brand and product name | Yes |
| Age range | Yes |
| Unopened/sealed status | Yes |

### 3.3 Non-Food Donations

| Field | Required | Notes |
|-------|----------|-------|
| Category | Yes | From predefined list |
| Description | Yes | Condition, any relevant notes |
| Items + quantities | Yes | |
| Condition | Yes | NEW / GOOD / FAIR |
| Any hazardous material warning | If applicable | |

---

## 4. Allergen Disclosure

For all food donations:

Allergens must be declared using the following standardized list (based on major international allergen regulations):
- Gluten (wheat, rye, barley, oats)
- Crustaceans
- Eggs
- Fish
- Peanuts
- Soybeans
- Milk / Dairy
- Nuts (specify: almonds, cashews, hazelnuts, walnuts, pecans, pistachios, macadamia, Brazil nuts)
- Celery
- Mustard
- Sesame
- Sulphur dioxide / Sulphites
- Lupin
- Molluscs

Donors select all that apply. If the listing contains items where allergens are uncertain, donors must note this in the description. The platform displays allergen information prominently on donation detail pages.

---

## 5. Food Categories and Risk Levels

| Category | Risk Level | Notes |
|----------|------------|-------|
| Packaged / non-perishable | LOW | Sealed, factory-packaged goods |
| Baked goods (ambient) | LOW-MEDIUM | Day-old bread etc.; must be within use-by |
| Fresh produce | MEDIUM | Donor confirms condition |
| Beverages (sealed) | LOW | Sealed factory product |
| Prepared meals / cooked food | HIGH | Strict time requirements; must be < 4 hours after cooking or refrigerated |
| Meat / fish / poultry | HIGH | Must be refrigerated or frozen; detailed info required |
| Dairy | HIGH | Must be refrigerated; unopened |
| Baby food / infant formula | HIGH | Must be sealed and within use-by |
| Agricultural surplus (raw) | MEDIUM | Produce condition disclosed |
| Emergency rations | LOW-MEDIUM | Pre-packaged survival rations |

HIGH-risk categories trigger a safety reminder at listing creation: *"This is a high-risk food category. Please ensure all required safety information is accurate."*

---

## 6. What the Platform Prohibits

Donors may NEVER list:

- Food that the donor knows or suspects is unsafe or spoiled
- Food subject to an active product recall
- Medications of any kind (prescription or over-the-counter)
- Alcohol (may be restricted by local law configurable per region)
- Unpackaged raw meat or fish that cannot be maintained at safe temperatures until pickup
- Infant formula that has been opened or is past its use-by date
- Any substance that is illegal in the jurisdiction of distribution
- Products with intentionally misleading descriptions

If a listing is found to violate these prohibitions, it is removed immediately and the donor account is flagged for review.

---

## 7. Reporting an Unsafe Donation

Any person recipient, donor, or visitor can submit a safety report.

### 7.1 Report Categories (Food-Specific)

| Category | Description | Auto-Action |
|----------|-------------|-------------|
| `UNSAFE_FOOD` | Donor knowingly listed unsafe food, or recipient became ill | Immediately hide listing + alert admin |
| `SPOILED_OR_EXPIRED` | Food appears spoiled, moldy, or past use-by date | Hide listing if 2+ reports within 24h |
| `WRONG_ALLERGEN_INFO` | Allergen information is incorrect or missing | Flag for admin review |
| `WRONG_DESCRIPTION` | Items don't match the description | Flag for admin review |
| `COLD_CHAIN_CONCERN` | Refrigerated/frozen item not stored correctly | Flag for admin review; donor notified |
| `ALREADY_GONE` | Donation was gone when recipient arrived | Low severity; update listing status |

### 7.2 Submitting a Report

- No account required.
- Field: category (required), description (optional, max 500 chars).
- Submission creates a `REPORT` record with anonymous session ID.
- Confirmation shown: *"Thank you. Your report has been submitted and will be reviewed promptly."*
- Reporter is not shown report progress (to prevent targeted harassment of donors).

### 7.3 Auto-Actions

| Trigger | Action |
|---------|--------|
| Any `UNSAFE_FOOD` report | Immediately set listing status to `HIDDEN_PENDING_REVIEW`, notify admin (P1 priority) |
| 2+ `SPOILED_OR_EXPIRED` reports on same listing within 24h | Set listing status to `HIDDEN_PENDING_REVIEW`, notify admin |
| Single `SPOILED_OR_EXPIRED` | Flag listing with review badge; admin review within 4 hours |
| `WRONG_ALLERGEN_INFO` | Flag listing; donor notified to review |
| `HARASSMENT` report | Flag donor account; admin notified immediately |

### 7.4 Admin Review Process

1. Admin reviews the report details.
2. Admin inspects the listing and any photo evidence.
3. Admin makes one of these decisions:
   - **Reinstate:** report determined to be inaccurate; listing re-activated; report closed as `DISMISSED`.
   - **Remove:** listing confirmed unsafe or violating policy; listing status set to `REMOVED`.
   - **Escalate to donor action:** warn or suspend donor in addition to removing listing.
4. All decisions recorded in AUDIT_LOGS.

---

## 8. Donor Consequence Ladder

| Event | Consequence |
|-------|-------------|
| First valid safety report (LOW/MEDIUM) | Warning issued, donor notified |
| Second valid safety report within 60 days | Second warning; listing removed; trust score reduced |
| Third valid safety report within 90 days | Account suspended pending review |
| Verified UNSAFE_FOOD report (any) | Immediate suspension; Super Admin review required to reinstate |
| Confirmed deliberate unsafe food distribution | Permanent ban |
| Recipient illness caused by listed food | Permanent ban; regulatory notification if required |

"Valid" means the report has been reviewed and confirmed by an admin. False reports do not penalize the donor.

---

## 9. Platform Liability Statement

The platform makes no warranty regarding the safety of any food or product listed by donors. The platform:
- Facilitates connections between donors and recipients
- Requires donors to agree to the Donor Safety Agreement
- Operates a reporting system to remove unsafe listings
- Is not a food retailer or distributor
- Does not inspect food before redistribution

This statement is included in the platform Terms of Service and displayed on the About page and Safety Policy public page.

---

## 10. Good Samaritan Law Reference

In many jurisdictions, good-faith food donors are protected from civil liability when donating food in good faith. Examples:
- USA: Bill Emerson Good Samaritan Food Donation Act (1996)
- UK: No specific act but covered under common law
- EU/Canada/Australia: Similar protections in various jurisdictions

The platform's Terms of Service reference this principle and encourage donors to donate surplus rather than discard it, while maintaining the responsibility for accurate and honest listings.

The platform recommends donors consult local Good Samaritan laws. The platform does not provide legal advice.

---

## 11. Cold Chain Guidance

For donors listing refrigerated or frozen items:

**Refrigerated items (2–8°C):**
- Must remain refrigerated until shortly before pickup
- Pickup window should be maximum 2 hours after removal from refrigeration (unless donor can provide refrigeration at pickup point)
- Listing must specify: pickup must occur within [donor-defined] hours of collection

**Frozen items:**
- Must remain frozen until donor confirms readiness for pickup
- Donor must note if items can be collected frozen (recipient responsible for transport)
- Donor must NOT refreeze thawed items

**Platform enforcement:**
- Pickup deadline for refrigerated/frozen items is limited to 4 hours from listing creation (configurable) unless donor specifies they have refrigeration at the pickup point.
- Admin can review listings flagged as refrigerated with excessively long pickup windows.
