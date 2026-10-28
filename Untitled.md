# QR Restaurant Ordering System — Build Prompt

Oct 27, 2026 · @Make it so useful that it should be used as a Daily neet for Sho

This is the complete build brief for a QR-code table-ordering system for a dine-in restaurant in India. Guests scan a QR code on the table and order from their own phone. The kitchen screen and the admin app receive the order live. Revision 2 was hardened after an independent review for race conditions, money and GST rules, kitchen failure, prank orders and how reliably an AI agent can execute it. Sections 0 and 17 are for you, the owner. Sections 1 to 16 are for the agent.

## 0. How to use this brief (for you, the owner)

**Do not paste this whole document as one chat message.** A very long single message loses detail as the agent's context fills up. Put the brief in the repository instead, so the agent can re-read the part it needs before every slice.

1. Create an empty Git repository. Export this document as Markdown and save it as `docs/BRIEF.md`.
2. Save the operating file below as `AGENTS.md` in the repository root. If your tool uses another name, copy it there too: `CLAUDE.md` for Claude Code, `.cursor/rules/brief.mdc` for Cursor.
3. Paste the kickoff message below as your first message to the agent.
4. After each slice, read the agent's five-line report and try the feature yourself. Answer only what it asks.
5. Before the agent starts, fill in the inputs table in section 2 and confirm the tax and invoice settings in section 16 with your accountant.

**AGENTS.md** (copy exactly)

```markdown
# Operating rules
The full specification is docs/BRIEF.md. It is the source of truth. If code and brief disagree, the brief wins unless docs/DECISIONS.md records an exception.
At the start of every session: read this file, then docs/PROGRESS.md, then the sections of docs/BRIEF.md for your current slice. Never rely on your memory of the brief.
Follow the build loop in section 1 of the brief for every slice: read, test first, build, verify, attack, fix, review, record, report.
Never say done, works or passes unless you ran the command in this session and read its output. Anything you could not verify is listed as UNVERIFIED.
Money is integer paise. Every staff action is authorized on the server. Every state change writes its event row in the same transaction. Never change the tech stack.
Commands: pnpm verify (lint, types, unit, integration, build), pnpm e2e, pnpm gate:phase1, pnpm gate:phase2.
Files you maintain: docs/PROGRESS.md, docs/REQUIREMENTS.md, docs/TRACEABILITY.md, docs/DECISIONS.md, docs/BLOCKERS.md.
```

**Kickoff message** (paste as your first message)

```text
You are the lead engineer for a QR table-ordering system. The full specification is in docs/BRIEF.md and your operating rules are in AGENTS.md. Read both completely before doing anything else.

Then, in this order:
1. Create docs/REQUIREMENTS.md. Extract every must, never and always statement from sections 3 to 11 and 16 of the brief into a numbered checklist (R-001, R-002, ...). Add every row of the edge-case table in section 11 as E-001, E-002, ... This is your contract.
2. Reply with: an architecture summary, the folder structure, a phase plan with estimates, the five biggest risks and how you will handle each, and any contradiction or gap you found in the brief. Do not wait for my answer unless you found a contradiction that changes the data model.
3. Start Phase 0, then Phase 1. For every slice run the build loop from section 1, including the attack step, and keep docs/PROGRESS.md and docs/TRACEABILITY.md current.
4. Stop at the end of each phase, run its gate, write docs/REVIEW-phaseN.md and report. Do not start the next phase until I say go.

Begin now.
```

## 1. Role, operating loop and rules

You are the lead engineer of a small elite team, and you play every role yourself: solution architect, backend engineer, frontend engineer, realtime systems engineer, UI/UX designer, security engineer, QA automation engineer and DevOps engineer. Decide and deliver like a team of senior specialists. The result must be production quality, not a demo, because it handles real orders and real money in a busy restaurant.

**Mission.** Build a QR-code table ordering web system. A guest scans the QR code on the table, browses the menu in the phone browser with no app and no account, and places an order. The order reaches the kitchen screen and the admin app within one second. Staff move it through its stages, the guest watches progress live, and staff bill and close the table. The system must never lose an order, never charge a wrong amount, and never leave a table in a state that staff cannot fix from the screen.

**Working rules**

1. The brief is the contract. Read all of it before writing code. Where it is silent, apply the decision rule below and log the decision.
2. Build only what is listed. Ideas go to a Suggestions list in `docs/DECISIONS.md`, not into the code.
3. Work in vertical slices. A slice runs end to end (migration, repository, service, endpoint, screen, realtime) and can be demonstrated before the next one starts.
4. TypeScript strict mode, no `any`. One Zod schema per input, shared by client and server.
5. Money is an integer number of paise. All price, tax, discount and rounding logic lives in one pricing module defined by section 16. The cart, the order, the bill and the reports all call that same module.
6. The server never trusts the client for prices, totals, availability, table identity or role.
7. Every state change happens in one database transaction that also writes its history row and its event row. Events are published only after the commit.
8. Every endpoint authenticates, authorizes on the server, validates, applies the rate limits listed in section 10, and has a test for the wrong-role case.
9. Store time in UTC. Compute business rules in the restaurant timezone. All timers shown on screens use server time, not the device clock.
10. Ship real seed data: one demo restaurant, 8 tables, 6 categories, 30 menu items with variants and add-ons, and 3 staff users. The seed script refuses to run when `NODE_ENV` is production.
11. Commit small, with conventional commits (`feat:`, `fix:`, `test:`, `docs:`).

**Decision rule.** When the brief is ambiguous, choose in this order: (1) the option that cannot lose an order or a rupee, (2) the option that can be undone, (3) the simpler option. Record the decision with a one-line reason in `docs/DECISIONS.md` and continue.

**Stop and ask only when** you need a secret or credential, a tax or legal setting the brief does not give, an action that destroys production data, two sections of the brief contradict each other in a way that changes the data model, or a slice still fails after 5 fix passes. Always bring your proposed default so that I can answer in one word.

**The build loop** (run it for every slice)

| Step | What you do | Done when |
| --- | --- | --- |
| 1. Read | Re-read the brief sections the slice touches and the glossary in section 2. List the requirement IDs (R-xxx, E-xxx) the slice must satisfy. | The IDs are written at the top of the slice entry in `docs/PROGRESS.md` |
| 2. Test first | Write failing tests: unit tests for pure logic, integration tests for invariants and permissions, and the worked examples of section 16 whenever money is involved. | The tests exist and fail for the right reason |
| 3. Build | Implement the thinnest end-to-end slice. | The new tests pass |
| 4. Verify | Run `pnpm verify`. For screens also run the Playwright scenario on the right viewport. | No errors and no warnings, and you read the output |
| 5. Attack | Act as a hostile QA engineer. Walk every row of section 11 that touches the slice and try at least five ways to break it: double submit, two devices, stale tab, offline, wrong role, expired session, oversized input, a restart in the middle. | Every defect found has a failing test first, then a fix |
| 6. Repeat | Loop steps 4 and 5 until one complete attack pass finds nothing. Maximum 5 passes per slice. | A clean pass, or a blocker is written to `docs/BLOCKERS.md` and the slice is marked blocked |
| 7. Review | Read your own diff as a reviewer who wants to reject it: permissions, money, transactions, logs, accessibility, copy, missing tests. | The review checklist in section 14 is ticked |
| 8. Record | Update `docs/PROGRESS.md`, `docs/TRACEABILITY.md` (requirement ID, test name, file) and `docs/DECISIONS.md`. Commit. | Every requirement ID of the slice maps to at least one passing test |
| 9. Report | Send five lines: what works, how to try it, what is next, what is UNVERIFIED, decisions made. | Sent |

**Evidence and honesty rules**

- Never write done, works or passes unless you ran the command in this session and read its output. Quote the exact command and the result line in `docs/PROGRESS.md`.
- If a command fails, quote the failing line, fix the cause and run it again. Change a test only when the test is wrong, and say so in the report.
- Something you could not verify (a real phone, a real printer, a real payment) is listed as UNVERIFIED. An honest UNVERIFIED is acceptable. A false done is not.

**Banned shortcuts**

- No `any`, no `@ts-ignore`, no disabled lint rules, no skipped or deleted tests to get a green build.
- No floating-point money, no mock data in production code paths, no secrets in code, no `console.log`.
- No swallowed errors: every `catch` logs with the request id or rethrows a typed `AppError`.
- No endpoint, table or screen that is not in this brief. No TODO left in code unless it is also listed in `docs/BLOCKERS.md` or the Suggestions list.
- No permission check that exists only in the UI.
- Never change the tech stack in section 4. If you believe it is wrong, write the reason in `docs/DECISIONS.md` and ask.

**Phase gates and fresh-eyes review.** At the end of every phase: (1) run `pnpm gate:phaseN`, which runs the acceptance scenario, the invariant tests and the chaos drill from section 14; (2) review the whole phase as if another engineer wrote it: re-read sections 10, 11 and 14 against the diff, and write `docs/REVIEW-phaseN.md` listing findings as BLOCKER, MAJOR or MINOR with the fix for each; (3) fix every BLOCKER and MAJOR, re-run the gate, then stop and report.

**Context hygiene.** The brief is long. At the start of every session read `AGENTS.md` and `docs/PROGRESS.md`. Before every slice re-read the sections it touches. When your context is nearly full, write the current state to `docs/PROGRESS.md` first, so that a fresh session can continue without loss.

## 2. Product overview, scope and glossary

The product removes the wait for a waiter at dine-in tables. Guests order and track food from their phone, and the kitchen works from a live screen. It is one codebase with three surfaces.

| Surface | Users | Device | Sign-in |
| --- | --- | --- | --- |
| Customer app | Diners | Their own phone browser | None. A signed device cookie is set when they scan the QR code |
| Kitchen display (KDS) | Cooks | Wall tablet or monitor | The device is paired once by the owner and then stays signed in. Kitchen staff can also sign in with email |
| Admin and staff app | Owner, manager, waiter, cashier | Laptop, tablet or phone | Email and password, role based |

**Measurable goals**

- First menu paint in under 2 seconds after scanning, on a mid-range Android phone over 4G.
- A placed order shows on the kitchen and admin screens in under 1 second (p95), and never later than 5 seconds even if a live message is missed.
- Zero lost orders: an order is saved before the guest sees success, and every state change has an event row that clients can replay.
- Zero wrong bills: every bill total can be reproduced by the pricing module from the stored lines.
- Every table can be closed from the screen. No state needs a developer or a database edit to fix.

**In scope (v1)**

- Table QR codes, device cookies, table sessions, menu with variants and add-ons, cart, order placement, live order tracking.
- Order guard against prank and remote orders, kitchen board with sound and escalation, kitchen presence monitoring, busy mode.
- Admin dashboard, menu and table management, staff roles, waiter calls, bill requests.
- Billing with GST split, payments recorded by staff, invoice PDF, credit notes, write-offs, reports, audit log.

**Out of scope (v1)**

- Delivery and takeaway, multi-branch dashboards, loyalty and coupons.
- Online payment gateway, split bills, thermal printer drivers, per-station routing, push notifications (Phase 3).
- Alcohol and any item outside GST, because those rules are state specific. The owner's accountant decides how to bill them.
- Automatic ingredient stock deduction. v1 has a daily portion limit per item instead.

**Inputs to fill in before the agent starts.** Anything left blank uses the default.

| Input | Default |
| --- | --- |
| Restaurant trade name, legal name, address, state, phone | Demo Restaurant with placeholder details |
| GSTIN and tax scheme | None. REGULAR (tax invoice) or COMPOSITION (bill of supply with no tax). Confirm with your accountant |
| FSSAI licence number | Blank. Printed on every bill when set |
| Currency, locale, timezone | INR, en-IN, Asia/Kolkata |
| GST rate | 5 percent (2.5 CGST plus 2.5 SGST) for a standalone restaurant. Confirm with your accountant |
| Menu price mode | EXCLUSIVE (tax is added on top of menu prices) |
| Service charge | 0 percent. If used it is optional, shown as its own line, and the guest can ask to remove it |
| Round off to nearest rupee | On |
| Number of tables | 8, named T1 to T8 |
| Order guard mode | CONFIRM\_NEW\_DEVICE (see section 3) |
| Auto-accept in the kitchen | Off. The cook's Accept tap proves that someone saw the order |
| Business day cutoff | 04:00 |
| Last order time | 30 minutes before closing |
| Payment in v1 | Pay at table or counter. Staff record cash, UPI or card |
| Invoice prefix | INV |
| Languages | English now. Menu text fields are ready for Kannada and Hindi |
| Brand color | Warm orange, changeable in settings |
| Hosting | One Node container and one managed PostgreSQL in an India or Singapore region, S3-compatible image storage |

