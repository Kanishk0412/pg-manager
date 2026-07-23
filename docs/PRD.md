# PRODUCT & BUILD SPECIFICATION
# PG Manager
A white-label management platform for paying-guest, hostel and co-living properties

| Property | Value |
| --- | --- |
| **Reference property** | Riddhi Residency — 45 rooms |
| **Prepared for** | Build with Antigravity |
| **Document version** | 1.0 |
| **Date** | July 2026 |

**Purpose.** A complete, unambiguous build specification that an AI coding agent can implement end to end without further clarification. Save it in the repository as `/docs/PRD.md` and keep it as the single source of truth.

---

## Contents

0. How to use this document with Antigravity
1. Product summary
2. Assumptions made (override any of these before build starts)
3. Users and roles
4. Multi-tenant / white-label architecture
5. Data model
6. Functional modules
7. Screen inventory
8. Business rules and edge cases
9. API surface
10. Recommended tech stack
11. Security requirements
12. WhatsApp integration
13. Invoice and receipt PDF layout
14. Build phases
15. Seed data — Riddhi Residency
16. Acceptance checklist
17. Notes for selling this to other PGs

---

## 0. How to use this document with Antigravity

1. Save this file in your repo as `/docs/PRD.md`.
2. Give Antigravity this instruction to start:
   > Read `/docs/PRD.md`. Implement **Phase 1** only (Section 14). Do not start Phase 2 until I approve. Follow the exact data model in Section 5 and the exact business rules in Section 8.
3. After each phase, run the acceptance checklist for that phase (Section 16) before moving on.
4. Keep this file updated as the source of truth. When you change a rule, change it here first, then tell Antigravity to re-read it.

**Do not ask Antigravity to build all phases in one shot.** It will produce a shallow app. Phase-by-phase gives you a working product at every step.

---

## 1. Product summary

A web app for owners and managers of paying-guest (PG) / hostel / co-living properties to manage rooms, tenants, monthly billing, payment collection, and tenant communication over WhatsApp.

### The five problems it solves:

| Problem today | Solution in app |
| --- | --- |
| Physical bill receipts handed out manually | Auto-generated PDF invoice + receipt, delivered on WhatsApp |
| Repeated manual reminders on WhatsApp | Scheduled automatic reminders based on due date and payment status |
| No clarity on which room is empty | Live occupancy board, vacant/occupied/reserved per bed |
| No visibility of future bookings | Availability-on-date view that accounts for advance bookings and notice periods |
| Manual electricity + rent calculation | Enter meter units per room per month; bill computes automatically |

**Built as multi-tenant SaaS from day one** so the same codebase serves Riddhi Residency and every PG you sell to afterwards, with no code changes per customer.

---

## 2. Assumptions made (override any of these before build starts)

These are the defaults the spec is written against. If any are wrong, edit this section and tell Antigravity.

1. **Billing is per bed, not per room.** PGs are usually shared. A room has a capacity (1/2/3 sharing) and each bed can be rented separately. A room set to capacity 1 behaves exactly like room-level billing, so this covers both cases.
2. **Electricity is metered per room**, and when a room has multiple occupants the electricity amount is split equally between occupants active that month (configurable — see 8.4).
3. **Default electricity rate is ₹10 per unit**, editable per property and overridable on an individual reading.
4. **Billing cycle is calendar-month.** Bills generated on the 1st for the current month, due on the 5th.
5. **Rent for a partial month is pro-rated by days.**
6. **Payments are recorded by the manager** (cash / UPI / bank transfer). Online payment gateway is out of scope for Phase 1–5, added as an optional module later.
7. **Currency ₹ (INR), timezone Asia/Kolkata**, both stored per property so other currencies work later.
8. **WhatsApp sending goes through the Meta WhatsApp Cloud API or a BSP** (see Section 12). Automated sending is not possible through personal WhatsApp.

---

## 3. Users and roles

| Role | Scope | Can do |
| --- | --- | --- |
| `super_admin` | Platform (you) | Manage all organizations, plans, limits, impersonate for support |
| `owner` | One organization | Everything within their org: properties, staff, settings, billing config, financials |
| `manager` | Assigned properties | Rooms, tenants, bookings, meter readings, generate bills, record payments, send messages. Cannot change billing config or delete records |
| `accountant` | Assigned properties | Read-only on tenants/rooms. Full access to invoices, payments, reports, exports |
| `viewer` | Assigned properties | Read-only everything, no exports |

