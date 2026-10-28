# Contract Requirements & Edge Cases

Extracted from `docs/BRIEF.md` sections 3 to 11 and 16, and section 11 edge cases table.

## Requirements Checklist (R-001 ... R-100+)

### Section 3: End-to-End Flow & State Machine
- [ ] **R-001**: Every order must follow the exact single path: scan, order, confirm if needed, kitchen, serve, bill, pay, close.
- [ ] **R-002**: Table token must be random with at least 128 bits and must never contain the table number.
- [ ] **R-003**: `GET /t/<token>` must be read-only: validate token, set signed device cookie, redirect to `/menu`. It must write nothing to the database (never create a session on link preview/scanner).
- [ ] **R-004**: Database must guarantee at most one live session per table (`OPEN`, `BILL_REQUESTED`, or `BILLING`).
- [ ] **R-005**: In `CONFIRM_NEW_DEVICE` mode, first order of a non-verified device must be held as `PENDING_CONFIRMATION` (visible only to waiter/admin, never to kitchen).
- [ ] **R-006**: Waiter confirmation of a `PENDING_CONFIRMATION` order must transition order to `PLACED` and mark device as verified.
- [ ] **R-007**: Auto-accept must only transition orders to `ACCEPTED` if auto-accept is enabled AND at least one kitchen screen is online.
- [ ] **R-008**: In `BILLING` session state, new orders must always be refused with `SESSION_LOCKED`.
- [ ] **R-009**: An order held in `PENDING_CONFIRMATION` must be confirmed or rejected before the bill can be prepared (`PENDING_ORDERS` error otherwise).
- [ ] **R-010**: Cashier must record payments with an idempotency key; payments must never exceed the amount due.
- [ ] **R-011**: When amount due reaches 0, the same transaction must allocate the next invoice number, mark bill `PAID`, close session as `PAID`, and free table.
- [ ] **R-012**: After session closing, old device cookies must never be allowed to order on that session.
- [ ] **R-013**: Mistakes found after payment must be corrected with a credit note, never by editing a paid bill.
- [ ] **R-014**: Order transitions must strictly obey the state machine table. Invalid transitions must return 409 with code `INVALID_TRANSITION`.
- [ ] **R-015**: `REJECTED` and `CANCELLED` statuses must be final.
- [ ] **R-016**: Every transition must check the order's `version`; a stale write must return 409.
- [ ] **R-017**: Every transition must append a row to `order_history` (actor, from, to, reason, time) and an event row in the same transaction.
- [ ] **R-018**: Orders in `PENDING_CONFIRMATION`, `REJECTED`, or `CANCELLED` must never reach a bill.
- [ ] **R-019**: A session with billable lines must never close by itself.

### Section 4: Architecture, Stack & Realtime
- [ ] **R-020**: Never change the specified tech stack (Next.js App Router, PostgreSQL 16+, Drizzle ORM, Zod, TanStack Query, Zustand, jose, @node-rs/argon2, SSE).
- [ ] **R-021**: TypeScript strict mode must be used; `any` is strictly banned.
- [ ] **R-022**: One Zod schema per input must be shared by client and server.
- [ ] **R-023**: Money must always be integer paise. All price, tax, discount, and rounding logic must live in one pricing module defined by Section 16.
- [ ] **R-024**: The server must never trust the client for prices, totals, availability, table identity, or role.
- [ ] **R-025**: Every state change must happen in one database transaction that also writes its history row and its event row. Events must be published only after the commit.
- [ ] **R-026**: Every endpoint must authenticate, authorize on the server, validate, and apply Section 10 rate limits.
- [ ] **R-027**: Every endpoint must have a test for the wrong-role case.
- [ ] **R-028**: Store time in UTC. Compute business rules in the restaurant timezone. All timers on screens must use server time, not device clock.
- [ ] **R-029**: Ship real seed data (1 demo restaurant, 8 tables, 6 categories, 30 items with variants/add-ons, 3 staff users). Seed script must refuse to run when `NODE_ENV === 'production'`.
- [ ] **R-030**: All repository queries must be scoped by `restaurant_id`.
- [ ] **R-031**: Realtime SSE route must use `runtime = 'nodejs'`, `dynamic = 'force-dynamic'`, send headers `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive`, `X-Accel-Buffering: no`, and must not be compressed.
- [ ] **R-032**: SSE stream must send a comment heartbeat every 20 seconds and `retry: 3000`.
- [ ] **R-033**: When `request.signal` aborts, SSE listeners must be removed to prevent connection leaks.
- [ ] **R-034**: Event bus and poller must be created once on `globalThis` from `instrumentation.ts`.
- [ ] **R-035**: Clients must refetch current data after every connect/reconnect, on `visibilitychange` to visible, and on coming back online.
- [ ] **R-036**: Kitchen and admin screens must reconcile every 3 seconds by requesting orders changed since their last known version.