**Glossary.** Use these words exactly. They are also the names used in the code and the database.

| Term | Meaning |
| --- | --- |
| Table | A physical table with one QR code |
| Table token | The random value in the QR URL that identifies a table |
| Device | One phone browser, identified by a signed device cookie |
| Session | One party's sitting at a table, from its first order (or a staff seat action) until it is closed. A table has at most one live session |
| Verified device | A device that staff confirmed, that entered the table code, or that was auto-verified because the guard mode is OPEN. Only verified devices see the whole table |
| Order | One submission of a cart. The nth order in a session is its round |
| Line | One item with its variant, add-ons, quantity and note. A line is ACTIVE or VOID |
| Billable line | An ACTIVE line of an order in PLACED, ACCEPTED, PREPARING, READY or SERVED |
| Bill | A frozen snapshot of the billable lines of a session with tax and totals |
| Invoice | A bill that is PAID and carries an invoice number |
| Business date | The date in the restaurant timezone after applying the business day cutoff |
| KDS | Kitchen display screen |
| Paise | One hundredth of a rupee. All money is stored as integer paise |

## 3. End-to-end flow

Every order follows one path: scan, order, confirm if needed, kitchen, serve, bill, pay, close. Build exactly this flow.

```text
[QR on the table]
      | scan
      v
GET /t/<token>   read-only: validate the token, set a signed device cookie, redirect to /menu
      |
      v
Customer app: menu -> cart -> PLACE ORDER (Idempotency-Key)
      |
      v   ONE database transaction, the table row is locked
find or create the session -> register the device -> guard check -> price the lines
-> daily-limit check -> order number -> history row -> event row
      |
      +-- device not verified (guard CONFIRM_NEW_DEVICE) --> PENDING_CONFIRMATION
      |                                                      visible to waiter and admin only
      |                                   waiter confirms, the device becomes verified
      |                                                                |
      +-- device verified, or guard OPEN ---------------------------> PLACED
                                                                       |
Kitchen screen: ACCEPTED -> PREPARING -> READY --(alert to waiter)--> SERVED
                                                                       |
Guest or waiter: Request bill (session BILL_REQUESTED, ordering still open)
                                                                       |
Cashier: Prepare bill (table locked, session BILLING, bill frozen as DRAFT)
                                                                       |
Payments recorded until the amount due is 0
  -> invoice number issued -> session CLOSED (PAID) -> table FREE
```

**Step by step**

1. Staff prints the QR code for Table 5. It encodes `https://<domain>/t/<tableToken>`. The token is random with at least 128 bits and never contains the table number. The domain must be one the owner controls permanently (section 10).
2. The guest scans it with the phone camera. The server only reads: it checks that the token belongs to an enabled table, sets a signed device cookie that holds a random device id and the table id, and redirects to `/menu`. It writes nothing to the database, so link previews, antivirus scanners and Google Lens never create a session.
3. The guest browses the menu and builds a cart in the browser. Every page shows the restaurant name and Table 5.
4. On Place order the server runs the single transaction described in section 9. The first order of a table creates its session. The database guarantees one live session per table, so two phones ordering at the same moment end up in the same session.
5. The order guard decides what the order becomes. In the default mode CONFIRM\_NEW\_DEVICE, the first order of a device that staff have not confirmed is held as PENDING\_CONFIRMATION. Only waiters and the admin app see it, never the kitchen. A waiter checks that the guest is really at the table and taps Confirm, which moves the order to PLACED and marks the device as verified. Later orders from a verified device go straight to PLACED.
6. A PLACED order appears on the kitchen screen with a chime, and the guest sees Order received. It is not Confirmed until the kitchen taps Accept, unless auto-accept is on and a kitchen screen is online. If nobody accepts it in time, the escalation in section 7 starts.
7. The kitchen moves the order to PREPARING and then READY. READY alerts the waiters with a sound and the table label. A waiter delivers it and marks it SERVED.
8. The guest can order again at any time while the session is OPEN or BILL\_REQUESTED. Each new order is a new round in the same session.
9. The guest taps Request bill, or a waiter does. The session becomes BILL\_REQUESTED. Ordering stays open until the cashier freezes the bill.
10. The cashier taps Prepare bill. In one transaction the table is locked, every billable line is copied into a DRAFT bill, and the session becomes BILLING. From then on new orders are refused with SESSION\_LOCKED and the guest sees: Your bill is being prepared. Please ask staff to add more items. An order held in PENDING\_CONFIRMATION must be confirmed or rejected before the bill can be prepared. A manager can reopen a BILLING session with a reason.
11. The cashier records one or more payments. Each payment needs an idempotency key and may not exceed the amount due. When the amount due reaches 0, the same transaction allocates the next invoice number, marks the bill PAID, closes the session as PAID and frees the table.
12. After closing, the old device cookies cannot order. The next scan starts a new session at its first order.
13. If a party leaves without paying, a manager closes the session as WRITTEN\_OFF with a reason. It is audited and excluded from sales.
14. A mistake found after payment is corrected with a credit note (section 16), never by editing a paid bill.

**Order state machine.** This table is the only source of truth for who may move an order where.

| From | To | Who may do it | Notes |
| --- | --- | --- | --- |
| PENDING\_CONFIRMATION | PLACED | Waiter, manager, owner | The device becomes verified |
| PENDING\_CONFIRMATION | REJECTED | Waiter, manager, owner | Reason required |
| PENDING\_CONFIRMATION or PLACED | CANCELLED | The guest who placed it, inside the cancel window (default 60 s) | Not possible once the kitchen accepted |
| PLACED | ACCEPTED | Kitchen, manager. The system, only if auto-accept is on and a kitchen screen is online |  |
| PLACED, ACCEPTED or PREPARING | REJECTED | Kitchen, manager | Reason required, for example an ingredient ran out |
| PLACED, ACCEPTED, PREPARING or READY | CANCELLED | Manager, owner | Reason required |
| ACCEPTED | PREPARING | Kitchen, manager |  |
| PREPARING | READY | Kitchen, manager | Alerts the waiters |
| READY | SERVED | Waiter, manager |  |
| ACCEPTED, PREPARING or READY | The previous status | Kitchen within 60 s of the forward move. Manager any time before SERVED | Undo for a mis-tap. The guest sees the status go back |
| SERVED | READY | Manager within 10 minutes | Recall |
| Any open status | REJECTED | The system | Automatic when every line of the order is VOID |

- REJECTED and CANCELLED are final. Every transition checks the order's `version`, and a stale write returns 409.
- Every transition appends a row to the order history (actor, from, to, reason, time) and an event row, in the same transaction.
- Orders in PENDING\_CONFIRMATION, REJECTED or CANCELLED never reach a bill.
- An invalid transition returns 409 with the code INVALID\_TRANSITION.

**Order guard modes.** The owner picks one in settings.

| Mode | What happens | Protects against | Cost |
| --- | --- | --- | --- |
| CONFIRM\_NEW\_DEVICE (default) | A device's first order is held until a waiter confirms it | Prank and remote orders, and strangers who join a stale session | One waiter tap per device per sitting |
| TABLE\_CODE | Staff seat the table, which creates the session and a 4-digit code. The guest enters the code once. Without an open session, ordering is refused | Remote orders and strangers | Staff must seat every table |
| OPEN | Any scan orders immediately | Nothing | None. Use only after the restaurant trusts its crowd |

**Session states**

| Status | Meaning | New orders | Moves to |
| --- | --- | --- | --- |
| OPEN | Party seated and ordering | Yes | BILL\_REQUESTED, BILLING, CLOSED |
| BILL\_REQUESTED | Guest or waiter asked for the bill | Yes | BILLING, OPEN (the waiter withdraws the request) |
| BILLING | Bill frozen as DRAFT | No, SESSION\_LOCKED | CLOSED, OPEN (manager reopens with a reason) |
| CLOSED | Reason PAID, WRITTEN\_OFF, NO\_CHARGE or EXPIRED | No | Nothing |

- NO\_CHARGE: every order was rejected or cancelled, or the bill total is 0. EXPIRED: a session without billable lines and without activity for `session_idle_minutes` (default 120) is closed by a scheduled job.
- A session with billable lines never closes by itself. After 90 minutes without activity and with every order served, it appears in the Needs attention list so that a waiter can check on it. That list is how walk-outs are found.

## 4. Architecture, stack and realtime

Build a modular monolith: one Next.js app that serves all three surfaces and the API, one Node process and one PostgreSQL database. For one restaurant this is simpler, cheaper and easier to keep correct than separate services. Keep clear module boundaries so that it can be split later.

| Layer | Choice | Reason |
| --- | --- | --- |
| Framework | Next.js (App Router, latest stable), React, TypeScript strict, Node runtime | One codebase for the three surfaces and the API |
| UI | Tailwind CSS, shadcn/ui (Radix), lucide-react | Fast, accessible, consistent |
| Database | PostgreSQL 16 or newer, managed, in a Mumbai or Singapore region | Constraints, row locks, sequences and SQL reports protect orders and money |
| Data access | Drizzle ORM, drizzle-kit SQL migrations committed to the repo, `postgres` driver | Typed queries, partial unique indexes, plain SQL where a lock is needed |
| Validation | Zod, shared by client and server | One source of truth for input rules |
| State | Server components for the menu, TanStack Query in the staff apps, Zustand with persist for the cart | Small customer bundle |
| Staff auth | `jose` JWT in an httpOnly, Secure, SameSite=Lax cookie. argon2id password hashes (`@node-rs/argon2`) | Standard, audited building blocks |
| Device identity | Signed httpOnly cookie (HMAC-SHA256) holding a random device id and the table id | No login for guests and no database write on scan |
| Realtime | Server-Sent Events plus an `events` table used as a transactional outbox | One-way updates are enough, and every event can be replayed |
| Images | S3-compatible storage (Cloudflare R2 or AWS S3) behind a CDN, `sharp` for resizing and WebP | Store URLs only |
| QR and PDF | `qrcode` for SVG and PNG, `@react-pdf/renderer` for the QR sheet and invoices | Server side, no browser dependency |
| Rate limiting | `rate-limiter-flexible`, in memory for v1 | One app instance |
| Observability | pino logs with request ids, Sentry with URL scrubbing, an uptime check on `/api/health` | Debuggable in production |
| Tooling | Node 22 LTS, pnpm, ESLint, Prettier, Husky, Vitest, Testcontainers, Playwright, k6 | Quality gates |

**Why PostgreSQL and not MongoDB.** This product is transactional and relational: one live session per table, a bill tied to orders and payments, gapless invoice numbers per financial year, and reports by category, hour and payment method. PostgreSQL enforces those rules in the database itself (partial unique indexes, foreign keys, check constraints, row locks, append-only triggers), so a race in the application code cannot break them. A document database needs multi-document transactions and change streams just to reach the same safety.

**Deployment shape.** v1 runs exactly one app instance. A restaurant has tens of concurrent users, and one instance keeps the in-memory rate limiter correct. Because events live in the database and every instance polls them, a second instance can be added later without redesign, apart from moving the rate limiter to a shared store. Do not deploy to a serverless platform, because the live streams need a persistent process. Use a Docker container on a VPS or a container host (Railway, Render, Fly or similar) behind HTTPS.

**Backend layers**

1. Route handler: authenticate, authorize, validate with Zod, call a service, map errors to the JSON error format. No business rules here.
2. Service: business rules, transactions, event writing. No HTTP types inside.
3. Repository: all SQL, always scoped by `restaurant_id`, with row locks where this brief says so.
4. Pure modules with unit tests: `pricing` (section 16), `state-machine` (section 3), `business-date`, `money`, `eta`.

**Realtime design**

- Every state change inserts a row into `events` in the same transaction as the change. Nothing is published for a change that rolled back, and a committed change always has its event.
- After the commit the service calls `bus.wake()`. One poller per process reads `events` with an id greater than the last dispatched id, immediately on wake and also every second, and dispatches to the subscribers in that process. A missed wake costs at most one second.
- Each SSE message carries `id: <event id>`. On reconnect the browser sends `Last-Event-ID`, and the server replays the events that subscriber may see. Events are kept for 48 hours. If the gap is larger, the client refetches everything.
- Events carry only ids and small facts. Clients refetch the data they display.
- A staff connection receives the channels its role allows. A guest connection receives only events of its own session, and an unverified device only events of its own orders.