Tenants (the residents) do **not** log in in Phase 1–5. They receive everything on WhatsApp. An optional tenant self-service portal is listed in Section 17 as a future module.

---

## 4. Multi-tenant / white-label architecture

This is what makes the product sellable. Build it in from the first line of code — retrofitting multi-tenancy later is a rewrite.

### 4.1 Hierarchy
```
Organization (a PG business — the paying SaaS customer)
└── Property (a building, e.g. "Riddhi Residency")
    └── Room (e.g. "203")
        └── Bed (e.g. "203-A")
```
One organization can own several properties. Riddhi Residency = one organization with one property.

### 4.2 Hard rules
- Every table except `organizations` and `users` carries an `organization_id` column. Every query is scoped by it.
- Enforce scoping at the data-access layer (a repository/middleware wrapper), not by hoping each query remembers. If using Postgres, additionally enable **Row Level Security** with a policy on `organization_id`.
- **No hardcoded values anywhere.** No "45", no "10", no "Riddhi Residency", no "₹", no "5th of the month" in code. All of it comes from the property settings record.
- Tenant routing: path-based (`app.yourdomain.com/o/{org-slug}/...`) in Phase 1. Add custom subdomains later.

### 4.3 Per-property configuration (the white-label surface)
Everything below is editable in Settings by the owner, and is what makes a new PG customer self-serve:
- **Branding** - Property display name, legal/business name - Logo upload (appears on invoices, receipts, dashboard header) - Brand primary colour (hex) — used for app accent and PDF headers - Address, city, state, pincode, GSTIN (optional), contact phone, contact email
- **Billing** - Currency + symbol, timezone, locale - Electricity rate per unit (default 10) - Electricity split mode (`equal` / `by_days_occupied` / `primary_tenant` / `room_level`) - Bill generation day of month (default 1) - Payment due day of month (default 5) - Late fee: enabled y/n, type (`flat` / `percent`), amount, grace days - Pro-rate partial months: y/n (default yes) - Invoice number format and prefix, receipt number format and prefix - Tax: enabled y/n, name (GST/VAT), percent, applies-to (`rent` / `electricity` / `all`)
- **Charge heads (critical for resale)** A table of configurable recurring charges the property can define — the app must not assume only rent and electricity. Each charge head has: name, type (`recurring_monthly` / `one_time` / `usage_based`), default amount, taxable y/n, applies-to (`per_bed` / `per_room` / `per_tenant`), active y/n.
  Seed examples: Rent, Electricity, Food/Mess, WiFi, Laundry, Housekeeping, Maintenance, Late Fee, Security Deposit, Parking.
- **Room configuration** - Sharing types available and their labels (Single / Double / Triple / Four-sharing / custom) - Amenity list (AC, Attached Bathroom, Balcony, Geyser, Almirah, Study Table, Window — editable) - Floor labels (Ground, 1st, 2nd… or custom)
- **Notifications** - WhatsApp enabled y/n + credentials - Which automated messages are on (bill, reminder before due, receipt, overdue) - Reminder schedule (e.g. 3 days before due, on due date, 3 days after, 7 days after) - Quiet hours (no messages sent outside e.g. 09:00–20:00) - Message template text per event, with variable placeholders
- **Plan limits (enforced by super_admin)** - Max properties, max rooms, max users, WhatsApp messages per month, feature flags.

### 4.4 Onboarding wizard for a new PG customer
When a new organization signs up, a 5-step wizard runs.
1. **Business details** — org name, owner name, phone, email, password.
2. **Property details** — property name, address, logo, brand colour, currency.
3. **Room setup** — three options:
   - *Quick generate*: enter number of floors, rooms per floor, numbering pattern (e.g. `{floor}{01..15}`), default sharing type and rent -> generates all rooms and beds instantly.
   - *CSV import*: download template, fill, upload. Columns: `room_number`, `floor`, `sharing_type`, `capacity`, `rent_per_bed`, `amenities`, `meter_number`.
   - *Manual*: add rooms one by one.
