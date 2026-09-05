# Work & Pay — Motorcycle Hire-Purchase Payment Tracker
### Product & Technical Specification for Development

**Purpose of this document:** This is a build-ready spec. Hand this whole file to a developer or an AI coding agent (Claude Code, Cursor, etc.) and it has enough detail to scaffold, build, and iterate on the full product.

---

## 1. Problem Statement

The Owner leases motorcycles to Hirers (riders) under "Work and Pay" hire-purchase agreements (see the contract this is based on). Today, payment tracking is manual/paper-based. The Owner needs:

- A way to **record each payment** as it comes in (amount, date, channel/reference).
- Automatic tracking of **balance remaining** and a **projected finishing date** (when the bike is fully paid off).
- The **Hirer to see their own payment history and progress** without needing to ask the Owner.
- Visibility across **multiple riders/vehicles** at once, since the Owner likely manages more than one agreement.

## 2. Users & Roles

| Role | Access |
|---|---|
| **Admin (Owner)** | Full access: create agreements, record payments, edit/delete payments, view all riders, see overdue list, manage vehicles |
| **Rider (Hirer)** | Read-only: their own agreement, payment history, balance, next due date, projected finishing date |
| **Guarantor** *(Phase 2, optional)* | Read-only: same visibility as Rider, for peace of mind and accountability |

No public sign-up. Admin creates rider accounts (or sends an invite link) when a new agreement starts.

## 3. Core Concept: How Money Tracking Works

Each **Agreement** has:
- `cash_price` — value of the motorcycle
- `hire_purchase_price` — total amount the rider must pay (usually higher than cash price)
- `installment_amount` — amount due per period
- `installment_frequency` — `weekly` or `monthly`
- `start_date`
- `total_installments` (derived or entered directly)

Each **Payment** recorded by Admin reduces the outstanding balance:

```
balance_remaining = hire_purchase_price - SUM(payments.amount)
percent_complete = SUM(payments.amount) / hire_purchase_price * 100
```

**Projected finishing date** is calculated two ways (show both):
1. **Scheduled finish** — `start_date + (total_installments × frequency interval)`, i.e. what the contract says on paper.
2. **Actual pace finish** — based on the rider's real average payment rate so far, so if they're paying faster or slower than scheduled, the projection adjusts. Formula: `remaining_balance / average_payment_per_period_so_far`, projected forward from today.

Showing both keeps the Admin honest about the contract terms while giving the Rider a realistic, motivating picture of their actual progress.

**Overdue detection:** if today's date is past the `next_due_date` and no payment has landed since the last due date, flag the agreement as overdue (yellow at 1–6 days late, red beyond a configurable grace period).

## 4. MVP Feature List (Build This First)