| Channel | Subscribers |
| --- | --- |
| `kitchen` | Kitchen screens and kitchen staff |
| `front` | Owner, manager, waiter, cashier |
| `session:{id}` | The devices of that session, filtered by verification |
| `menu` | Every guest connection and every staff connection |

| Event | Payload | Channels |
| --- | --- | --- |
| `order.created` | order id, number, status, session id | `front` at creation. `kitchen` at the moment the order first becomes PLACED, whether placed directly or confirmed from PENDING\_CONFIRMATION |
| `order.updated` | order id, status, version, table label | `kitchen`, `front`, `session:{id}` |
| `session.updated` | session id, status, table label | `front`, `session:{id}` |
| `call.created`, `call.updated` | call id, type, table label | `front` |
| `menu.updated` | item id, availability | `menu` |
| `settings.updated` | what changed (paused, busy delay, guard mode) | all |
| `kds.presence` | online or offline | `front` |
| `app.version` | build id | all, so that open pages reload after a deploy |

**Making SSE work behind real proxies**

- In the route set `runtime = 'nodejs'` and `dynamic = 'force-dynamic'`.
- Send `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `Connection: keep-alive` and `X-Accel-Buffering: no`. Do not compress this route.
- Send a comment heartbeat every 20 seconds, which stays under the idle timeouts of common proxies and CDNs. Send `retry: 3000`.
- Remove all listeners when `request.signal` aborts, so that closed connections do not leak.
- Create the bus and the poller once, on `globalThis`, from `instrumentation.ts`. Next.js may bundle each route separately, so a module-level variable is not shared between routes.

**Rules for every client**

- Refetch current data after every connect and reconnect, when the tab becomes visible again (`visibilitychange`), and when the browser comes back online. Phones suspend background tabs, so a guest who locks the phone must see the right status on return.
- Reconnect with exponential backoff from 1 to 30 seconds. After three failures in a row, poll every 5 seconds and show a Reconnecting label.
- The kitchen and admin screens also reconcile every 3 seconds by asking for orders changed since their last known version.

## 5. Data model

Use PostgreSQL with the Drizzle schema in `src/db/schema/` and one committed SQL migration per change in `drizzle/`. Conventions: snake\_case names, `uuid` primary keys (except `events.id`, a `bigserial`), `created_at` and `updated_at` as `timestamptz`, and every business table carries `restaurant_id` so the system is multi-tenant ready even though v1 runs one restaurant. Every money column is an integer number of paise. Foreign keys are `ON DELETE RESTRICT`, never `CASCADE`. Only tables, categories, menu items and users use soft delete (`deleted_at`). Order lines are snapshots: a later menu edit never changes a past order.

| Table | Key columns | Constraints and indexes |
| --- | --- | --- |
| `restaurants` | id, name, legal\_name, slug, logo\_url, brand\_color, address, state\_code, phone, gstin, fssai\_number, tax\_scheme (REGULAR or COMPOSITION), timezone | unique slug |
| `restaurant_settings` | restaurant\_id, default\_tax\_rate\_bp, price\_mode (EXCLUSIVE or INCLUSIVE), service\_charge\_bp, service\_charge\_taxable, round\_off\_enabled, invoice\_prefix, opening\_hours (jsonb), last\_order\_minutes\_before\_close, business\_day\_cutoff, order\_guard\_mode, auto\_accept, cancel\_window\_seconds, session\_idle\_minutes, max\_active\_orders, max\_order\_value, max\_session\_value, max\_lines\_per\_order, max\_qty\_per\_line, ack\_warn\_seconds, kds\_warn\_minutes, kds\_late\_minutes, kitchen\_capacity\_tickets, minutes\_per\_extra\_ticket, extra\_delay\_minutes, ordering\_paused\_until, pause\_message | one row per restaurant |
| `users` | id, restaurant\_id, name, email, password\_hash, pin\_hash, role (OWNER, MANAGER, KITCHEN, WAITER, CASHIER), is\_active, token\_version, last\_login\_at, deleted\_at | unique (restaurant\_id, email) |
| `paired_devices` | id, restaurant\_id, kind (KDS or STAFF), name, token\_hash, pairing\_code\_hash, pairing\_expires\_at, last\_seen\_at, revoked\_at | unique token\_hash |
| `tables` | id, restaurant\_id, label, zone, capacity, token, is\_enabled, deleted\_at | unique token. Unique (restaurant\_id, label) where deleted\_at is null |
| `categories` | id, restaurant\_id, name, translations (jsonb), sort\_order, is\_active, available\_from, available\_to, deleted\_at | (restaurant\_id, sort\_order) |
| `menu_items` | id, restaurant\_id, category\_id, name, description, translations (jsonb), image\_url, base\_price, is\_veg, allergens (text array), tags (text array), spice\_level, tax\_rate\_bp (null means the restaurant default), sac\_code (default 996331), availability (AVAILABLE, SOLD\_OUT\_TODAY, OFF), sold\_out\_until, daily\_limit, sold\_today, prep\_time\_minutes, sort\_order, deleted\_at | (restaurant\_id, category\_id, sort\_order). Full-text index on name and description |
| `menu_item_variants` | id, item\_id, name, price (absolute), sort\_order, is\_available | (item\_id, sort\_order) |
| `modifier_groups`, `modifier_options`, `menu_item_modifier_groups` | group: name, min\_select, max\_select. Option: group\_id, name, price\_delta, is\_available, sort\_order. Link: item\_id, group\_id, sort\_order | check min\_select <= max\_select |
| `table_sessions` | id, restaurant\_id, table\_id, status, closed\_reason, opened\_by (CUSTOMER or a user id), table\_code\_hash, opened\_at, last\_activity\_at, bill\_requested\_at, closed\_at, closed\_by, guest\_name, guest\_phone | One live session per table (see below). (restaurant\_id, status, last\_activity\_at) |
| `session_devices` | id, session\_id, device\_id, label (Guest 1, Guest 2), verified\_at, verified\_by, blocked\_at, first\_seen\_at | unique (session\_id, device\_id) |
| `orders` | id, restaurant\_id, session\_id, device\_id, table\_id, table\_label\_at\_order, business\_date, order\_number, round\_no, status, version, source (CUSTOMER or STAFF), placed\_by\_user\_id, note, subtotal, eta\_minutes, rejection\_reason, placed\_at, accepted\_at, ready\_at, served\_at | unique (restaurant\_id, business\_date, order\_number). (restaurant\_id, status, placed\_at). (session\_id) |
| `order_lines` | id, order\_id, item\_id, name, variant\_name, modifiers (jsonb snapshot of name and price\_delta), unit\_price, qty, line\_total, tax\_rate\_bp, sac\_code, note, is\_allergy\_note, status (ACTIVE or VOID), void\_reason | check qty between 1 and 99 |
| `order_history` | id, order\_id, from\_status, to\_status, actor\_type (CUSTOMER, STAFF, SYSTEM), actor\_id, reason, at | Append-only |
| `bills` | id, restaurant\_id, session\_id, status (DRAFT, PAID, VOID), subtotal, discount, discount\_reason, discount\_approved\_by, service\_charge, taxable\_total, cgst\_total, sgst\_total, round\_off, total, paid\_total, price\_mode, tax\_scheme, invoice\_number, invoice\_fy, issued\_at | One live bill per session (see below) |
| `bill_lines` | id, bill\_id, order\_line\_id, name, qty, line\_total, tax\_rate\_bp, sac\_code | Snapshot |
| `bill_tax_lines` | id, bill\_id, tax\_rate\_bp, taxable\_value, cgst, sgst | One row per tax rate |
| `payments` | id, bill\_id, method (CASH, UPI, CARD, OTHER), kind (PAYMENT, REFUND, REVERSAL), amount, reference, reverses\_payment\_id, taken\_by, taken\_at | Append-only. check amount > 0 |
| `credit_notes` | id, restaurant\_id, bill\_id, note\_number, fy, reason, taxable\_value, cgst, sgst, total, created\_by, created\_at | unique (restaurant\_id, fy, note\_number). Append-only |
| `calls` | id, restaurant\_id, session\_id, type (WAITER or BILL), status (OPEN or DONE), handled\_by, created\_at, handled\_at | (restaurant\_id, status, created\_at) |
| `events` | id (bigserial), restaurant\_id, channel, type, session\_id, payload (jsonb, ids only), created\_at | (restaurant\_id, id). Purged after 48 hours |
| `idempotency_keys` | scope\_type, scope\_id, key, request\_hash, response (jsonb), created\_at | Primary key (scope\_type, scope\_id, key). Purged after 48 hours |
| `counters` | restaurant\_id, key, value | Primary key (restaurant\_id, key) |
| `audit_logs` | id, restaurant\_id, actor\_id, action, entity, entity\_id, before (jsonb), after (jsonb), ip, at | Append-only. Kept at least 6 years |

**Constraints the database itself must enforce.** Create them in the migrations and write a test that tries to violate each one.

1. One live session per table: a partial unique index on `table_sessions (table_id)` where status is OPEN, BILL\_REQUESTED or BILLING.
2. One live bill per session: a partial unique index on `bills (session_id)` where status is DRAFT or PAID.
3. A paid bill has an invoice number: `CHECK (status <> 'PAID' OR invoice_number IS NOT NULL)`, and unique (restaurant\_id, invoice\_fy, invoice\_number).
4. Unique (restaurant\_id, business\_date, order\_number) on `orders`.
5. Append-only tables (`payments`, `audit_logs`, `order_history`, `credit_notes`) have a trigger that raises an error on UPDATE and DELETE.
6. Value checks: amounts are not negative, quantities are 1 to 99, tax rates are 0 to 10000 basis points, `min_select <= max_select`.
7. Every status, role and mode column is a PostgreSQL enum or has a CHECK constraint.
8. Tenant scope: every repository function takes `restaurant_id`. A test scans the repository files and fails on any query without it.

**Decisions that remove guesswork**

- A variant price is absolute. `base_price` is used only when the item has no variants. A modifier option's `price_delta` is added to the unit price.
- Orders store only `subtotal`. Discount, service charge, tax, round off and totals exist only on bills. The guest sees an Estimated total that comes from the same pricing module (section 16).
- `order_number` resets on every business date and is shown as `#023`. `round_no` is the nth order of the session and is shown as Round 2.
- Regenerating a table's QR replaces its `token`. Existing device cookies keep working, because they are bound to the table and the session, not to the token. To remove a device, block it on the session.
- The cart lives in localStorage under `cart:<table_id>:<device_id>` and is cleared only after the server confirms the order.
- `opening_hours` looks like `{"mon":[{"open":"11:00","close":"23:30"}]}`. A close time earlier than the open time means the next day. A day may have several ranges.
- SOLD\_OUT\_TODAY sets `sold_out_until` to the next business day cutoff. The ordering query treats an expired value as AVAILABLE, and a scheduled job also resets it. OFF stays until a person turns it on.
- There is no shift entity in v1. A cashier's own totals are the payments taken by that user on the current business date.
- Order, invoice and credit-note numbers come from `counters` with `INSERT ... ON CONFLICT (restaurant_id, key) DO UPDATE SET value = counters.value + 1 RETURNING value`, inside the same transaction as the row that uses the number, so a rollback leaves no gap. Keys: `order:<business_date>`, `invoice:<fy>`, `credit_note:<fy>`.
- The financial year runs from 1 April to 31 March and is written like `26-27`.
- Retention: keep bills, payments, credit notes and audit logs for at least 6 years. Move orders older than 12 months to an archive table that reports can still read. Delete guest name and phone 90 days after the session closes.

## 6. Customer web app

The customer app is mobile first, needs no install and no login, and must feel fast on a slow 4G connection in a crowded restaurant.

| Route | Purpose |
| --- | --- |
| `/t/[token]` | QR entry. Read-only: validates the token, sets the device cookie, redirects to `/menu` |
| `/menu` | Browse, search and add items |
| `/cart` | Review, edit and place the order |
| `/order/[id]` | Live tracking of one order |
| `/orders` | Orders of this table (or of this device only, if it is not verified), the estimated bill, Request bill, Call waiter |
| `/join` | Table code entry. Used only in TABLE\_CODE mode |
| `/closed` | Friendly page for an invalid QR, a closed session or a closed restaurant |