4. **Billing setup** — electricity rate, bill day, due day, late fee, active charge heads.
5. **Tenant import** — CSV of existing tenants with room/bed assignment, or skip and add later.

---

## 5. Data model

Use PostgreSQL/SQLite. All IDs are UUID v4. All tables have `created_at`, `updated_at`, `created_by`, and soft delete via `deleted_at`.

### 5.1 Entity relationships
```
ORGANIZATION ──┬── PROPERTY ──┬── ROOM ──── BED ────┐
               │              │                     │
               │              ├── CHARGE_HEAD       │
               │              └── METER_READING     │
               │                                    │
               ├── USER                             │
               │                                    │
               └── TENANT ──── ALLOTMENT ───────────┘
                                   │
                                   └── INVOICE ──┬── INVOICE_LINE_ITEM
                                                 └── PAYMENT ──── RECEIPT
TENANT ──── NOTIFICATION_LOG
```

### 5.2 Tables
- `organizations`: `id`, `name`, `slug` (unique), `owner_user_id`, `plan` (`free`|`starter`|`pro`), `status` (`active`|`suspended`|`trial`), `trial_ends_at`, `max_properties`, `max_rooms`, `max_users`, `whatsapp_monthly_quota`, `created_at`
- `users`: `id`, `organization_id` (nullable for super_admin), `full_name`, `email` (unique), `phone`, `password_hash`, `role`, `status` (`active`|`invited`|`disabled`), `last_login_at`, `avatar_url`
- `user_property_access`: `id`, `user_id`, `property_id`
- `properties`: `id`, `organization_id`, `name`, `legal_name`, `code` (short code for invoice numbers, e.g. RIDDHI), `address_line1`, `address_line2`, `city`, `state`, `pincode`, `country`, `phone`, `email`, `gstin`, `logo_url`, `brand_color`, `currency_code`, `currency_symbol`, `timezone`, `locale`, `status` (`active`|`inactive`)
- `property_settings`: `id`, `property_id`, `electricity_rate_per_unit` (numeric, default 10), `electricity_split_mode` (enum), `bill_generation_day` (int, default 1), `payment_due_day` (int, default 5), `prorate_partial_month` (bool, default true), `late_fee_enabled` (bool), `late_fee_type` (`flat`|`percent`), `late_fee_amount` (numeric), `late_fee_grace_days` (int), `tax_enabled` (bool), `tax_name`, `tax_percent`, `tax_applies_to`, `invoice_prefix`, `invoice_next_number`, `receipt_prefix`, `receipt_next_number`, `notice_period_days` (default 30), `security_deposit_months` (default 1), `amenities_list` (jsonb), `sharing_types` (jsonb), `floor_labels` (jsonb), `whatsapp_enabled` (bool), `whatsapp_provider`, `whatsapp_credentials` (encrypted jsonb), `reminder_schedule_days` (jsonb, e.g. [-3, 0, 3, 7]), `quiet_hours_start`, `quiet_hours_end`
- `charge_heads`: `id`, `organization_id`, `property_id`, `name`, `code`, `type` (`recurring_monthly`|`one_time`|`usage_based`), `default_amount`, `applies_to` (`per_bed`|`per_room`|`per_tenant`), `is_taxable`, `is_active`, `sort_order`, `is_system` (true for Rent/Electricity/Late Fee which cannot be deleted)
- `rooms`: `id`, `organization_id`, `property_id`, `room_number` (unique per property), `floor`, `sharing_type`, `capacity` (int), `rent_mode` (`per_bed`|`per_room`), `default_rent` (numeric), `amenities` (jsonb array), `has_separate_meter` (bool, default true), `meter_number`, `is_active` (bool), `notes`
- `beds`: `id`, `organization_id`, `room_id`, `bed_label` (A, B, C…), `status` (`vacant`|`occupied`|`reserved`|`blocked`|`under_maintenance`), `current_allotment_id` (nullable), `is_active`
- `tenants`: `id`, `organization_id`, `property_id`, `full_name`, `phone` (E.164, e.g. +919812345678), `alternate_phone`, `email`, `date_of_birth`, `gender`, `photo_url`, `permanent_address`, `city`, `occupation`, `company_or_college`, `id_proof_type` (`aadhaar`|`pan`|`passport`|`driving_license`|`voter_id`|`other`), `id_proof_number`, `id_proof_file_url`, `emergency_contact_name`, `emergency_contact_phone`, `emergency_contact_relation`, `status` (`upcoming`|`active`|`on_notice`|`vacated`|`blacklisted`), `whatsapp_opt_in` (bool), `notes`
- `allotments`: `id`, `organization_id`, `property_id`, `tenant_id`, `room_id`, `bed_id`, `status` (`reserved`|`active`|`on_notice`|`vacated`|`cancelled`), `booking_date`, `move_in_date`, `expected_move_out_date`, `notice_given_date`, `actual_move_out_date`, `agreed_rent` (numeric), `security_deposit_amount`, `security_deposit_paid`, `security_deposit_refunded`, `security_deposit_deductions`, `booking_advance_amount`, `recurring_charges` (jsonb: `[{charge_head_id, amount}]`), `agreement_file_url`, `notes`
- `meter_readings`: `id`, `organization_id`, `property_id`, `room_id`, `billing_month` (date, first of month), `previous_reading` (numeric), `current_reading` (numeric), `units_consumed` (numeric, computed), `rate_per_unit` (numeric), `amount` (numeric, computed), `reading_date`, `reading_photo_url`, `entered_by_user_id`, `notes`. Unique constraint: `(room_id, billing_month)`
- `invoices`: `id`, `organization_id`, `property_id`, `invoice_number` (unique per property), `tenant_id`, `allotment_id`, `room_id`, `bed_id`, `billing_month` (date), `period_start`, `period_end`, `issue_date`, `due_date`, `subtotal`, `discount_amount`, `discount_reason`, `tax_amount`, `late_fee_amount`, `total_amount`, `amount_paid`, `balance_due`, `status` (`draft`|`sent`|`partially_paid`|`paid`|`overdue`|`cancelled`|`written_off`), `pdf_url`, `notes`, `sent_at`, `generated_by` (`auto`|`manual`)
- `invoice_line_items`: `id`, `invoice_id`, `charge_head_id`, `description`, `quantity`, `unit_price`, `amount`, `meta` (jsonb — e.g. meter reading details for electricity), `sort_order`
- `payments`: `id`, `organization_id`, `property_id`, `receipt_number` (unique per property), `tenant_id`, `invoice_id` (nullable), `amount`, `payment_method` (`cash`|`upi`|`bank_transfer`|`card`|`cheque`|`other`), `reference_number`, `paid_at` (datetime), `recorded_by_user_id`, `proof_file_url`, `receipt_pdf_url`, `status` (`recorded`|`reversed`), `reversal_reason`, `notes`
- `notification_logs`: `id`, `organization_id`, `property_id`, `tenant_id`, `channel` (`whatsapp`|`sms`|`email`), `event_type` (`invoice_created`|`payment_reminder`|`payment_receipt`|`overdue_notice`|`welcome`|`custom`), `template_name`, `recipient_phone`, `message_body`, `media_url`, `provider_message_id`, `status` (`queued`|`sent`|`delivered`|`read`|`failed`), `error_code`, `error_message`, `cost`, `related_type`, `related_id`, `scheduled_for`, `sent_at`, `retry_count`
- `message_templates`: `id`, `organization_id`, `property_id`, `event_type`, `channel`, `provider_template_name`, `body_text`, `variables` (jsonb), `is_active`
- `audit_logs`: `id`, `organization_id`, `user_id`, `action`, `entity_type`, `entity_id`, `before` (jsonb), `after` (jsonb), `ip_address`, `user_agent`, `created_at`