1. **Auth** — Admin login + Rider login (email/phone + password, or magic link). Simple role-based access control.
2. **Agreement creation** — Admin digitizes a signed paper agreement into the system (owner info, hirer info, guarantor info, vehicle info, financial terms — mirrors the uploaded contract's fields).
3. **Payment recording** — Admin logs a payment: amount, date received, channel (MoMo/Cash/Bank), reference number, optional note. Every payment is timestamped and attributed to the admin who entered it (audit trail).
4. **Rider dashboard** — balance remaining, % paid, progress bar, next due date, projected finishing date, full payment history table.
5. **Admin dashboard** — list of all riders/vehicles with balance, status (on-track / overdue), quick "record payment" action from the list.
6. **Payment history & receipts** — every payment shown as a timeline entry; rider can see a running statement.
7. **Edit/void a payment** — mistakes happen; admin can correct or void an entry (soft-delete, kept in audit log, never hard-deleted).

## 5. Recommended Features (Phase 2+, in priority order)

These make the product genuinely useful beyond a spreadsheet replacement — pick and choose as time allows:

- **SMS/WhatsApp reminders** — auto-notify rider a day before due date, and auto-notify admin when someone goes overdue (Africa's Talking or Twilio for Ghana-friendly SMS).
- **Payment confirmation to rider** — instant SMS/notification the moment admin logs a payment ("GH₵200 received, balance now GH₵3,400").
- **MoMo API integration** — auto-detect incoming MoMo payments instead of manual entry (bigger lift, high value later).
- **Downloadable statement (PDF)** — rider or admin can export a full payment statement, useful for disputes or when the bike is fully paid off (triggers ownership transfer per the contract).
- **Multi-vehicle fleet view** — admin filters/sorts by vehicle, region, status, guarantor.
- **Document vault** — upload Ghana Card copies, passport photos, signed contract scan, insurance docs — attached to each agreement.
- **Late fee / penalty rules** — optional configurable penalty after N days overdue.
- **Default & repossession workflow** — mark an agreement as "in default," log repossession actions and dates, per Section 8 of the contract.
- **Excel/CSV export** — for the admin's own bookkeeping or accountant.
- **Multi-admin support with permissions** — if the Owner hires an office manager, give them limited access (e.g. can record payments, can't delete agreements).
- **Automatic "fully paid" milestone** — when balance hits zero, auto-flag agreement as complete and prompt admin to begin DVLA ownership transfer, per the contract's Section 3.

## 6. Mobile & Responsive Requirement

This is **not optional** — treat it as a hard requirement, not a nice-to-have:

- **Riders will almost always view this on a phone**, often on a small/mid-range Android screen, sometimes on slower mobile data. The rider view (progress bar, balance, payment history) must be fully usable on a 360–400px-wide screen with no horizontal scrolling.
- **Admin will often record payments on the go too** — standing at a rider's bike, not at a desk. The "Record Payment" flow should be a quick, thumb-friendly form, not a dense desktop table squeezed onto a phone.
- Build **mobile-first**: design and test the small screen first, then expand up to tablet/desktop, rather than shrinking a desktop layout down.
- Tailwind CSS (already in the stack) makes this straightforward with its responsive breakpoint utilities (`sm:`, `md:`, `lg:`) — every screen in Section 9 should be built with these from the start, not retrofitted later.
- Tables (e.g. the Admin Dashboard's agreement list) should collapse into stacked cards on small screens rather than becoming tiny, squinting tables.
- No native app needed for MVP — a responsive web app covers this well, and can be installed as a **PWA** (Progressive Web App, add-to-homescreen with an icon, works offline for viewing cached data) cheaply later if you want an app-like feel without building separate iOS/Android apps.

## 7. Recommended Tech Stack

Chosen for: fast to build, cheap/free to host at small scale, easy for a solo developer or AI agent to extend later.

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js (React, App Router, TypeScript)** | One codebase for UI + API routes; huge ecosystem; easy to extend |
| Database | **PostgreSQL** (via Supabase or Railway) | Relational data fits perfectly (agreements → payments); Supabase gives free tier + built-in auth |
| ORM | **Prisma** | Type-safe schema, easy migrations, agent-friendly (schema is one readable file) |
| Auth | **Supabase Auth** or **NextAuth.js** | Handles roles/sessions without building from scratch |
| Styling | **Tailwind CSS + shadcn/ui** | Clean, professional look fast, minimal custom CSS |
| Hosting | **Vercel** (app) + **Supabase** (DB/auth) | Free tier covers MVP comfortably |
| SMS (Phase 2) | **Africa's Talking API** | Reliable, affordable SMS delivery in Ghana |
| PDF export (Phase 2) | **@react-pdf/renderer** or **pdf-lib** | Generate statements/receipts |

This stack is intentionally boring and mainstream — that's a feature, not a limitation. It means any future developer (human or AI) can pick it up instantly.

## 8. Data Model (Prisma-style schema, ready to adapt)

```prisma
model User {
  id            String   @id @default(cuid())
  name          String
  phone         String   @unique
  email         String?  @unique
  passwordHash  String
  role          Role     // ADMIN | RIDER | GUARANTOR
  createdAt     DateTime @default(now())
  agreementsAsHirer      Agreement[] @relation("HirerAgreements")
}

enum Role {
  ADMIN
  RIDER
  GUARANTOR
}

model Vehicle {
  id              String   @id @default(cuid())
  makeModel       String
  registrationNo  String   @unique
  chassisNo       String?
  engineNo        String?
  colorYear       String?
  agreement       Agreement?
}

model Agreement {
  id                    String   @id @default(cuid())
  ownerName             String
  ownerPhone            String
  hirer                 User     @relation("HirerAgreements", fields: [hirerId], references: [id])
  hirerId               String
  guarantor1Name        String?
  guarantor1Phone       String?
  guarantor2Name        String?
  guarantor2Phone       String?
  vehicle               Vehicle  @relation(fields: [vehicleId], references: [id])
  vehicleId             String   @unique

  cashPrice             Decimal
  hirePurchasePrice     Decimal
  installmentAmount     Decimal
  frequency             Frequency // WEEKLY | MONTHLY
  totalInstallments     Int
  startDate             DateTime
  status                AgreementStatus @default(ACTIVE) // ACTIVE | COMPLETED | DEFAULTED | REPOSSESSED

  payments              Payment[]
  createdAt             DateTime @default(now())
}

enum Frequency {
  WEEKLY
  MONTHLY
}

enum AgreementStatus {
  ACTIVE
  COMPLETED
  DEFAULTED
  REPOSSESSED
}

model Payment {
  id            String   @id @default(cuid())
  agreement     Agreement @relation(fields: [agreementId], references: [id])
  agreementId   String
  amount        Decimal
  datePaid      DateTime
  channel       PaymentChannel // MOMO | CASH | BANK
  reference     String?
  note          String?
  recordedBy    String   // admin user id
  voided        Boolean  @default(false)
  createdAt     DateTime @default(now())
}

enum PaymentChannel {
  MOMO
  CASH
  BANK
}
```

## 9. Key Screens

1. **Login** — role-aware, redirects Admin → Admin Dashboard, Rider → My Agreement.
2. **Admin Dashboard** — table of all agreements: rider name, vehicle, balance, % paid, status badge (On Track / Overdue / Completed), "Record Payment" quick action.
3. **Agreement Detail (Admin view)** — full contract details, payment history, edit/void payments, mark as completed/defaulted.
4. **New Agreement Form** — mirrors the paper contract's fields (owner, hirer, guarantors, vehicle, financial terms).
5. **Rider "My Agreement" page** — progress bar, balance, next due date, projected finishing date, full payment timeline, (Phase 2: download statement button).

## 10. API Endpoints (REST-style, adapt to Next.js route handlers)

```
POST   /api/auth/login
GET    /api/agreements                 (admin: all, rider: own only)
POST   /api/agreements                 (admin only)
GET    /api/agreements/:id
PATCH  /api/agreements/:id             (status changes, admin only)
POST   /api/agreements/:id/payments    (admin only)
PATCH  /api/payments/:id               (edit/void, admin only)
GET    /api/agreements/:id/summary     (balance, % paid, projected finish date)
```

## 11. Suggested Build Phases

**Phase 0 — Setup**
Scaffold Next.js + Prisma + Postgres, auth, base layout, deploy skeleton to Vercel.

**Phase 1 — MVP (Section 4 above)**
Agreements, payments, both dashboards. Ship this first — it replaces the notebook/spreadsheet and is immediately useful.

**Phase 2 — Communication**
SMS reminders, payment confirmations, overdue alerts.

**Phase 3 — Polish & Trust**
PDF statements, document vault, multi-admin roles, CSV export.

**Phase 4 — Automation**
MoMo API auto-reconciliation, default/repossession workflow, analytics dashboard (total portfolio value, average time-to-payoff, default rate).

## 12. Notes for Whoever Builds This

- Keep the schema close to the paper contract's language — the Admin thinks in those terms (Hirer, Guarantor, Hire-Purchase Price), and matching the UI copy to it reduces confusion.
- Currency is **GH₵ (Ghana Cedi)** — format all money fields accordingly, no assumptions of USD.
- Payment channel matters a lot in this market — MoMo (mobile money) should be the default/first option in any dropdown, not Cash or Bank.
- Never hard-delete a payment — void it and keep it visible in an audit trail. Financial disputes will happen and the record needs to survive them.
- Start with **weekly** as the default frequency — it's the more common cadence in this business model, but keep it configurable per agreement.