**QR entry and error states**

- Unknown or disabled table: This QR code is not valid any more. Please ask our staff. Nothing is created.
- Restaurant paused, closed, or past the last order time: the menu can still be browsed, ordering is disabled, and a banner shows the pause message or the next opening time.
- Closed session: This table's bill is closed. Scan the QR code again to order.
- Always show the restaurant name and the table label in the header, so a guest can notice a QR code that belongs to somewhere else.

**Menu page**

- Header with the restaurant name, Table 5, a search icon, a language switch and a Call waiter icon.
- Sticky category chips that follow the scroll position and jump to a section when tapped. Categories outside their time window (for example Breakfast) are hidden or marked Available from 7:00.
- Veg and non-veg filter with the standard green and red markers. Search is debounced by 200 ms and matches name, description and tags.
- Item card: image, name, price, veg marker, tags such as Bestseller, allergen icons, a two-line description, and an ADD button that becomes a quantity stepper.
- SOLD\_OUT\_TODAY and OFF items are greyed with a label and cannot be added. A limited item shows Only 3 left when its remaining portions are 5 or fewer. Availability updates live from the `menu.updated` event.
- An item with variants or add-ons opens a bottom sheet. Enforce `min_select` and `max_select` for each add-on group, show the live price, and allow a note of up to 140 characters.
- Sticky bottom bar: 2 items, estimated total, View cart.
- A short notice: Please tell your waiter about allergies.

**Cart page**

- Change quantity, remove a line, edit a line note, add a note for the whole order (up to 200 characters). A checkbox marks a note as an allergy or dietary note, which the kitchen sees highlighted.
- The price breakdown comes from `POST /api/public/cart/quote`, which calls the same pricing module as the bill (section 16). It is labelled Estimated, because the final bill is computed when the cashier prepares it.
- A banner shows the busy message when the kitchen is busy, for example Kitchen is busy. Expect about 35 minutes.
- If an item became unavailable or a price changed, show an inline warning on that line and block Place order until the guest removes the line or accepts the new price.
- Limits apply: at most 50 lines per order and 20 per line (settings). Beyond that, show a clear message and suggest placing a second order.
- Optional fields: guest name and phone, with this line under them: Used only for this visit. Deleted after 90 days. Never required.
- Place order creates an idempotency key when the cart is confirmed for sending and stores it with a hash of the cart. If the cart changes, a new key is created. The button disables while sending. On failure it shows a clear error with Retry and keeps the cart. The cart is cleared only after the server confirms the order.

**What the guest sees for each status**

| Status | Text on the tracking page |
| --- | --- |
| PENDING\_CONFIRMATION | A waiter will confirm your table shortly. Need help? Call waiter |
| PLACED | Order received. Waiting for the kitchen to confirm |
| ACCEPTED | Confirmed by the kitchen |
| PREPARING | Being prepared, with the estimated time range |
| READY | Ready and on its way to your table |
| SERVED | Served. Enjoy your meal |
| REJECTED | Sorry, we could not make this order, the reason, and an Order something else button |
| CANCELLED | Cancelled |
| A VOID line | Not available: item name. It was removed from your order and your total is updated |

**Order tracking**

- A stepper for Received, Confirmed, Preparing, Ready, Served, updated live. The status text sits in an `aria-live` region.
- The estimated time range comes from the server (section 7), not from the phone.
- Cancel is visible only while the order is PENDING\_CONFIRMATION or PLACED and the cancel window (default 60 seconds) has not passed.
- If an order stays PLACED longer than the acknowledgement warning time, show: Taking longer than usual, with a Call waiter button.
- Under every order show Add more items.

**Devices and the session**

- A second phone that scans the same QR joins the same session as a new device. Carts stay on each device.
- A device that staff have not verified sees only its own orders and cannot see the table's bill. After staff confirm its first order, or after it enters the table code, it sees the whole table.
- Refreshing the page or coming back later restores everything from the device cookie, as long as the session is open.
- Call waiter and Request bill are separate buttons with separate limits (one of each per 2 minutes per session). Each shows a confirmation toast.

**Connection and failure behavior**

- The page works inside in-app browsers such as WhatsApp, Instagram and Google Lens, and does not depend on features they lack.
- When the phone is offline, show an Offline banner, keep the cart, and disable Place order. Never show a success that the server did not confirm.
- When the tab returns to the foreground, resync immediately (section 4).
- All text goes through `next-intl`. Kannada and Hindi can be added without code changes.

## 7. Kitchen display screen

The kitchen screen lives at `/kitchen` for paired kitchen devices and for users with the role KITCHEN, MANAGER or OWNER. It must be readable from two metres away, usable with wet or gloved hands, and must never let an order go unnoticed.

**Pairing and sign-in**

- An owner or manager opens Settings, Devices, Pair kitchen screen. The system shows a one-time 8-character code that is valid for 10 minutes.
- On the tablet, `/kitchen/pair` takes that code and stores a long-lived device token in an httpOnly cookie. Only a hash of the token is stored in `paired_devices`. The device stays signed in until a manager revokes it.
- If any request from the kitchen screen returns 401, show a full-screen red alarm with a repeating sound: Kitchen screen signed out. Ask a manager to pair it again. Never show a silent login page.

**Layout**

- Full-screen dark theme with large type. Three columns: NEW, PREPARING, READY. The oldest ticket is first in each column. NEW holds PLACED and ACCEPTED orders.
- Header with counts, average prep time today, the connection state (Live, Reconnecting, Offline), a fullscreen button and the busy-mode controls. Orders in PENDING\_CONFIRMATION are never shown here.

**Ticket card**

- Order number and table label in very large type. The label is read from the session, so it is correct after a table move.
- A live timer since the order was placed: green below `kds_warn_minutes` (default 8), amber until `kds_late_minutes` (default 15), red after that.
- Each line shows the quantity in bold, the item name, the variant, the add-ons indented, and the veg marker. VOID lines are struck through with their reason.
- Guest notes appear in a highlighted box. A note marked as an allergy appears in a red box at the top of the ticket.
- A Round 2 tag when the session already had an earlier order.

**Actions**

- One large primary button per ticket that moves it forward: Accept, Start preparing, Mark ready. Buttons are at least 56 px tall. Which moves are allowed is decided by the state machine in section 3.
- Reject opens a sheet with preset reasons (Out of stock, Kitchen busy, Other) and a free text field.
- Item unavailable on a line voids that line with a reason and sets the menu item to SOLD\_OUT\_TODAY. The totals are recalculated and the guest is told. If it was the last active line, the order becomes REJECTED.
- Every action is optimistic and shows an Undo toast for 60 seconds, which uses the backward move allowed to the kitchen in section 3. If the server answers 409, roll back and refresh the ticket.
- A history drawer lists orders finished in the last 2 hours.

**Acknowledgement, presence and escalation**

- Each kitchen screen sends a heartbeat every 15 seconds. The kitchen is online when at least one non-revoked device or signed-in kitchen user was seen in the last 45 seconds.
- When the restaurant is open and no kitchen is online, the admin and waiter apps show a red banner, Kitchen screen offline, with a repeating sound. Auto-accept is ignored while no kitchen is online, and guests keep seeing Order received, waiting for the kitchen.
- A PLACED order that is not accepted within `ack_warn_seconds` (default 90) flashes on the kitchen screen and raises a banner and a sound on the front screens. After three times that time it raises a continuous alarm there and moves to the top of Needs attention.
- Two kitchen screens can run at once. Both show the same state, and the order version settles simultaneous taps.

**Time, ETA and busy mode**

- Every API response carries `server_now`. Screens compute the offset to their own clock and use it for every timer, so a wrong tablet clock does not matter.
- `eta_minutes = max(prep_time_minutes of the order's lines) + queue_delay + extra_delay_minutes`, where `queue_delay = max(0, active_tickets - kitchen_capacity_tickets) * minutes_per_extra_ticket` and `active_tickets` counts orders in PLACED, ACCEPTED and PREPARING. Guests see the range from `eta_minutes` to `eta_minutes + 5`. It is computed when the order is placed and again when it is accepted.
- Busy mode: a manager can add extra delay (10, 20 or 30 minutes) and can pause ordering for a chosen time with a message. Guests see the change at once through `settings.updated`.

**Sound, power and printing**

- An Enable sound button unlocks audio, because browsers block autoplay. Until it is tapped, show a red banner, Sound is off.
- A new order plays a chime that repeats every 10 seconds until someone taps the ticket. Volume is a setting.
- Request the Screen Wake Lock, and request it again when the tab becomes visible.
- The screen is a PWA that caches only static files, never API responses. After a deploy it receives `app.version` and reloads itself when no ticket has been touched for 10 seconds.
- A Print KOT button renders an 80 mm layout with print CSS and `window.print()`. This opens the browser print dialog. Silent printing needs the browser's kiosk-printing mode or Phase 3 printer support. A print failure never blocks an order.

**Availability and portions**

- Item availability has two quick actions: Out for today (SOLD\_OUT\_TODAY) and Off until I turn it on (OFF). Both reach guests live.
- An item with a daily limit shows the portions remaining, and the system never sells more than the limit (section 9).

**Stations.** v1 has exactly one kitchen station. Station filters and per-station routing are Phase 3, so do not build them now.

**Resilience and performance**

- When the connection drops, keep the last known tickets, mark them stale, and block actions until the connection returns.
- After reconnecting, refetch everything and play the chime for any order that arrived while offline.
- Handle 100 active tickets without lag. Run an 8-hour soak test with no memory growth and no duplicate listeners.

## 8. Admin and staff app

The admin app lives under `/admin` and is responsive from tablet to desktop. The waiter console is usable on a phone. Access is decided on the server by role. Hiding a menu entry is never the security control.

| Feature | Owner | Manager | Waiter | Cashier | Kitchen |
| --- | --- | --- | --- | --- | --- |
| Kitchen board: accept, prepare, ready, reject, void a line, undo within 60 s | Yes | Yes | No | No | Yes |
| Mark an order served | Yes | Yes | Yes | No | No |
| Confirm held orders (PENDING\_CONFIRMATION) | Yes | Yes | Yes | No | No |
| Live orders, table map, Needs attention | Yes | Yes | Yes | Yes | No |
| Seat a table, take an order for a guest | Yes | Yes | Yes | No | No |
| Request bill, clear calls | Yes | Yes | Yes | Yes | No |
| Menu and prices | Yes | Yes | Availability only | No | Availability only |
| Tables and QR codes | Yes | Yes | View | No | No |
| Cancel orders, undo or recall after the kitchen window | Yes | Yes | No | No | No |
| Move a session, block a device, reopen a BILLING session | Yes | Yes | No | No | No |
| Prepare bill, record payments, issue invoice | Yes | Yes | No | Yes | No |
| Discount | Yes | Yes | No | Only with a manager PIN approval | No |
| Payment reversal, credit note, write-off | Yes | Yes | No | No | No |
| Reports | Yes | Yes | No | Own payments today only | No |
| Staff, devices, settings | Yes | Staff below their own role. No tax settings | No | No | No |
| Audit log | Yes | Read only | No | No | No |

**Modules**