### 5.3 Required indexes
- `(organization_id)` on every scoped table
- `(property_id, billing_month)` on invoices and meter_readings
- `(tenant_id, status)` on invoices and allotments
- `(bed_id, status)` on allotments
- `(move_in_date, expected_move_out_date)` on allotments — powers availability queries
- `(status, due_date)` on invoices — powers the overdue job
- `(status, scheduled_for)` on notification_logs — powers the send queue

---

## 6. Functional modules

### 6.1 Rooms and room setup
- Room list view — table with filters (floor, sharing type, status, has vacancy) and columns: room number, floor, sharing, capacity, occupied/total beds, rent, current tenants, status chip.
- Occupancy board (default landing for managers) — visual grid grouped by floor. Bed dots: Green = vacant, Blue = occupied, Amber = reserved, Grey = blocked / under maintenance. Header stat strip: Total Rooms · Total Beds · Occupied · Vacant · Reserved · Occupancy %.
- Room detail drawer — bed-level detail, current tenants, upcoming bookings, meter readings history, quick actions.
- Add / edit / bulk-generate rooms / CSV import & export.
- Changing capacity: increasing adds beds (`A`, `B`, `C`). Decreasing removes vacant beds only; if occupied/reserved, block with error.
- Deactivating a room: allowed only if all beds are vacant.

