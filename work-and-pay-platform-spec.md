# Work & Pay — Motorcycle Hire-Purchase Payment Tracker
### Product & Technical Specification for Development

**Purpose of this document:** This is a build-ready spec. Hand this whole file to a developer or an AI coding agent (Claude Code, Cursor, etc.) and it has enough detail to scaffold, build, and iterate on the full product.

---

## 1. Problem Statement

The Platform Operators manage a multi-tenant SaaS platform where multiple Fleet Owners lease motorcycles to Hirers (riders) under "Work and Pay" hire-purchase agreements. Today, payment tracking is manual/paper-based. Fleet Owners need:

- A way to **record each payment** as it comes in (amount, date, channel/reference).
- Automatic tracking of **balance remaining** and a **projected finishing date** (when the bike is fully paid off).
- The **Hirer to see their own payment history and progress** without needing to ask the Owner.
- Visibility across **multiple riders/vehicles** at once, since Owners manage multiple agreements.

## 2. Users & Roles (Multi-Tenant)

| Role | Access |
|---|---|
| **Super Admin (Platform Operator)** | Controls the overall SaaS platform. Can approve/reject new Organizations (Fleet Owners), view all organizations, and act as a super-user. |
| **Admin (Fleet Owner)** | Tied to a specific `Organization`. Full access to their org's agreements, payments, vehicles, and riders. |
| **Rider (Hirer)** | Tied to a specific `Organization`. Read-only: their own agreement, payment history, balance, next due date, projected finishing date |
| **Guarantor** *(Phase 2, optional)* | Read-only: same visibility as Rider, for peace of mind and accountability |

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
1. **Scheduled finish** — `start_date + (total_installments × frequency interval)`.
2. **Actual pace finish** — `remaining_balance / average_payment_per_period_so_far`.

## 4. MVP Feature List (Completed)

1. **Auth** — Multi-tenant login for Super Admin, Admin, and Rider.
2. **Organization Management** — Fleet Owners can request access. Super Admins can approve/suspend them.
3. **Interactive Demo / Sandbox** — A fully interactive one-click sandbox environment so prospective Fleet Owners can test the system without waiting for approval.
4. **Onboarding & Tour Guide** — Walkthrough tutorials for first-time users (using driver.js).
5. **Agreement creation** — Admin digitizes a signed paper agreement into the system.
6. **Payment recording** — Admin logs a payment: amount, date received, channel.
7. **Rider dashboard** — Balance remaining, % paid, progress bar, next due date.
8. **Admin dashboard** — List of all riders/vehicles with balance, status.
9. **Edit/void a payment** — Audit trail preserved.

## 5. Recommended Features (Phase 2 & 3)

- **Paystack Splits (Marketplace) integration** — Riders pay online via Paystack, and funds are automatically split/routed to the correct Fleet Owner's subaccount, bypassing the Platform Operator's central bank account.
- **SMS/WhatsApp reminders** — Auto-notify rider a day before due date.
- **Payment confirmation to rider** — Instant SMS/notification when admin logs a payment.
- **Downloadable statement (PDF)** — Export a full payment statement.
- **Document vault** — Upload Ghana Card copies, passport photos, signed contract scans.
- **Late fee / penalty rules** — Configurable penalty after N days overdue.
- **Default & repossession workflow** — Mark an agreement as "in default."

## 6. Mobile & Responsive Requirement

- **Riders will almost always view this on a phone**.
- **Admin will often record payments on the go too**.
- Build **mobile-first**: UI heavily relies on Tailwind responsive breakpoints.
- Implemented as a **PWA** (Progressive Web App) so it can be installed on home screens.

## 7. Recommended Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Frontend + Backend | **Next.js (React, App Router, TypeScript)** | One codebase for UI + API routes. |
| Database | **PostgreSQL** (Supabase) | Multi-tenant schema using `organizationId`. |
| ORM | **Prisma** | Type-safe schema, easy migrations. |
| Auth | **Custom Cookie Session** | Simple JWT in httpOnly cookie. (Note: 2FA was intentionally removed for simplicity and stability). |
| Styling | **Tailwind CSS + shadcn/ui** | Clean, professional look. |
| Hosting | **Vercel** | Edge network, easy CI/CD. |

## 8. Data Model (Current Prisma Schema)

```prisma
model Organization {
  id           String     @id @default(cuid())
  name         String
  slug         String     @unique
  status       OrgStatus  @default(PENDING) // PENDING | APPROVED | SUSPENDED
  contactEmail String
  contactPhone String?
  createdAt    DateTime   @default(now())
  
  users        User[]
  vehicles     Vehicle[]
  agreements   Agreement[]
  payments     Payment[]
}

model User {
  id                 String        @id @default(cuid())
  organizationId     String?
  name               String
  phone              String        @unique
  email              String?       @unique
  passwordHash       String
  role               Role          // SUPER_ADMIN | ADMIN | RIDER | GUARANTOR
  mustChangePassword Boolean       @default(false)
  createdAt          DateTime      @default(now())
}

model Vehicle {
  id             String       @id @default(cuid())
  organizationId String
  makeModel      String
  registrationNo String
  chassisNo      String?
  engineNo       String?
  colorYear      String?
  
  @@unique([registrationNo, organizationId])
}

model Agreement {
  id                    String   @id @default(cuid())
  organizationId        String
  ownerName             String
  ownerPhone            String
  hirerId               String
  vehicleId             String   @unique
  
  cashPrice             Decimal
  hirePurchasePrice     Decimal
  installmentAmount     Decimal
  frequency             Frequency // WEEKLY | MONTHLY
  totalInstallments     Int
  startDate             DateTime
  status                AgreementStatus @default(ACTIVE)

  enableLateFee         Boolean   @default(false)
  lateFeeType           String    @default("FLAT")
  lateFeeAmount         Decimal   @default(0)
  gracePeriodDays       Int       @default(7)
}

model Payment {
  id            String   @id @default(cuid())
  organizationId String
  agreementId   String
  amount        Decimal
  datePaid      DateTime
  channel       PaymentChannel // MOMO | CASH | BANK
  reference     String?
  note          String?
  recordedBy    String
  voided        Boolean  @default(false)
}
```

## 9. Key Screens

1. **Landing Page** — Public marketing site with About Us, Services, and "Try Demo".
2. **Request Access** — Form for new Fleet Owners to apply for access.
3. **Super Admin Dashboard** — Approve/reject pending organizations.
4. **Login** — Directs user based on role/tenant.
5. **Admin Dashboard** — Table of agreements, quick record payment.
6. **Agreement Detail (Admin view)** — Full contract details, timeline.
7. **Rider "My Agreement" page** — Progress bar, balance, timeline.

## 10. API Endpoints

```
POST   /api/auth/login
POST   /api/auth/demo                  (Initializes sandbox db state)
POST   /api/organizations/request-access
GET    /api/super-admin/organizations
PATCH  /api/super-admin/organizations/:id/status
GET    /api/agreements                 
POST   /api/agreements                 
POST   /api/agreements/:id/payments    
```