1. **Dashboard and live orders.** A confirmation queue at the top for held orders, with a sound. Active orders with filters. A table map where each table is Free, Seated, Bill requested, Billing or Needs attention. An alerts panel for waiter calls, bill requests, orders waiting for acknowledgement, orders READY and waiting for a waiter, and Kitchen screen offline. Today's numbers: orders, net sales, average prep time, active tables.
2. **Menu management.** Create, edit, reorder (drag and drop) and soft delete categories, items, variants and add-on groups. Image upload that validates the real file type, resizes to 800 px and converts to WebP. A one-tap availability control (Out for today, Off, Available). Daily portion limits. Time windows for categories. Duplicate an item. CSV import and export. Translations for Kannada and Hindi.
3. **Tables and QR codes.** Create tables one by one or in bulk (T1 to T20), set zones, enable or disable. Show the QR preview, download PNG or SVG, and print an A4 sheet with six table tents per page showing the logo, the table label, Scan to order and the web address in small type. Regenerate QR invalidates the old code after a confirmation dialog.
4. **Sessions and Needs attention.** Seat a table (this creates the session and, in TABLE\_CODE mode, shows the 4-digit code). Move a session to a free table (merging into an occupied table is not supported in v1). Block a device or a session. Close a session as NO\_CHARGE. Write off a session (manager, reason required). Reopen a BILLING session (manager, reason required). The Needs attention list shows sessions idle for 90 minutes with all orders served, orders waiting for acknowledgement, and held orders waiting for a waiter.
5. **Waiter console.** A table grid. Take an order for a guest with the same ordering screens (`source = STAFF`). Confirm held orders. Mark orders served. Clear calls. A READY alert with a sound and the table label, repeated after 2 minutes if nobody marks it served.
6. **Billing.** Prepare bill, itemized with the CGST and SGST split exactly as defined in section 16. Discounts need a reason and a manager (or a manager PIN approval for the cashier). Record one or several payments (cash, UPI, card, other). When the amount due is 0 the system issues the invoice, closes the session and frees the table. The invoice PDF shows the legal name, address, GSTIN, FSSAI number, SAC, invoice number, date and the tax split. Corrections: a manager can reverse a payment recorded with the wrong method, and can issue a credit note for a return or refund.
7. **Staff and devices.** Create staff, assign a role, deactivate, reset a password, set a 6-digit PIN that works only on paired devices. Pair and revoke kitchen screens and staff devices. Deactivating a user takes effect on their very next request.
8. **Reports.** All by business date, with a date range and CSV export. Net sales (the taxable value of paid invoices minus credit notes), tax collected (CGST and SGST), gross collection, sales by category, top and bottom items, a peak hours heatmap, average prep time, the rejected and cancelled rate, the payment method split, write-offs, and a GST summary. A cashier sees only their own payments for the current business date.
9. **Settings.** Restaurant profile and logo, GSTIN, FSSAI number, tax scheme and rate, price mode, service charge, round off, invoice prefix, opening hours, last order time, business day cutoff, order guard mode, auto-accept, cancel window, order limits, kitchen thresholds, busy mode and pause ordering. Changes to tax settings need the owner and are written to the audit log.
10. **Audit log.** A searchable list of price changes, voids, discounts, payment reversals, credit notes, write-offs, role changes, QR regeneration, device pairing and settings changes.

## 9. API design

Use REST with JSON under `/api`. Success responses are `{ "data": ... }`. Errors are `{ "error": { "code", "message", "details" } }` with the right HTTP status: 400 validation, 401 not signed in, 403 wrong role, 404, 409 conflict or invalid state, 422 semantic error, 429 rate limit, 503 database unavailable. Validate every input with Zod and reject unknown keys. Use cursor pagination for lists. Every response carries `X-Request-Id` and `X-Server-Time` (epoch milliseconds, called `server_now` in section 7). Write `docs/API.md` and keep it current.

**Idempotency.** Endpoints marked (idem) require an `Idempotency-Key` header holding a UUID. The key is scoped to the device for guest calls and to the user for staff calls. The server stores the key with a SHA-256 hash of the request body. The same key with the same body returns the stored response with the header `Idempotent-Replay: true` and does not repeat any side effect, including events. The same key with a different body returns 422 IDEMPOTENCY\_KEY\_REUSED. A concurrent duplicate waits on the table lock and then returns the stored response. Keys are kept for 48 hours.

**Guest endpoints** (device cookie)

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/t/{token}` (page) | Validate the token read-only, set the device cookie, redirect to `/menu` |
| GET | `/api/public/context` | Restaurant, table label, whether ordering is open, paused or past the last order time, the busy message, guard mode, whether this device is verified, session status |
| GET | `/api/public/menu` | Categories, items, variants, add-ons, availability. ETag, cached for 30 seconds |
| POST | `/api/public/cart/quote` | Estimated price of a cart from the pricing module |
| POST | `/api/public/orders` (idem) | Place an order |
| GET | `/api/public/orders` | This device's orders, or the table's orders if verified, plus the estimated bill |
| GET | `/api/public/orders/{id}` | One order |
| POST | `/api/public/orders/{id}/cancel` | Cancel inside the cancel window |
| POST | `/api/public/calls` | Body `type` is WAITER or BILL. Separate limits for each |
| POST | `/api/public/verify-code` | Enter the table code (TABLE\_CODE mode) |
| GET | `/api/public/stream` | SSE for this session |

**Authentication and system endpoints**

| Method | Path | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login`, `/api/auth/logout` | Email and password. Rate limited |
| POST | `/api/auth/pin-login` | 6-digit PIN, accepted only from a paired device |
| GET | `/api/auth/me` | Current user and role |
| POST | `/api/kds/pair` | Exchange a pairing code for a device token |
| POST | `/api/kds/heartbeat` | Kitchen presence, every 15 seconds |
| GET | `/api/health`, `/api/ready`, `/api/version` | Liveness, readiness (database reachable), build id |

**Staff endpoints** (staff cookie or device token, role checked on the server)

| Method | Path | Roles | Purpose |
| --- | --- | --- | --- |
| GET | `/api/staff/orders`, `/{id}` | Kitchen and above | List by status, table or date. `changedSince` is used to reconcile |
| POST | `/api/staff/orders` (idem) | Waiter and above | Place an order for a guest in a session |
| POST | `/api/staff/orders/{id}/transition` | As in section 3 | Body `{ to, reason?, version }` |
| POST | `/api/staff/orders/{id}/lines/{lineId}/void` | Kitchen, manager | Reason required |
| CRUD | `/api/staff/menu/categories`, `/items`, `/modifier-groups` | Manager and above | Menu management |
| PATCH | `/api/staff/menu/items/{id}/availability` | Kitchen and above | AVAILABLE, SOLD\_OUT\_TODAY or OFF |
| POST | `/api/staff/menu/items/{id}/image` | Manager and above | Image upload |
| POST, GET | `/api/staff/menu/import`, `/api/staff/menu/export.csv` | Manager and above | CSV |
| CRUD | `/api/staff/tables`, POST `/bulk` | Manager and above | Tables |
| POST | `/api/staff/tables/{id}/regenerate-token` | Manager and above | New QR token |
| GET | `/api/staff/tables/{id}/qr?format=png` or `svg`, `/api/staff/tables/qr-sheet.pdf` | Manager and above | QR images and the printable sheet |
| GET | `/api/staff/sessions`, `/{id}`, `/needs-attention` | Waiter and above | Sessions |
| POST | `/api/staff/sessions` | Waiter and above | Seat a table. Returns the table code in TABLE\_CODE mode |
| POST | `/api/staff/sessions/{id}/request-bill` | Waiter, cashier, manager | BILL\_REQUESTED |
| POST | `/api/staff/sessions/{id}/prepare-bill` | Cashier, manager | Freeze the bill |
| POST | `/api/staff/sessions/{id}/reopen` | Manager | From BILLING back to OPEN, reason required |
| POST | `/api/staff/sessions/{id}/move` | Manager | Body `toTableId`, a table without a live session |
| POST | `/api/staff/sessions/{id}/devices/{deviceId}/block` | Manager | Block a device |
| POST | `/api/staff/sessions/{id}/write-off`, `/close-no-charge` | Manager | Close without payment, reason required |
| GET | `/api/staff/bills/{id}`, `/invoice.pdf` | Cashier and above | Bill and invoice |
| POST | `/api/staff/approvals` | Manager | Manager PIN, returns a one-use approval token valid for 120 seconds |
| POST | `/api/staff/bills/{id}/discount` | Manager, or cashier with an approval token | Flat or percent, reason required |
| POST | `/api/staff/bills/{id}/payments` (idem) | Cashier and above | Issues the invoice when the amount due reaches 0 |
| POST | `/api/staff/payments/{id}/reverse` (idem) | Manager | Reversal entry |
| POST | `/api/staff/bills/{id}/credit-notes` (idem) | Manager | Credit note and refund entry |
| GET, PATCH | `/api/staff/calls`, `/{id}` | Waiter and above | Waiter calls and bill requests |
| POST | `/api/staff/kitchen/busy` | Manager | Extra delay, pause until, message |
| GET | `/api/staff/kitchen/presence` | Front staff | Kitchen online or offline |
| CRUD | `/api/staff/devices` | Owner, manager | Pairing codes and revocation |
| CRUD | `/api/staff/users`, POST `/{id}/reset-password`, `/{id}/pin` | Owner, manager | Staff |
| GET, PATCH | `/api/staff/settings` | Owner, manager | Tax settings only for the owner |
| GET | `/api/staff/reports/sales`, `/items`, `/peak-hours`, `/payments`, `/cancellations`, `/write-offs`, `/gst-summary`, `/export.csv` | Manager and above | Reports. A cashier gets only their own payments |
| GET | `/api/staff/audit` | Owner, manager | Audit log |
| GET | `/api/staff/stream` | Any staff or KDS device | SSE |

**Place order request**

```json
{
  "items": [
    {
      "itemId": "uuid",
      "variantId": "uuid",
      "modifierOptionIds": ["uuid"],
      "qty": 2,
      "note": "less spicy",
      "isAllergyNote": false
    }
  ],
  "orderNote": "Bring starters first",
  "guestName": "Asha",
  "expectedSubtotal": 84000
}
```

The response returns the saved order with `id`, `displayNumber`, `status`, `etaMinutes`, `subtotal`, `version` and `deviceVerified`. Error codes: VALIDATION\_ERROR, ITEM\_UNAVAILABLE (with item ids), LIMIT\_REACHED (with the item id and the portions left), PRICE\_CHANGED (with the new subtotal), SESSION\_LOCKED, SESSION\_CLOSED, TABLE\_NOT\_OPEN, DEVICE\_BLOCKED, RESTAURANT\_CLOSED, ORDER\_LIMIT\_REACHED, RATE\_LIMITED, INVALID\_TRANSITION, IDEMPOTENCY\_KEY\_REUSED, PENDING\_ORDERS, CODE\_INVALID.

**Place order: the exact server algorithm**

1. Validate the body (Zod, at most 100 KB) and the `Idempotency-Key` header.
2. Read the device cookie and load the table it names. The table must be enabled, and the restaurant must be accepting orders: inside opening hours, before the last order time, and not paused.
3. Begin a transaction and lock the table row (`SELECT ... FROM tables WHERE id = $1 FOR UPDATE`). Every operation that changes the session of a table takes this same lock, so those operations run one after the other.
4. Look up the idempotency key for this device. Same hash: return the stored response. Different hash: 422.
5. Find the live session of the table. If it is BILLING, return SESSION\_LOCKED. If there is none: in TABLE\_CODE mode return TABLE\_NOT\_OPEN, otherwise insert a session with `opened_by = CUSTOMER`. The partial unique index is the safety net.
6. Upsert the session device and label it Guest n. A blocked device returns DEVICE\_BLOCKED. The order needs confirmation when the guard mode is CONFIRM\_NEW\_DEVICE and the device is not verified yet. In TABLE\_CODE mode the device must already be verified. In OPEN mode the device is verified now.
7. Load the items, variants and add-ons. Each must exist, be available (including the category time window) and respect the add-on `min_select` and `max_select`. The order must respect `max_lines_per_order` and `max_qty_per_line`.
8. Price the lines with the pricing module. If `expectedSubtotal` is present and differs, roll back and return PRICE\_CHANGED.
9. Check `max_active_orders`, `max_order_value` and `max_session_value`.
10. For each item with a daily limit run `UPDATE menu_items SET sold_today = sold_today + $qty WHERE id = $id AND (daily_limit IS NULL OR sold_today + $qty <= daily_limit)`. Zero rows updated means LIMIT\_REACHED. When an order, a line or a cancellation gives portions back, subtract them again.
11. Take the next order number from `counters`. Insert the order and its lines with the status PENDING\_CONFIRMATION, PLACED, or ACCEPTED (only when auto-accept is on and a kitchen is online). Compute `eta_minutes`. Insert the history row, the event rows and the idempotency response. Update `last_activity_at` of the session.
12. Commit, then call `bus.wake()`.
13. Return the order.

**Prepare bill.** Lock the table row. The session must be OPEN or BILL\_REQUESTED, and no order may be in PENDING\_CONFIRMATION (otherwise PENDING\_ORDERS). Collect the billable lines, run the pricing module, and insert the bill as DRAFT with its lines and tax lines. Set the session to BILLING. Write the event and the audit row, and commit.

**Record payment.** Require an idempotency key. Lock the table row. The bill must be DRAFT. The amount must be greater than 0 and not more than the amount due, otherwise 422. Insert the payment. If the amount due is now 0, then in the same transaction take the next invoice number from `counters`, mark the bill PAID, close the session as PAID, and write the events. A table is free when it has no live session.