### 6.2 Tenants
- Tenant list with search (name, phone, room), status filters.
- Add tenant form with all fields; ID proof and photo upload; phone validated to E.164 and checked for duplicates within property.
- Tenant detail page with tabs: Profile, Stay history, Invoices, Payments, Documents, Messages, Notes.

### 6.3 Allotment, booking, and vacating
- Assign tenant (immediate): Select tenant -> select room -> vacant bed -> move-in date -> agreed rent -> security deposit -> recurring charges -> confirm.
- Book for future: move-in date in future, booking advance. Date range overlap check.
- Availability on a date: recomputes bed status as of selected date.
- Give notice: record notice date, expected move-out = notice date + `notice_period_days`.
- Vacate: record actual move-out -> compute final settlement (pro-rated rent, final electricity, dues minus security deposit -> net payable/refundable).
- Transfer room: closes current allotment and opens new one.

### 6.4 Meter readings
- Monthly screen: billing month selector -> table for active rooms with separate meter.
- Previous reading auto-filled from last month. Validation: current >= previous (unless "meter reset/replaced"). Flag anomaly (>2x 3-month average).
- Bulk save and individual save.

### 6.5 Billing engine
- Generation day trigger or manual button.
- Preview table with missing meter reading warning.
- Line items: Rent (pro-rated if needed), Electricity (split per mode), recurring charges, one-time charges, discount, tax, late fee.
- Invoice numbering: `{invoice_prefix}-{property_code}-{YYYYMM}-{0001}` inside DB transaction lock.
- Idempotency: unique constraint `(allotment_id, billing_month)` where `status != cancelled`.

### 6.6 Payments and receipts
- Record payment from invoice, tenant page, or global modal.
- Receipt numbering: `{receipt_prefix}-{property_code}-{YYYYMM}-{0001}`.
- Partial payments, overpayment credit balance, reversal with mandatory reason.

### 6.7 WhatsApp automation
- Provider abstraction (`MetaCloudProvider` / `BspProvider` / Mock provider for dev).
- Templates: `pg_bill_generated`, `pg_payment_reminder`, `pg_payment_receipt`, `pg_overdue_notice`, `pg_welcome_tenant`, `pg_move_out_confirmation`.
- Quiet hours, deduplication, stop-on-payment, opt-out, retry queue.

### 6.8 Dashboard (last 3 months default)
- Row 1: KPI cards (Total Rooms, Total Beds, Occupied & Occupancy %, Vacant, Reserved, On Notice, Total Dues).
- Row 2: Collections 3-month grouped bar chart (Billed vs Collected vs Outstanding) + collection efficiency %.
- Row 3: Occupancy trend line chart & Electricity consumption bar chart.
- Row 4: Outstanding dues table with ageing buckets (0-15, 16-30, 31-60, 60+ days).
- Row 5: Recent activity feed & Upcoming feed.
- Row 6: Revenue breakdown stacked bar by charge head.

### 6.9 Reports
- Rent roll, Collection report, Outstanding/ageing report, Electricity report, Tenant ledger, Vacancy report, Move-in/move-out register, Security deposit register. Export to CSV/Excel.

---

## 7. Screen inventory