### Section 5: Data Model & Constraints
- [ ] **R-037**: Database foreign keys must be `ON DELETE RESTRICT`, never `CASCADE`.
- [ ] **R-038**: Order lines must be immutable snapshots: a later menu edit must never alter past order lines.
- [ ] **R-039**: Database must enforce: partial unique index on `table_sessions (table_id)` where status is `OPEN`, `BILL_REQUESTED`, or `BILLING`.
- [ ] **R-040**: Database must enforce: partial unique index on `bills (session_id)` where status is `DRAFT` or `PAID`.
- [ ] **R-041**: Database must enforce: check constraint `CHECK (status <> 'PAID' OR invoice_number IS NOT NULL)`, and unique `(restaurant_id, invoice_fy, invoice_number)`.
- [ ] **R-042**: Database must enforce: unique `(restaurant_id, business_date, order_number)` on `orders`.
- [ ] **R-043**: Append-only tables (`payments`, `audit_logs`, `order_history`, `credit_notes`) must have a trigger raising an error on UPDATE and DELETE.
- [ ] **R-044**: Database value checks must enforce: amounts not negative, quantities 1 to 99, tax rates 0 to 10,000 basis points, `min_select <= max_select`.
- [ ] **R-045**: Order, invoice, and credit-note numbers must come from `counters` via atomic `INSERT ... ON CONFLICT DO UPDATE SET value = counters.value + 1 RETURNING value` inside the same transaction.
- [ ] **R-046**: Retention rules: bills, payments, credit notes, audit logs kept for at least 6 years. Guest name and phone deleted 90 days after session closes.

### Section 6: Customer Web App
- [ ] **R-047**: Cart must live in `localStorage` under `cart:<table_id>:<device_id>` and must be cleared only after the server confirms the order.
- [ ] **R-048**: Guest name and phone must never be required.
- [ ] **R-049**: If an item becomes unavailable or price changes, the cart must display an inline warning and block "Place order" until resolved.
- [ ] **R-050**: Cart must enforce limits: max 50 lines per order, max 20 quantity per line.
- [ ] **R-051**: Place order must send an idempotency key and hash of cart; button must be disabled while sending; on failure cart must be kept.
- [ ] **R-052**: Guest cancellation must be allowed only while order is `PENDING_CONFIRMATION` or `PLACED` and within `cancel_window_seconds`.
- [ ] **R-053**: Unverified devices must only see their own orders and must not see the session bill until verified.
- [ ] **R-054**: Offline state must show an Offline banner, keep cart, disable Place order, and never display false success.

### Section 7: Kitchen Display Screen (KDS)
- [ ] **R-055**: Kitchen screen must never show orders in `PENDING_CONFIRMATION`.
- [ ] **R-056**: If any request from kitchen screen returns 401, display full-screen red alarm with repeating sound ("Kitchen screen signed out"), never a silent login redirect.
- [ ] **R-057**: Voiding a line must recompute totals; if the last active line is voided, order must automatically transition to `REJECTED`.
- [ ] **R-058**: Kitchen screen heartbeat must be sent every 15 seconds; kitchen is marked offline if not seen for 45 seconds.
- [ ] **R-059**: When restaurant is open and kitchen is offline, admin and waiter apps must display red banner with repeating sound; auto-accept must be ignored.
- [ ] **R-060**: Unacknowledged order escalation: flash on kitchen screen and banner/sound on front screens after `ack_warn_seconds` (default 90s); continuous alarm after 3x `ack_warn_seconds` (270s).
- [ ] **R-061**: Timers on all screens must compute elapsed time using `server_now` offset, never local device clock.
- [ ] **R-062**: Daily limits must be strictly enforced: never sell more than the daily portion limit.
- [ ] **R-063**: KOT print failure must never block order flow.

### Section 8: Admin & Staff App
- [ ] **R-064**: Access control must be enforced on the server by role; UI visibility must never be the security control.
- [ ] **R-065**: Deactivating a user must take effect on their very next request via database `is_active` and `token_version` checks.
- [ ] **R-066**: Cashier discounts must require a valid 120-second manager PIN approval token.
- [ ] **R-067**: Moving a session onto an occupied table must be strictly refused.
- [ ] **R-068**: Tax settings modifications must be restricted to `OWNER` only and must be logged to `audit_logs`.
- [ ] **R-069**: Cashier reports must only show their own payments for the current business date.