## 10. Security and abuse prevention

A QR code is a public door. Assume that someone will photograph it and order from home, flood the kitchen, paste a different QR code over it, or share the link. Use several layers. None of them needs the guest to log in.

**QR and device integrity**

- The table token is random, at least 128 bits, URL-safe and unique. It never contains the table number. Look it up in the database; never derive it.
- `GET /t/{token}` is read-only, so link previews and virus scanners cannot create anything. It sets a signed httpOnly, Secure, SameSite=Lax cookie holding a random device id and the table id. The cookie is useless at any other table. Scanning another table's QR replaces it and starts an empty cart.
- The order guard (section 3) defaults to CONFIRM\_NEW\_DEVICE. A held order never reaches the kitchen. A manager can reject it and block the device or the whole session in one tap.
- Order limits, all settings: `max_active_orders` (default 5 per session), `max_order_value` (default 5,000 rupees), `max_session_value` (default 15,000 rupees), 50 lines per order, quantity 20 per line. The owner sets them from the restaurant's average bill.
- A blocked device or session is refused on every order.
- Phase 3 option: a soft geofence that compares the browser location with the restaurant location. It is advisory only.

**QR sticker tampering and domain permanence**

- The QR URL uses the restaurant's own domain, for example `order.example.com`, printed in small type on the table tent so that guests can check it. The page always shows the restaurant name and table label. In v1 it never asks for a payment, a UPI id, a card, an OTP or a password.
- Use tamper-evident table tents. The opening checklist includes a check that no sticker was placed over a code (section 17).
- Printed codes must stay valid for years, so never change the domain. If it must change, keep the old domain redirecting `/t/*` to the new one for at least one year.
- Print rules: black on white, error correction level Q, at least 3.5 cm square, a quiet zone of 4 modules, no logo inside the code, matte lamination to avoid glare.

**Rate limits.** The key is the device cookie first, then the table, then the IP.

| Action | Limit |
| --- | --- |
| Open a QR link (GET `/t/...`) | 300 per minute per IP. It is stateless, so this only protects the server |
| Place order | 6 per minute per device and 20 per minute per table |
| Call waiter and Request bill | 1 per 2 minutes per session, counted separately for each type |
| Table code attempts | 5 per 10 minutes per device, then locked for 10 minutes |
| Other guest API calls | 120 per minute per device and 600 per minute per IP |
| Guest SSE connections | 4 per device |
| Staff login | 5 failures per 15 minutes per account and per IP, then a temporary lockout |
| Staff and kitchen streams | 10 per user and 3 per paired device. Never limited by IP |

IP limits are deliberately high, because a whole restaurant shares one Wi-Fi address and many phones share one mobile carrier address.

**Authentication and authorization**

- Hash passwords with argon2id. Never log secrets or tokens.
- Staff cookie: httpOnly, Secure, SameSite=Lax, 12-hour sliding expiry. Every authenticated request checks `is_active` and `token_version` in the database, so deactivating a user or changing a password signs them out on their next request.
- Kitchen and staff devices use random 256-bit tokens that are stored hashed, can be revoked, and do not expire.
- PIN login uses 6 digits, works only from paired devices, and locks for 15 minutes after 5 wrong attempts.
- Use one `requireRole(...)` guard on every staff route, and write a test that walks the whole role matrix of section 8 and asserts 200 or 403 for each endpoint.
- A cashier discount needs a one-use manager approval token that is valid for 120 seconds.
- CSRF: check the `Origin` header on state-changing staff requests and use a double-submit token.
- Tenant isolation: `restaurant_id` always comes from the authenticated context or the table, never from a request body or query string.

**Input and output safety**

- Validate everything with Zod, reject unknown keys, and use parameterized queries only. Never build SQL from strings.
- JSON bodies are at most 100 KB. Set maximum lengths for names, notes and descriptions.
- Render notes and names as plain text. Never use `dangerouslySetInnerHTML` with user data.
- Uploads: check the real file type by its magic bytes, at most 5 MB, re-encode to WebP, strip EXIF data.
- Send a strict Content-Security-Policy, HSTS, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (so that table tokens do not leak in referrers) and `frame-ancestors 'none'`.
- Logs and Sentry: redact the token in `/t/*` URLs, cookies, authorization headers and phone numbers.

**Privacy and operations**

- Guest name and phone are optional and come with a one-line purpose notice. Delete them 90 days after the session closes. Do not use them for marketing without a separate consent. India's Digital Personal Data Protection Act, 2023 applies, so the owner confirms the notice wording with an adviser.
- Secrets live only in environment variables, with an `.env.example`. The seed script refuses to run in production, so no default password exists there.
- Write an audit log entry for price changes, voids, discounts, payment reversals, credit notes, write-offs, role changes, QR regeneration, device pairing and settings changes.
- Run `pnpm audit` and Dependabot in CI, and commit the lockfile.

## 11. Edge cases and failure handling

A restaurant service is chaotic, so every row below needs defined behavior, a test and a place in `docs/REQUIREMENTS.md` (E-001, E-002 and so on, in the order of these rows). Nothing here is optional.

**Concurrency and data integrity**

| Scenario | Required behavior |
| --- | --- |
| Two phones order at the same moment at a fresh table | One session, and both devices are registered in it. Enforced by the table lock and the partial unique index |
| Double tap, retry or refresh after Place order | The same idempotency key returns the same order and creates no second set of events. A changed cart gets a new key |
| The connection drops right after Place order | The cart is kept until the server confirms. After a reload `/orders` shows the order if it was saved. Retrying with the same key never duplicates |
| A guest orders while the cashier prepares the bill | The table lock puts them in order. If the order came first, it is on the bill. If the bill came first, the guest gets SESSION\_LOCKED and the friendly message |
| A guest cancels at the moment the kitchen accepts | The order version decides. The loser gets 409 and sees the current state |
| Two cooks tap different actions on one ticket | Version check. The loser gets 409 and the screen refreshes |
| The cashier double-taps Record payment | The same idempotency key returns the same payment. After every payment the screen shows the remaining amount due |
| A payment is larger than the amount due | 422. Change given for cash is handled on the screen and never stored |
| The server restarts or crashes in the middle of a request | The transaction either commits fully or rolls back. Clients reconnect, replay events from `Last-Event-ID` and refetch |
| A live message is missed | The 1-second poller and the 3-second reconcile deliver the change within 5 seconds at the latest |
| A stale browser tab sends an old order version | 409. The screen refetches and shows what changed |

**Money and tax**

| Scenario | Required behavior |
| --- | --- |
| An item price changes between cart and order | PRICE\_CHANGED with the new subtotal. The guest must confirm |
| An item runs out while it is in a cart | ITEM\_UNAVAILABLE with the item ids. The cart marks the line and Place order is blocked until it is removed |
| Two guests take the last portions of a limited item | The atomic update lets one succeed and gives the other LIMIT\_REACHED with the portions left |
| The kitchen voids a line or rejects an order after the guest saw an estimate | Only billable lines count. The estimate updates live. REJECTED orders and VOID lines are never billed |
| A discount is larger than the subtotal, or over 100 percent | 422. A 100 percent discount gives a total of 0 and the session closes as NO\_CHARGE |
| A wrong payment method was recorded | A manager reverses the payment (an append-only reversal entry) and records the right one |
| A refund or return after payment | A credit note with its own number and a refund entry. A paid bill is never edited |
| Rounding and the tax split | Only the formulas and worked examples of section 16. CGST always equals SGST in EXCLUSIVE mode |
| The bill needs a correction after Prepare bill | A manager reopens the session with a reason. The DRAFT bill is voided, and no invoice number was used |

**Guests and tables**

| Scenario | Required behavior |
| --- | --- |
| Someone at home orders from a photo of the QR code | The device is new, so the order is held as PENDING\_CONFIRMATION and never reaches the kitchen. A waiter rejects it and can block the device |
| New guests sit at a table whose old session was never closed | Their device is new, so it sees only its own orders and its first order needs confirmation. The old session appears in Needs attention |
| Guests leave without paying | After 90 idle minutes the session appears in Needs attention. A manager writes it off with a reason. It is excluded from sales, listed in the write-off report, and old cookies can no longer order |
| A guest clears cookies or uses a private tab | The device is new and staff verify it again. Orders already placed stay in the session |
| Several people at one table want separate bills | v1 has one session and one bill per table. Splitting is Phase 3 |
| Guests move to another table | A manager moves the session to a free table. Kitchen and tracking pages show the new label at once, because they read it from the session. Moving onto an occupied table is refused |
| The QR token is regenerated while guests are seated | Existing devices keep working, because their cookie is bound to the table and the session. New scans need the new QR |
| A table is disabled while it is occupied | The live session continues. No new session can start |
| An old paper QR is scanned after its table was deleted | The invalid-QR page |
| A large group sends a huge order | The limits apply (50 lines, quantity 20 per line, order value). The message suggests splitting into rounds |
| The guest is offline or on a very slow connection | A light page, skeletons, an Offline banner, the cart is kept, and no false success is ever shown |
| The QR link is opened in WhatsApp, Instagram or Google Lens | It works. Link preview bots create nothing |
| A very old or unsupported browser | A short update-your-browser page, never a blank page |
| A guest has an allergy | The allergy note appears in red on the kitchen ticket. The app tells guests to inform the waiter. The system never claims more about allergens than the owner entered |

**Kitchen and operations**

| Scenario | Required behavior |
| --- | --- |
| The kitchen tablet dies or loses Wi-Fi | The heartbeat stops. Front screens show Kitchen screen offline with a sound. Orders stay safe in the database. Guests see Order received, waiting for the kitchen. A second device can take over |
| Nobody accepts a new order | The escalation of section 7 starts at 90 seconds and becomes continuous at 270 seconds |
| The kitchen screen is signed out | A full-screen red alarm with a sound |
| The kitchen is overloaded | Busy mode adds delay, the ETA grows with the queue, and ordering can be paused with a message |
| A cook cannot make an item after accepting | Reject the order or void the line with a reason. The guest is told, and limited portions are given back |
| Every line of an order is voided | The order becomes REJECTED automatically |
| Food is READY and nobody collects it | The READY alert to waiters repeats after 2 minutes |
| A tablet clock is wrong | All timers use server time |
| The restaurant is about to close | Orders stop at the last order time. Sessions already open continue until closed |
| An order is placed at 00:30 after a night shift | Business date and order numbers follow the 04:00 cutoff |
| A staff member is deactivated during a shift | Their next request returns 401 |
| A deploy happens during service | Deploys are frozen during service hours (section 14). If one happens anyway, streams reconnect and replay, and open pages reload on `app.version` when idle |
| The database is unavailable | `/api/ready` fails. Guests see a friendly message and staff screens show offline. The restaurant switches to the paper fallback of section 17 |
| Printing fails | A toast with Retry. The order is unaffected |
| The menu is edited while a guest browses | Availability updates live. A price edit applies at the next quote and at order time |
| A deleted menu item is on an old order | Orders keep a snapshot of name, variant, add-ons and price |
| An item was marked sold out for today | It resets itself at the business day cutoff |
| Opening hours cross midnight | A close time earlier than the open time means the next day |

**Behavior for every error**

- Guests see a short human message and a Retry button. Never show stack traces or raw error codes.
- Staff screens show what failed and keep their local state, so nothing typed is lost.
- The server logs every 5xx with the request id that is also returned in `X-Request-Id`.

## 12. UI/UX, accessibility and performance

The interface should feel calm, fast and obvious for a hungry guest and a stressed cook. Design the customer app first on a 360 px wide screen, then scale up.

**Design system**

- Define all colors, radii and spacing as CSS variables. The brand color comes from settings into `--brand`, so one restaurant can rebrand without a code change.
- Spacing on a 4 px grid. Cards use a 12 px radius with a subtle shadow. One typeface (Inter or the system font) with 3 or 4 sizes.
- Primary action buttons are at least 48 px tall on customer screens and 56 px on the kitchen screen. Touch targets are never smaller than 44 px.
- Icons from `lucide-react`. Veg and non-veg use the standard green and red square markers.
- Customer app: light theme. Kitchen display: dark theme with high contrast. Admin: light theme with a dark sidebar.
- Every screen has a loading skeleton, an empty state with a clear next action, and an error state.
- Use optimistic updates for status buttons, toasts for confirmations, and short motion (150 to 250 ms) that respects `prefers-reduced-motion`.