| # | Screen | Route | Primary role |
|---|---|---|---|
| 1 | Login / forgot password | `/login` | all |
| 2 | Signup + onboarding wizard | `/signup` | owner |
| 3 | Dashboard | `/dashboard` | all |
| 4 | Occupancy board | `/rooms` | manager |
| 5 | Room detail drawer | `/rooms/{id}` | manager |
| 6 | Room add / bulk generate / import | `/rooms/new` | owner, manager |
| 7 | Tenant list | `/tenants` | manager |
| 8 | Tenant detail | `/tenants/{id}` | manager |
| 9 | Add / edit tenant | `/tenants/new` | manager |
| 10 | Assign bed / new booking | `/allotments/new` | manager |
| 11 | Bookings calendar | `/bookings` | manager |
| 12 | Meter readings entry | `/electricity` | manager |
| 13 | Generate bills | `/invoices/generate` | owner, manager |
| 14 | Invoice list | `/invoices` | all |
| 15 | Invoice detail + PDF preview | `/invoices/{id}` | all |
| 16 | Record payment | modal | manager, accountant |
| 17 | Payments list | `/payments` | accountant |
| 18 | Receipt view | `/payments/{id}` | all |
| 19 | Messages / notification log | `/messages` | manager |
| 20 | Bulk message composer | `/messages/new` | manager |
| 21 | Reports hub | `/reports` | accountant, owner |
| 22 | Settings — property, billing, charge heads, templates, users | `/settings/*` | owner |
| 23 | Super admin — organizations, plans, usage | `/admin/*` | super_admin |

---

## 8. Business rules and edge cases

### 8.1 Pro-rated rent
```
daysInMonth = number of days in the billing month
occupiedDays = days between max(move_in_date, month_start) and min(actual_move_out_date or expected_move_out_date or month_end, month_end), inclusive
rentAmount = round(agreed_rent * occupiedDays / daysInMonth, 2)
```

### 8.2 Rounding
Round line items to 2 decimals (half-up). Round invoice totals to whole rupees if enabled.

### 8.3 Late fee
Daily job checks sent/partially_paid invoices overdue. Applies flat or percentage fee once per cycle.

### 8.4 Electricity split
- `equal`: total / active tenants.
- `by_days_occupied`: weighted by occupied days.
- `primary_tenant`: full amount to primary tenant.
- `room_level`: single info bill.

### 8.5 Meter reading continuity
Previous reading = previous month's current reading. Meter replacement checkbox for reset.

### 8.6 Bed and booking integrity
Partial unique index on `(bed_id) WHERE status = 'active'`. Reservation date range overlap check.

### 8.7 Deletion policy
Financial records never hard-deleted. Soft deletes + audit logs.

### 8.8 Timezone & Currency
All timestamps stored in UTC. Money stored as `numeric(12,2)`.

---

## 9. API Surface

REST / JSON under `/api/v1` with Auth and Org scoping headers / session context.
Includes routes for Auth, Org & Property, Rooms, Tenants, Allotments, Meter Readings, Invoices, Payments, Messaging, Dashboard & Reports. Standard envelope:
```json
{ "success": true, "data": {}, "meta": { "page": 1, "per_page": 25, "total": 45 } }
```

---

## 10. Recommended Tech Stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **UI & Styling**: Tailwind CSS + custom modern design system + Lucide icons
- **Database / ORM**: SQLite / PostgreSQL with Prisma ORM
- **Auth**: Auth / Session tokens with bcrypt password hashing
- **Charts**: Recharts
- **PDF**: Server-side HTML / Canvas / PDF rendering engine

---

## 11. Security Requirements

- Password hashed with bcrypt (cost 12).
- Every query scoped by `organization_id`. Object-level authorization tests.
- PII masking on tenant ID proofs in list views.

---

## 12. WhatsApp Integration

- Provider abstraction with mock & Meta/BSP support.
- Pre-approved template definitions for bills, reminders, receipts, overdue notices, welcome, move-out confirmation.

---

## 13. Invoice & Receipt PDF Layout

- Professional brand-colored header with logo, business details, invoice number, due date.
- Detailed line items breakdown (rent pro-ration note, electricity split breakdown).
- Payment details (UPI QR / bank details) & status watermark (`PAID`, `OVERDUE`).

