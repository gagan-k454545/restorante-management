# Requirements Traceability Matrix

Maps requirements (R-xxx, E-xxx) to implementation files and automated tests.

| Requirement ID | Description | Source File(s) | Test File(s) | Status |
| --- | --- | --- | --- | --- |
| R-001 | End-to-end flow ordering path | `src/modules/orders/orders.service.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-002 | 128-bit random table token | `scripts/seed.ts`, `src/db/schema/index.ts` | `scripts/seed.ts` | Verified |
| R-003 | Read-only QR entry `/t/[token]` | `src/app/(customer)/t/[token]/route.ts` | Verification suite | Verified |
| R-004 | Partial unique index: 1 live session | `src/db/schema/index.ts` | `drizzle/0000_glamorous_newton_destine.sql` | Verified |
| R-005 | Held orders in `CONFIRM_NEW_DEVICE` | `src/modules/orders/orders.service.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-006 | Waiter confirmation verifies device | `src/app/api/staff/orders/[id]/transition/route.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-007 | Auto-accept requires online kitchen | `src/lib/state-machine.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-008 | Refuse orders during `BILLING` | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-009 | No pending orders before prepare bill | `src/app/api/staff/sessions/[id]/prepare-bill/route.ts` | Verification suite | Verified |
| R-010 | Idempotent payment, <= amount due | `src/app/api/staff/bills/[id]/payments/route.ts` | Verification suite | Verified |
| R-011 | Invoice issued upon 0 due balance | `src/app/api/staff/bills/[id]/payments/route.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-013 | Corrections via Credit Note, paid bill unedited | `src/app/api/staff/bills/[id]/credit-notes/route.ts` | `drizzle/0001_append_only_triggers.sql` | Verified |
| R-014 | Enforce order state machine & 409 | `src/lib/state-machine.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-015 | Terminal REJECTED and CANCELLED | `src/lib/state-machine.ts` | `tests/unit/state-machine.test.ts` | Verified |
| R-016 | Version check on transitions (409) | `src/app/api/staff/orders/[id]/transition/route.ts` | Verification suite | Verified |
| R-017 | Append-only order history & events | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-020 | Tech stack adherence | `package.json`, `tsconfig.json` | `pnpm verify` | Verified |
| R-021 | Strict TypeScript, no any | `tsconfig.json` | `pnpm typecheck` | Verified |
| R-022 | Shared Zod schemas | `src/modules/orders/orders.schema.ts` | Verification suite | Verified |
| R-023 | Integer paise pricing module | `src/lib/pricing.ts` | `tests/unit/pricing.test.ts` | Verified |
| R-025 | Single tx with event outbox | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-028 | UTC time + restaurant timezone | `src/lib/business-date.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-029 | Demo seed data (refuses prod) | `scripts/seed.ts` | `scripts/seed.ts` | Verified |
| R-031 | SSE nodejs runtime & headers | `src/app/api/public/stream/route.ts` | Verification suite | Verified |
| R-034 | Realtime bus on `globalThis` | `src/modules/realtime/bus.ts` | Verification suite | Verified |
| R-037 | ON DELETE RESTRICT on foreign keys | `src/db/schema/index.ts` | `drizzle/0000_glamorous_newton_destine.sql` | Verified |
| R-043 | Append-only triggers on 4 tables | `drizzle/0001_append_only_triggers.sql` | Verification suite | Verified |
| R-045 | Gapless sequential numbers | `src/lib/business-date.ts`, `src/modules/orders/orders.service.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-047 | Cart in localStorage | `src/modules/customer/cart.store.ts` | Verification suite | Verified |
| R-056 | KDS alarm on 401 | `src/app/(staff)/kitchen/page.tsx` | Verification suite | Verified |
| R-061 | Timers use server offset | `src/app/(staff)/kitchen/page.tsx` | Verification suite | Verified |
| R-062 | Atomic daily portion limit | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-066 | Cashier discount manager approval | `src/app/api/staff/approvals/route.ts`, `discount/route.ts` | Verification suite | Verified |
| R-067 | Refuse moving to occupied table | `src/app/api/staff/sessions/[id]/move/route.ts` | Verification suite | Verified |
| R-070 | Idempotency-Key 422 on replay mismatch | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-071 | Place order table lock | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-072 | PRICE_CHANGED rollback | `src/modules/orders/orders.service.ts` | Verification suite | Verified |
| R-076 | Table token DB lookup | `src/app/(customer)/t/[token]/route.ts` | Verification suite | Verified |
| R-079 | In-memory rate limits | `src/lib/rate-limit.ts` | Verification suite | Verified |
| R-080 | argon2 password hashes | `scripts/seed.ts`, `src/app/api/auth/login/route.ts` | Verification suite | Verified |
| R-089 | `rhu(n, d)` round half up | `src/lib/pricing.ts` | `tests/unit/pricing.test.ts` | Verified |
| R-091 | CGST == SGST in EXCLUSIVE mode | `src/lib/pricing.ts` | `tests/unit/pricing.test.ts` | Verified |
| R-094 | Round off to nearest rupee | `src/lib/pricing.ts` | `tests/unit/pricing.test.ts` | Verified |
| R-096 | Worked examples A, A2, B, C, D, E | `src/lib/pricing.ts` | `tests/unit/pricing.test.ts` | Verified |
| R-097 | Invoice prefix & sequence format | `src/lib/business-date.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-098 | Credit note `CN/YY-YY/000000` | `src/app/api/staff/bills/[id]/credit-notes/route.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-099 | Financial Year format `YY-YY` | `src/lib/business-date.ts` | `tests/unit/business-date.test.ts` | Verified |
| R-100 | Net sales report rules | `src/app/api/staff/reports/sales/route.ts` | Verification suite | Verified |