**Breakpoints**

| Surface | Primary target |
| --- | --- |
| Customer app | 360 to 480 px wide phones, works up to desktop |
| Kitchen display | 1024 px and wider, landscape |
| Admin and staff | 768 px tablets and desktops, usable on phones for the waiter console |

**Accessibility (WCAG 2.2 AA)**

- Semantic HTML, labelled form fields, visible focus rings, full keyboard use in the admin app.
- Color is never the only signal: status colors always come with a text label or icon.
- Order status changes are announced through an `aria-live` region.
- Text contrast of at least 4.5 to 1. Run `eslint-plugin-jsx-a11y` and axe checks in CI.

**Performance budgets**

- Customer initial route: at most 170 KB of JavaScript gzipped, measured in CI with the bundle analyzer (keep client-side Zod and TanStack Query out of the menu route). Largest Contentful Paint under 2.5 s and Cumulative Layout Shift under 0.1 on a mid-range Android phone over 4G.
- Menu images in WebP, at most 80 KB each, responsive `srcset`, lazy loading with a blur placeholder, and reserved dimensions.
- Menu API with ETag and stale-while-revalidate. Lighthouse mobile score of 90 or more on customer routes.
- Server-render the menu shell for a fast first paint, then hydrate.
- The kitchen page must stay stable over an 8-hour shift: no memory growth, no duplicate listeners, no missed chimes.

**Content and language**

- Put every string through `next-intl` with an English message file, so adding Kannada or Hindi later needs no code change.
- Use plain, friendly microcopy. Examples: "Order received. We are on it.", "Your food is being prepared.", "Sorry, this dish just ran out."
- Format money and dates with `Intl` using the restaurant locale (en-IN).

## 13. Project structure, environment and code standards

Use a single Next.js repository with feature modules. Keep this structure unless a decision in `docs/DECISIONS.md` explains a change.

```text
qr-ordering/
  AGENTS.md
  instrumentation.ts              creates the event bus and the poller on globalThis
  drizzle/                        committed SQL migrations
  src/
    app/
      (customer)/t/[token]/route.ts      read-only QR entry
      (customer)/menu/  cart/  order/[id]/  orders/  join/  closed/
      (staff)/login/  kitchen/  kitchen/pair/
      (staff)/admin/  dashboard/ orders/ menu/ tables/ sessions/
                      billing/ staff/ devices/ reports/ settings/ audit/
      api/public/...  api/staff/...  api/auth/...  api/kds/...
      api/health  api/ready  api/version
    db/        schema/*.ts  client.ts  migrate.ts
    modules/   menu/ tables/ sessions/ orders/ billing/ calls/ staff/
               devices/ settings/ reports/ realtime/ auth/
               (each: *.service.ts, *.repo.ts, *.schema.ts, *.types.ts)
    lib/       env.ts logger.ts errors.ts money.ts time.ts business-date.ts
               pricing.ts state-machine.ts eta.ts idempotency.ts
               rate-limit.ts device-cookie.ts
    components/  ui/ customer/ kitchen/ admin/
    messages/    en.json   (kn.json and hi.json later)
  tests/   unit/  integration/  e2e/  chaos/  load/
  scripts/ seed.ts  create-owner.ts  gate.ts
  docs/    BRIEF.md ARCHITECTURE.md API.md DECISIONS.md RUNBOOK.md
           PROGRESS.md REQUIREMENTS.md TRACEABILITY.md BLOCKERS.md
  Dockerfile  docker-compose.yml  .env.example
```

**Environment variables.** Validate them with Zod at startup in `lib/env.ts` and fail fast with a clear message.

| Variable | Purpose |
| --- | --- |
| `NODE_ENV`, `APP_URL`, `LOG_LEVEL` | Runtime, the permanent public base URL that goes into QR codes, log level |
| `DATABASE_URL` | PostgreSQL connection string |
| `AUTH_SECRET` | Signs staff tokens |
| `DEVICE_COOKIE_SECRET` | Signs guest device cookies |
| `DEFAULT_TIMEZONE` | Default Asia/Kolkata |
| `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `CDN_URL` | Image storage |
| `SENTRY_DSN` (optional) | Error reporting |
| `ENABLE_DEMO_SEED` | Must be false in production. The seed also refuses when `NODE_ENV` is production |

**Scripts.** `pnpm dev`, `pnpm verify` (lint, type-check, unit and integration tests, build), `pnpm e2e`, `pnpm db:migrate`, `pnpm seed`, `pnpm gate:phase1`, `pnpm gate:phase2`.

**Code standards**

- ESLint with strict TypeScript and jsx-a11y rules, Prettier, and a Husky pre-commit hook that runs lint, type-check and the affected tests.
- No business logic in route handlers or React components. Services and pure functions only, so that they can be unit tested.
- A typed `AppError` with a stable `code`, and one error handler that maps it to the JSON error format.
- Use the pino logger with the request id. No `console.log`.
- Comments explain why, not what. Every exported function in `lib/` and `modules/` has a short doc comment.
- Keep files under about 300 lines. Split before they grow.
- Never edit a migration that has been applied. Add a new one. Test that every migration applies to an empty database and to a database with seed data.
- Update `docs/` in the same commit as the change it describes.

## 14. Testing, review and deployment

Nothing is done until it has been tested, attacked, and shown to run the same way in production as on a laptop.

**Test layers**

| Layer | Tool | What it must cover |
| --- | --- | --- |
| Unit | Vitest, fast-check | The pricing module with the worked examples of section 16, plus property tests: totals equal the sum of their parts, CGST equals SGST in EXCLUSIVE mode, round off stays within 50 paise, no negative amounts. The state machine: every allowed and forbidden transition for every role. ETA, business date and money helpers |
| Integration | Vitest with Testcontainers (a real PostgreSQL) | Every database constraint of section 5 (try to violate each one). Every endpoint with the right role and the wrong role. Idempotency. Tenant isolation. Events written in the same transaction as the change |
| Concurrency | Vitest with parallel clients | 50 devices ordering at one fresh table: exactly one session, unique sequential order numbers, no lost order. 100 rounds of Place order racing Prepare bill: every order is on exactly one bill or was refused with SESSION\_LOCKED. 20 identical requests with one idempotency key: one order. The last portion of a limited item requested by 10 devices: exactly one succeeds. Two payments racing for the last amount due: never overpaid |
| End to end | Playwright | The scenarios below, on a phone viewport for guests and a tablet viewport for the kitchen |
| Chaos | Scripts and Playwright | The drill below |
| Load | k6 | 50 tables ordering for 10 minutes with 50 different device cookies from one IP address: API p95 under 300 ms, 500 SSE connections, no missed event |
| Accessibility | axe in Playwright | No serious violations on guest, kitchen and admin pages |

**End-to-end scenarios**

1. Golden path with a new device: scan, order, the waiter confirms, the kitchen accepts and prepares, the guest sees each step, the waiter serves, the cashier prepares the bill and records payment, the invoice is issued and the session closes.
2. An item goes out of stock while it is in a cart. A price changes between cart and order.
3. A guest cancels inside the window, and cannot cancel after the kitchen accepted.
4. Two devices at one table. The second is unverified and sees only its own order until staff confirm it.
5. A prank order from a new device is held, never appears on the kitchen screen, and is rejected and blocked.
6. The cashier freezes the bill while a guest has a full cart: the guest gets the SESSION\_LOCKED message.
7. The kitchen screen goes offline: banner and sound on the front screens. After reconnecting, the missed orders appear with a chime.
8. Nobody accepts an order: both escalation levels appear.
9. A rotated QR: new scans need the new code and seated devices keep working.
10. A walk-out: Needs attention, write-off, the table is free, the old cookie is refused.
11. A wrong payment method is reversed and re-entered. A credit note is issued after payment.
12. Rate limits: order spam is blocked, and 25 phones behind one IP address all work.

**Chaos drill.** Run it at every phase gate and record the results in `docs/REVIEW-phaseN.md`.

- Kill the server process while 20 orders are being placed. After the restart there is no half-saved order, every committed order has its events, and the open screens catch up.
- Restart the database. `/api/ready` fails and then recovers, no data is lost, and clients show offline and then recover.
- Cut the network of the kitchen screen for 2 minutes and restore it.
- Put a buffering proxy in front of the SSE route. The 3-second reconcile still keeps the kitchen and admin screens current.
- Send the same Place order request twice at once, and replay an old request after the session closed.

**Manual QA on real devices.** Android Chrome, iPhone Safari and Samsung Internet. Scan with the native camera, with Google Lens, and from inside WhatsApp. Throttle to slow 3G. Lock the phone for 2 minutes in the middle of an order and unlock it. On the real kitchen tablet check sound, wake lock and power settings. Keep the checklist in `docs/RUNBOOK.md`.

**Review checklist** (step 7 of the build loop)

- Permissions: the server checks the role, a wrong-role test exists, and every query is scoped to `restaurant_id`.
- Transactions: one transaction, the lock where this brief requires it, and the event row in the same transaction.
- Money: only the pricing module, integer paise, and the worked examples have tests.
- Idempotency on every endpoint marked (idem).
- Logs carry the request id and contain no secrets, tokens or phone numbers.
- Loading, empty, error and offline states exist for every screen.
- Accessibility: keyboard use, labels, contrast and `aria-live`.
- All text goes through `next-intl`, and the copy is friendly and plain.
- Docs and tests are updated, and every requirement ID of the slice is mapped in `docs/TRACEABILITY.md`.

**Coverage target.** At least 80 percent for services and pure modules, and 100 percent of the database constraints and of the role matrix.

**Deployment**

- A multi-stage Dockerfile with Next.js `output: 'standalone'`, and a `docker-compose.yml` that starts the app and a PostgreSQL for local work.
- Production: one container (VPS, Railway, Render or Fly) behind HTTPS, with managed PostgreSQL in the same region. Backups on, point-in-time recovery if the provider offers it. Images served from a CDN. If Cloudflare is in front, keep the SSE route uncached and keep the heartbeat under 100 seconds.
- Three environments: local, staging, production, each with its own database and secrets.
- GitHub Actions: install, lint, type-check, unit and integration tests, build, Playwright. Merge to main deploys to staging. Production needs a manual approval.
- Deploy freeze: no production deploy during service hours (default 11:00 to 23:30 local time), except an owner-approved hotfix. After a deploy, `app.version` makes open screens reload when idle.
- Migrations run before the new version starts. Each migration must work with the previous app version for one release (add first, remove later).
- Monitoring: Sentry for errors, an uptime check on `/api/health` and `/api/ready` that alerts the owner's phone, and structured logs with request ids.
- Backups: a daily snapshot kept for at least 14 days, and a restore rehearsed in staging before go-live.
- Runbook entries in `docs/RUNBOOK.md`: the kitchen screen is blank or signed out, pair a new kitchen screen, rotate a QR code, reset the owner password with `scripts/create-owner.ts`, pause ordering, close a stuck session, restore a backup, rotate secrets, the paper fallback, and the end-of-day close.

## 15. Delivery phases, acceptance and your first task

Deliver in phases. Do not start a phase until the previous one passes its gate (`pnpm gate:phaseN`, which runs `pnpm verify`, the end-to-end scenarios, the concurrency tests and the chaos drill) and I say go.

| Phase | Scope | Done when |
| --- | --- | --- |
| 0. Foundation | Repository, Next.js with strict TypeScript, Tailwind and shadcn/ui, Drizzle with the full schema and every constraint of section 5, validated env, Docker compose, CI, seed script, docs skeleton, `AGENTS.md`, and `docs/REQUIREMENTS.md` extracted from this brief | `pnpm dev` starts, migrations apply to an empty database, every constraint test passes, the seed creates the demo restaurant, CI is green |
| 1. Core ordering | Pricing module with the worked examples of section 16. Tables, QR codes and the device cookie. Menu management and availability. Customer menu, cart and estimate. Place order with the table lock, idempotency, guard modes and daily limits. State machine and role rules. Events outbox, poller and SSE. Kitchen screen with pairing, presence and escalation. Customer tracking. Staff login and roles | The golden-path test below passes, together with the concurrency tests and the chaos drill |
| 2. Operations | Waiter console and staff-placed orders. Confirmations. Seating, calls and bill requests. Prepare bill, payments, invoice PDF, discounts with approval. Reversals, credit notes, write-off, reopen and move. Needs attention. Reports and GST summary. Settings, devices, audit log and busy mode | A full service day can be simulated and closed with correct totals, no stuck state, and a passing test for every row of section 11 |
| 3. Growth | Online payment with Razorpay UPI and verified webhooks. Split bills. Thermal printer support. Per-station routing. More languages. Geofence. Guest feedback. WhatsApp or SMS bill. Owner alerts. A second app instance with a shared rate limiter | Each item is accepted against its own checklist |

**Golden-path acceptance test (Phase 1)**

1. The manager creates Table 5 and downloads its QR code.
2. A phone scans it. The menu opens in under 2 seconds and shows Table 5. No session exists yet.
3. The guest adds 2 items with an add-on and a note, and places the order. It is held as PENDING\_CONFIRMATION and does not appear on the kitchen screen.
4. A waiter confirms it. Within 1 second the kitchen screen shows order #001 for Table 5 with a chime, the note highlighted and a running timer. The guest's phone shows Order received.
5. The cook taps Accept, Start preparing and Mark ready. The guest's phone shows each step without a refresh.
6. A second phone scans the same QR code and sees only its own orders, which are none, until staff confirm it.
7. The manager switches one item to Out for today. Both phones show it greyed out within 2 seconds.
8. The manager regenerates Table 5's QR code. The old code now shows the invalid-QR page, and the first phone keeps working.
9. Two phones order at the same instant at a fresh Table 6: one session with both devices.
10. Every step above has an automated Playwright or integration test, and the unit and concurrency suites pass.

**Definition of done for every slice**

- It works end to end in the browser, on a phone viewport where relevant.
- `pnpm verify` passes, and new logic has tests that were written first.
- Loading, empty, error and offline states exist.
- Role rules are enforced on the server and tested for the wrong role.
- The attack pass of the build loop found nothing new, and `docs/TRACEABILITY.md` maps each requirement ID to a passing test.
- `docs/` is updated and the seed data covers the feature.

**Your first task**

1. Read this whole brief, then read it again looking for contradictions and gaps. Create `docs/REQUIREMENTS.md` as described in the kickoff message.
2. Reply with the plan: architecture summary, folder structure, the phases with time estimates, the top five risks and how you will handle each, your assumptions, and every contradiction or gap you found.
3. Start Phase 0 immediately and finish it.
4. Build Phase 1 in this order: pricing module with its tests, schema constraints, tables and QR with the `/t/[token]` entry, menu management, customer menu and cart, Place order with its concurrency tests, events and SSE, kitchen screen, customer tracking, staff roles.
5. After each slice, report in five lines and tell me exactly how to run and try it. Ask a question only when you are blocked, and always include your own default answer so that I can reply with one word.

## 16. Money, tax and invoice rules

This section is the only source for how prices, discounts, service charge, tax and rounding are computed. Implement it once in `lib/pricing.ts` as pure functions, and call it from the cart quote, the order estimate, the bill and the reports. Every number is an integer number of paise. `rhu(n, d)` means round half up for non-negative integers: `floor((2n + d) / (2d))`.

**Inputs.** The restaurant settings (`price_mode`, `service_charge_bp`, `service_charge_taxable`, `round_off_enabled`, `tax_scheme`) and, for every billable line, its `line_total` and its `tax_rate_bp` (a snapshot taken when the order was placed). Group the lines by `tax_rate_bp`. A group is one tax rate, and most restaurants have a single group.

**Steps for the REGULAR scheme**

```text
1. subtotal       = sum of line_total of all billable lines
2. discount       = a flat amount, or rhu(subtotal x percent, 100). Never more than subtotal
3. after_discount = subtotal - discount
4. service_charge = rhu(after_discount x service_charge_bp, 10000)
5. Share discount and service_charge over the tax groups in proportion to each
   group's line total. The rounding remainder goes to the largest group.
   For each group g:  base_g = group line total - discount share
                      sc_g   = service charge share
                      sc_taxable_g = sc_g if service_charge_taxable, else 0