---

## 14. Build Phases

- **Phase 1 — Foundation (build first)**: Auth and roles, organizations/properties/settings, multi-tenant scoping layer, property settings screen, charge heads CRUD, rooms CRUD with bulk generate, CSV import, add/remove capacity, beds auto-management, occupancy board with live status, tenants CRUD with document upload, allotment (assign to bed, active status). *Deliverable: you can set up Riddhi Residency's 45 rooms and see who is where.*
- **Phase 2 — Bookings and availability**: Future bookings with overlap validation, availability-on-date view, bookings calendar, give notice, vacate with final settlement, transfer room, daily job to activate reservations on move-in date.
- **Phase 3 — Billing**: Meter reading entry screen with previous-reading carry-forward, validation, anomaly flags, bulk save; billing engine with pro-rating, electricity split, charge heads, tax, rounding; generate-bills preview and confirm; invoice list and detail; invoice PDF; invoice numbering with atomic sequence; overdue job and late fees.
- **Phase 4 — Payments and receipts**: Record payment with proof upload, partial payments, advances and credit balance, receipt numbering and PDF, reversal with audit, tenant ledger.
- **Phase 5 — WhatsApp**: Provider abstraction, Meta Cloud API / BSP implementation, template management and preview, queue worker with quiet hours, deduplication, retry, webhook for delivery status, automatic sends, manual and bulk send, message log per tenant, failed message tray.
- **Phase 6 — Dashboard and reports**: Dashboard rows with 3-month default, reports from 6.9, CSV/Excel export.
- **Phase 7 — Sellable SaaS**: Signup flow and onboarding wizard, plan limits enforcement, super admin console, public marketing landing page.
- **Phase 8 — Optional extensions**: Tenant self-service portal, complaints/maintenance ticketing, visitor log, food menu, staff attendance, expense tracking.

---

## 15. Seed Data — Riddhi Residency

- **Organization**: Riddhi Residency (`slug`: `riddhi-residency`), Plan: `pro`
- **Property**: Riddhi Residency, Code: `RIDDHI`, Currency: INR (₹), Timezone: Asia/Kolkata
- **Settings**: Electricity rate 10.00/unit, split mode `equal`, bill day 1, due day 5, pro-rate on, late fee flat ₹200 after 5 grace days, notice period 30 days, security deposit 1 month, invoice prefix `INV`, receipt prefix `RCP`
- **Charge Heads**: Rent (recurring, per_bed, system), Electricity (usage_based, per_room, system), Late Fee (system), Security Deposit (one_time), Food/Mess (recurring, ₹2500, inactive), WiFi (recurring, ₹300, inactive), Laundry (recurring, ₹500, inactive)
- **Rooms (45 total across 3 floors)**:
  - Ground: G01–G15 (15 rooms), Single sharing, capacity 1, rent ₹8,000/bed
  - First: 101–115 (15 rooms), Double sharing, capacity 2, rent ₹6,000/bed
  - Second: 201–215 (15 rooms), Triple sharing, capacity 3, rent ₹5,000/bed
  - Total beds: 90 beds (15 + 30 + 45)
  - Seed 60 occupied beds, 5 reserved beds, rest vacant. Seed 3 months of meter readings, invoices, and payments.

---

## 16. Acceptance Checklist

### Phase 1 Checklist:
- [ ] Create a second test organization; confirm its user cannot see Riddhi Residency data via UI or by hitting an API route with a known ID from the other org
- [ ] Bulk-generate 45 rooms in under a minute; beds are created correctly per capacity
- [ ] Change room 205 from triple to double — the third bed is removed if vacant, blocked with a named error if occupied
- [ ] Deactivate a room with an occupant — blocked with a clear reason
- [ ] Occupancy board totals match the sum of bed statuses
- [ ] All property name, currency, and rate values come from settings, not code (grep for hardcoded values)

---

## 17. Notes for selling this to other PGs

1. Never hardcode anything property-specific.
2. Configurable charge heads.
3. Data export on demand.
4. Import tooling (CSV / Excel).
5. Usage instrumentation.
6. Per-bed monthly pricing model.
7. Keep a demo organization with realistic seeded data.