### Section 9: API Design & Business Rules
- [ ] **R-070**: Idempotent endpoints must require `Idempotency-Key` header with UUID; same key + different body must return 422 `IDEMPOTENCY_KEY_REUSED`.
- [ ] **R-071**: `POST /api/public/orders` must lock the table row (`SELECT ... FROM tables WHERE id = $1 FOR UPDATE`).
- [ ] **R-072**: If `expectedSubtotal` is provided in place order and differs from priced lines, transaction must roll back and return 409 `PRICE_CHANGED`.
- [ ] **R-073**: Portion updates must use atomic SQL `UPDATE menu_items SET sold_today = sold_today + $qty WHERE id = $id AND (daily_limit IS NULL OR sold_today + $qty <= daily_limit)`; failure must return `LIMIT_REACHED`.
- [ ] **R-074**: Prepare bill must lock table row, require session `OPEN` or `BILL_REQUESTED`, and ensure no orders are `PENDING_CONFIRMATION` (return `PENDING_ORDERS` otherwise).
- [ ] **R-075**: Record payment must require idempotency key, lock table row, verify bill is `DRAFT`, require `amount > 0` and `amount <= amount_due` (return 422 otherwise).

### Section 10: Security & Abuse Prevention
- [ ] **R-076**: Table token must be looked up in database; never derived.
- [ ] **R-077**: Guest routes must never ask for payment, UPI ID, card, OTP, or password in v1.
- [ ] **R-078**: Never log secrets, passwords, cookies, or auth tokens.
- [ ] **R-079**: Rate limits per Section 10 table must be enforced in-memory.
- [ ] **R-080**: Staff password hashes must use argon2id.
- [ ] **R-081**: PIN logins must lock for 15 minutes after 5 failed attempts.
- [ ] **R-082**: `restaurant_id` must always come from authenticated context or table lookup, never from request body/query string.
- [ ] **R-083**: Parameterized queries only; no raw SQL string concatenation.
- [ ] **R-084**: User notes and names must always be rendered as plain text (no unescaped HTML).
- [ ] **R-085**: Image uploads must check magic bytes, max 5MB, convert to WebP, and strip EXIF.
- [ ] **R-086**: Strict security headers: CSP, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `frame-ancestors 'none'`.
- [ ] **R-087**: Token in `/t/*` URLs, cookies, and phone numbers must be redacted in logs.

### Section 16: Money, Tax & Invoicing Rules
- [ ] **R-088**: All money amounts must be non-negative integer paise.
- [ ] **R-089**: Round half up formula `rhu(n, d) = floor((2n + d) / (2d))` must be used for all integer divisions in pricing.
- [ ] **R-090**: Discounts must never exceed subtotal; 100% discount yields total 0 and session closes as `NO_CHARGE`.
- [ ] **R-091**: CGST and SGST must always be equal; invoice must never have a 1-paisa discrepancy between them.
- [ ] **R-092**: In EXCLUSIVE mode, tax is computed on `(base + sc_taxable)` at half the rate for CGST and SGST.
- [ ] **R-093**: In INCLUSIVE mode, tax breakdown inside prices and service charge must follow exact section 16 formulas.
- [ ] **R-094**: Round off to nearest rupee (when enabled) must round total to nearest 100 paise; `round_off` must be between -50 and +50 paise.
- [ ] **R-095**: COMPOSITION scheme must produce a Bill of Supply with no tax lines.
- [ ] **R-096**: All worked examples (A, A2, B, C, D, E) in Section 16 must pass as exact unit tests.
- [ ] **R-097**: Invoice prefix must be at most 4 characters; total invoice number at most 16 characters (`INV/YY-YY/000000`).
- [ ] **R-098**: A paid bill must never be edited; corrections must use Credit Notes (`CN/YY-YY/000000`).
- [ ] **R-099**: Financial year must be formatted as `YY-YY` (April 1 to March 31).
- [ ] **R-100**: Net sales reports must exclude service charge and write-offs, and subtract credit notes.

---

## Edge-Case Checklist (E-001 ... E-042)

### Concurrency & Data Integrity
- [ ] **E-001**: Two phones order at the same moment at a fresh table -> One session created, both devices registered, enforced by table row lock and partial unique index.
- [ ] **E-002**: Double tap, retry or refresh after Place order -> Same idempotency key returns same order, creates no second set of events. Changed cart gets new key.
- [ ] **E-003**: Connection drops right after Place order -> Cart kept until server confirms. After reload, `/orders` shows order if saved; retrying with same key never duplicates.
- [ ] **E-004**: Guest orders while cashier prepares bill -> Table lock orders them. If order first, it is on bill. If bill first, guest gets `SESSION_LOCKED` and friendly message.
- [ ] **E-005**: Guest cancels at the moment kitchen accepts -> Order version decides; loser gets 409 and sees current state.
- [ ] **E-006**: Two cooks tap different actions on one ticket -> Version check; loser gets 409 and screen refreshes.
- [ ] **E-007**: Cashier double-taps Record payment -> Same idempotency key returns same payment; screen shows remaining amount due.
- [ ] **E-008**: Payment is larger than amount due -> 422 error. Change given for cash is handled in UI, never stored.
- [ ] **E-009**: Server restarts or crashes in middle of request -> Transaction commits fully or rolls back. Clients reconnect, replay from `Last-Event-ID`, refetch.
- [ ] **E-010**: Live message missed -> 1-second poller and 3-second reconcile deliver change within 5 seconds maximum.
- [ ] **E-011**: Stale browser tab sends old order version -> 409 error; screen refetches and updates.