EXCLUSIVE (menu prices do not include tax)
6. taxable_g = base_g + sc_taxable_g
7. cgst_g = sgst_g = rhu(taxable_g x rate_bp_g, 20000)      (half the rate each)
8. total_before_round = after_discount + service_charge + sum(cgst_g + sgst_g)

INCLUSIVE (menu prices include tax)
6. item_half_g = rhu(base_g x rate_bp_g, 2 x (10000 + rate_bp_g))   tax inside the prices
7. sc_half_g   = rhu(sc_taxable_g x rate_bp_g, 20000)              tax added on the service charge
8. cgst_g = sgst_g = item_half_g + sc_half_g
   taxable_g = (base_g - 2 x item_half_g) + sc_taxable_g
9. total_before_round = after_discount + service_charge + sum(2 x sc_half_g)

ROUND OFF (both modes)
10. If round_off_enabled:  total = rhu(total_before_round, 100) x 100
                          round_off = total - total_before_round   (between -50 and +50 paise)
    else total = total_before_round and round_off = 0
```

CGST and SGST are always equal, so an invoice never shows a one-paisa difference between them. A service charge that is not taxable is printed as its own line outside the taxable value.

**COMPOSITION scheme.** The document is a Bill of Supply. It has no tax lines. `total_before_round = after_discount + service_charge`, and the rounding step still applies. The legend printed on it is confirmed by the owner's accountant.

**Worked examples.** Each one must exist as a unit test with exactly these numbers. All use a 5 percent rate (500 basis points) and one tax group.

| Case | Inputs | Result |
| --- | --- | --- |
| A. EXCLUSIVE, plain | Lines 24000 + 2 x 5000 + 9000. Subtotal 43000 (430.00 rupees). No discount, no service charge | CGST = SGST = 1075. Taxable 43000. Total before round 45150. Total 45200. Round off +50 |
| A2. Tax rounding | Subtotal 41700 | Tax per half = 1042.5, rounded up to 1043. Total before round 43786. Total 43800. Round off +14 |
| B. EXCLUSIVE with discount and service charge | Subtotal 43000. Discount 10 percent. Service charge 5 percent, taxable | Discount 4300. After discount 38700. Service charge 1935. Taxable 40635. CGST = SGST = 1016 (from 1015.875). Total before round 42667. Total 42700. Round off +33 |
| C. INCLUSIVE | Menu prices total 43000. No discount, no service charge | Half tax = 1024 each. Taxable 40952. Total 43000. Round off 0 |
| D. COMPOSITION | Subtotal 43000 | No tax lines. Total 43000 |
| E. Full discount | Subtotal 43000. Discount 100 percent | Total 0. The session closes as NO\_CHARGE and no invoice number is used |

**Invoice content.** Trade name and legal name, address, GSTIN, the 14-digit FSSAI number (printed on every bill), invoice number, date and time in the restaurant timezone, table label, SAC 996331 for the restaurant service, the lines with quantity and amount, discount, service charge, taxable value, CGST and SGST for each rate, round off, total, and the payment methods used.

**Numbering.** Invoice numbers look like `INV/26-27/000123`: the prefix, the financial year and a 6-digit sequence. The whole number is at most 16 characters, so the prefix is at most 4 characters, and settings reject a longer one. The number is taken from the counter `invoice:<fy>` only at the moment the bill becomes PAID, inside the same transaction. A DRAFT bill, or a bill that was reopened, never uses a number, so the series has no gaps. Credit notes use `CN/26-27/000001` with their own counter.

**Credit notes.** A credit note for a returned amount or lines runs the same pricing steps over that amount and reduces taxable value and tax. The refund is stored as a payment of kind REFUND for the credit note total, or part of it. A paid bill is never edited.

**Report definitions**

- Net sales: the sum of the taxable value of PAID bills by invoice business date, minus the taxable value of credit notes.
- Tax collected: CGST plus SGST of paid bills, minus those of credit notes.
- Gross collection: payments minus refunds and reversals, by the business date of the payment.
- Service charge and write-offs are reported separately and are never part of net sales.

**Facts this section relies on.** Checked on 27 October 2026: standalone restaurants charge 5 percent GST (2.5 CGST plus 2.5 SGST) without input tax credit, restaurant services use SAC 996331 within 9963, and hotel restaurants above the high-tariff threshold charge 18 percent ([GST on restaurants](https://www.restaurantindia.in/gst-on-restaurant), [GST rates for restaurants](https://busy.in/gst-rates/restaurant/)). Service charge cannot be made mandatory ([Delhi High Court, March 2025](https://newsonair.gov.in/delhi-hc-rules-restaurants-cant-impose-mandatory-service-charge-in-bills)). The FSSAI number must be printed on bills from 1 October 2021 ([FSSAI notice](https://taxguru.in/corporate-law/fssai-food-businesses-mention-license-no-invoices-w-e-f-1st-october-2021.html)). These rules change and depend on the restaurant. The owner's accountant confirms every item here before go-live: the scheme and rate, whether the service charge is taxable in this case, the invoice series, the composition legend, and how any alcohol or non-GST item is billed.

## 17. Go-live, operations and compliance (for you, the owner)

Software that passes every test can still fail on a Friday night because of the Wi-Fi, a dead tablet or a waiter who was never trained. This section covers the human side. The agent does not need it, but it should build the runbook entries and reports that support it.

**Before go-live**

- [ ] Your accountant confirmed the GST scheme and rate, the service charge treatment, the invoice series and the wording in section 16, and the settings are entered.
- [ ] The GSTIN and the FSSAI number are in settings and appear on a test invoice.
- [ ] The privacy notice text is approved: name and phone are optional and deleted after 90 days.
- [ ] The web address is one you will keep for years, HTTPS works, and the QR sheets are printed to the rules of section 10 and tested with three different phones and Google Lens.
- [ ] Guests can reach the page: guest Wi-Fi covers every table, or guests have mobile data.
- [ ] The kitchen tablet has a stable connection that is separate from guest Wi-Fi, sits on a charger with its screen timeout off, and the volume was tested in real kitchen noise.
- [ ] A second device is paired as a standby kitchen screen. The escalation was tested by leaving one order unaccepted.
- [ ] Staff had 30 minutes of training: waiters (confirm held orders, serve, calls), cooks (accept, ready, reject, undo), the cashier (prepare bill, payments, invoice), the manager (reversal, credit note, write-off, busy mode, pause).
- [ ] The menu is complete: prices, tax rates, images, allergens, veg markers, prep times and daily limits.
- [ ] A backup was restored in staging, the uptime alerts reach the owner's phone, and the runbook is printed.

**Pilot plan.** Do not switch every table on the first day.

| Stage | Scope | Move on when |
| --- | --- | --- |
| 1. Shadow | 2 tables for 2 services, with the paper process running in parallel | No lost or wrong order, and the staff are comfortable |
| 2. Partial | 5 tables for 3 services | No lost order, no stuck session, and fewer than 2 in 100 orders needed a manager correction |
| 3. Full | All tables, with paper kept at the counter for one week | The same as stage 2, and the end-of-day totals matched the cash drawer and the UPI statement three days in a row |

**Paper fallback.** If the system is down for more than 2 minutes, or the Wi-Fi fails, waiters switch to pre-printed numbered order slips and the kitchen works from the slips. Keep a pre-printed, numbered paper bill book with its own series, set up with your accountant. Paper bills are not entered in the system. Add them to the day-end figures by hand. A manual bill entry screen is on the Suggestions list for a later version.

**Every day**

- [ ] Opening: the kitchen screen is online with sound on, the standby device is ready, the table tents are intact with no sticker over a code, the Needs attention list is empty, and item availability is correct.
- [ ] Closing: no session is still open, every bill is PAID or written off with a reason, the day totals match the cash drawer and the UPI statement, and the backup status is green.

**Every week**

- [ ] Review write-offs, discounts, payment reversals and credit notes in the audit log.
- [ ] Replace any QR code that was abused, and check Sentry and the dependency alerts.
- [ ] Check the numbers that tell you how it is going: time to acceptance, share of held orders confirmed within 2 minutes, rejection rate, write-offs. If waiters find the confirm tap slow, discuss TABLE\_CODE or OPEN with your team, and change the guard mode only after the pilot shows it is safe.

**What this brief cannot promise.** It was reviewed independently, its tax facts were checked against public sources, and its money rules were checked by running the arithmetic. It has not yet run in a real restaurant. The pilot is the real test, and tax and legal settings remain your and your accountant's responsibility.
