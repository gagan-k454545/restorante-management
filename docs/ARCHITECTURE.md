# Architecture Specification

## 1. System Overview
The system is built as a **modular monolith** running on Next.js 15 (App Router, Node.js runtime) and PostgreSQL 16+.

```
                     ┌───────────────────────────────────────┐
                     │            Customer Browser           │
                     │  (Phone Browser, Signed Device Cookie)│
                     └──────────────────┬────────────────────┘
                                        │ GET /t/[token] (Read-only)
                                        │ POST /api/public/orders
                                        ▼
┌───────────────────┐        ┌───────────────────────┐        ┌───────────────────┐
│  Kitchen Display  │◄───────┤     Next.js Server    ├───────►│  Admin / Waiter   │
│  (KDS Surface)    │  SSE   │    (Modular Monolith) │  SSE   │  (Staff Surface)  │
└───────────────────┘        └──────────┬────────────┘        └───────────────────┘
                                        │ SELECT FOR UPDATE (Table lock)
                                        │ Single DB Transaction
                                        ▼
                             ┌───────────────────────┐
                             │  PostgreSQL Database  │
                             │  (Drizzle ORM Engine) │
                             │  - Atomic Counters    │
                             │  - Partial Unique Idx │
                             │  - Outbox Events Table│
                             └───────────────────────┘
```

## 2. Key Architectural Invariants

### 1. Integer Paise Financial Model
All price, tax, discount, service charge, and rounding arithmetic is executed via pure functions in `src/lib/pricing.ts`. Floating point arithmetic is banned.
- `rhu(n, d) = floor((2n + d) / (2d))`
- CGST strictly equals SGST in EXCLUSIVE mode.
- Invoices never display a 1-paisa discrepancy.
- Round-off stays strictly within [-50, +50] paise.

### 2. Concurrency & Row Locking
All state changes modifying a table's session or ordering state acquire an exclusive row lock on `tables` via `SELECT ... FROM tables WHERE id = $1 FOR UPDATE`. This guarantees serialized ordering rounds and eliminates races when multiple phones scan the same table.

### 3. Transactional Outbox Pattern
Every mutating action inserts an event row into the `events` table within the **same** database transaction. Realtime delivery occurs only after commit via `bus.wake()`, backed by a 1-second safety poller and a 3-second client-side reconcile mechanism (`changedSince`).

### 4. Zero-Write QR Entry
`GET /t/[token]` performs read-only database verification of the table token and issues an HMAC-SHA256 signed `qr_device` cookie. Link preview bots (WhatsApp, Google Lens, antivirus scrapers) can never open ghost sessions or alter database state.

### 5. Gapless Sequential Invoicing
Invoice numbers (`INV/YY-YY/000000`) and credit note numbers (`CN/YY-YY/000000`) are allocated atomically from the `counters` table strictly upon the bill becoming `PAID` within the payment transaction. Unpaid, draft, or voided bills never consume sequence numbers.