### Money & Tax
- [ ] **E-012**: Item price changes between cart and order -> `PRICE_CHANGED` with new subtotal; guest must confirm.
- [ ] **E-013**: Item runs out while in cart -> `ITEM_UNAVAILABLE` with item IDs; line marked in cart, Place order blocked until removed.
- [ ] **E-014**: Two guests take last portions of limited item -> Atomic SQL update lets one succeed, other gets `LIMIT_REACHED` with portions left.
- [ ] **E-015**: Kitchen voids line or rejects order after estimate seen -> Only billable lines counted in bill; estimate updates live; REJECTED/VOID never billed.
- [ ] **E-016**: Discount larger than subtotal or >100% -> 422 error; 100% discount gives total 0, closes session as `NO_CHARGE`.
- [ ] **E-017**: Wrong payment method recorded -> Manager reverses payment (append-only reversal entry) and records correct one.
- [ ] **E-018**: Refund or return after payment -> Credit note with distinct number and refund payment entry; paid bill never edited.
- [ ] **E-019**: Rounding and tax split -> Exact Section 16 formulas; CGST equals SGST in EXCLUSIVE mode.
- [ ] **E-020**: Bill needs correction after Prepare bill -> Manager reopens session with reason; DRAFT bill voided, no invoice number consumed.

### Guests & Tables
- [ ] **E-021**: Remote order from photo of QR code -> New device held as `PENDING_CONFIRMATION`, never reaches kitchen; waiter rejects and blocks device.
- [ ] **E-022**: New guests sit at table whose old session was not closed -> Device is new; sees only own orders; first order needs confirmation; old session shows in Needs attention.
- [ ] **E-023**: Guests leave without paying -> After 90m idle, shows in Needs attention; manager writes off with reason; excluded from sales; old cookies cannot order.
- [ ] **E-024**: Guest clears cookies or uses private tab -> New device requiring verification; existing orders remain in session.
- [ ] **E-025**: Several guests want separate bills -> Single session and bill per table in v1.
- [ ] **E-026**: Guests move to another table -> Manager moves session to free table; kitchen/tracking update table label immediately; moving to occupied table refused.
- [ ] **E-027**: QR token regenerated while guests seated -> Existing devices keep working (bound to table & session); new scans require new QR.
- [ ] **E-028**: Table disabled while occupied -> Live session continues; no new session can start.
- [ ] **E-029**: Old paper QR scanned after table deleted -> Invalid QR page shown.
- [ ] **E-030**: Large group sends huge order -> Limits enforced (50 lines, qty 20/line, order value); message suggests splitting rounds.
- [ ] **E-031**: Guest offline or slow connection -> Light page, skeletons, Offline banner, cart preserved, no false success shown.
- [ ] **E-032**: QR opened in WhatsApp, Instagram, or Google Lens -> Works smoothly; preview bots create no session.
- [ ] **E-033**: Unsupported browser -> Short update-your-browser page, never blank.
- [ ] **E-034**: Guest has allergy -> Allergy note highlighted in red on kitchen ticket; guest advised to inform waiter.

### Kitchen & Operations
- [ ] **E-035**: Kitchen tablet dies or loses Wi-Fi -> Heartbeat stops; front screens show offline alarm; orders safe in DB; guests see waiting message; standby device can take over.
- [ ] **E-036**: Nobody accepts new order -> Escalation at 90s (warning) and 270s (continuous alarm + Needs attention).
- [ ] **E-037**: Kitchen screen signed out -> Full-screen red alarm with audio alert.
- [ ] **E-038**: Kitchen overloaded -> Busy mode adds delay, ETA increases with queue, ordering can be paused with message.
- [ ] **E-039**: Cook cannot make item after accepting -> Reject order or void line with reason; guest informed; limited portions restored.
- [ ] **E-040**: Every line of order voided -> Order automatically transitions to `REJECTED`.
- [ ] **E-041**: Food READY and uncollected -> READY alert repeats after 2 minutes.
- [ ] **E-042**: Tablet clock wrong -> All timers use server time offset.
