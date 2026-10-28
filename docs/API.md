# REST API Reference

All requests and responses use JSON under `/api`.
Success responses are formatted as `{ "data": ... }`.
Errors return `{ "error": { "code", "message", "details" } }`.
All responses carry headers:
- `X-Request-Id`: Unique request tracing UUID.
- `X-Server-Time`: Server epoch timestamp in milliseconds.

---

## 1. Guest Endpoints (Signed Device Cookie)

### GET `/t/{token}`
- **Purpose**: Validate table QR code read-only, set signed HMAC-SHA256 `qr_device` cookie, redirect to `/menu`.
- **Database Write**: None (avoids ghost sessions from web crawlers).

### GET `/api/public/context`
- **Purpose**: Returns restaurant identity, table label, session status, order guard mode, and busy/pause state.

### GET `/api/public/menu`
- **Purpose**: Returns categories, active menu items, variants, modifier groups, and daily portion availability.
- **Cache**: 30-second `Cache-Control` with ETag support.

### POST `/api/public/cart/quote`
- **Purpose**: Pure pricing calculation quote for cart items.
- **Response**: Itemized subtotal, taxes (CGST + SGST), service charge, and round-off in integer paise.

### POST `/api/public/orders` (Idempotent)
- **Headers**: `Idempotency-Key: <UUID>`
- **Locking**: Locks table row with `SELECT FOR UPDATE`.
- **Purpose**: 13-step atomic order placement with daily limit decrement and transactional outbox event emission.

### GET `/api/public/stream`
- **Purpose**: Server-Sent Events (SSE) for the active table session.
- **Headers**: `Last-Event-ID` for event replay across reconnections.
- **Heartbeat**: Comment `: heartbeat` every 20 seconds.

### POST `/api/public/calls`
- **Body**: `{ "type": "WAITER" | "BILL" }`
- **Rate Limit**: 1 request per 2 minutes per session/type.

---

## 2. Staff Authentication & System

### POST `/api/auth/login`
- **Body**: `{ "email", "password" }`
- **Response**: Sets httpOnly JWT `staff_token` cookie (12-hour sliding window).

### GET `/api/auth/me`
- **Purpose**: Retrieves current authenticated staff user and role.

### GET `/api/health` & `/api/ready`
- **Purpose**: Liveness and PostgreSQL database connectivity checks.

### POST `/api/kds/heartbeat`
- **Purpose**: 15-second presence heartbeat from kitchen display tablets.

---

## 3. Staff & Kitchen Operations

### GET `/api/staff/orders`
- **Roles**: `KITCHEN`, `WAITER`, `MANAGER`, `OWNER`
- **Query**: `status=PLACED,ACCEPTED,PREPARING,READY`, `changedSince` for 3s reconcile.

### POST `/api/staff/orders/{id}/transition`
- **Roles**: Allowed by state machine matrix.
- **Body**: `{ "to": OrderStatus, "version": number, "reason"?: string }`
- **Concurrency**: Checks order version, returns 409 `CONFLICT` on stale writes.

### POST `/api/staff/orders/{id}/lines/{lineId}/void`
- **Roles**: `KITCHEN`, `MANAGER`, `OWNER`
- **Purpose**: Voids individual line, recomputes total, and auto-rejects order if all lines become void.

### POST `/api/staff/sessions`
- **Roles**: `WAITER`, `MANAGER`, `OWNER`
- **Purpose**: Seats table and opens session (returns 4-digit code in `TABLE_CODE` mode).

### POST `/api/staff/sessions/{id}/move`
- **Roles**: `MANAGER`, `OWNER`
- **Body**: `{ "toTableId": "<UUID>" }`
- **Safety**: Refuses move if target table has an active session (409 `TABLE_OCCUPIED`).

### POST `/api/staff/sessions/{id}/reopen`
- **Roles**: `MANAGER`, `OWNER`
- **Purpose**: Reopens `BILLING` session to `OPEN`, voiding the DRAFT bill.

### POST `/api/staff/sessions/{id}/write-off`
- **Roles**: `MANAGER`, `OWNER`
- **Purpose**: Closes walk-out session as `WRITTEN_OFF`, excluding it from net sales.

### POST `/api/staff/approvals`
- **Body**: `{ "managerPin": "123456" }`
- **Response**: 120-second one-use approval token for cashier discounts.

### POST `/api/staff/bills/{id}/discount`
- **Roles**: `MANAGER`, `OWNER` (or `CASHIER` with approval token)
- **Body**: `{ "type": "FLAT" | "PERCENT", "value": number, "reason": string }`
- **Rule**: 100% discount results in total 0 and closes session as `NO_CHARGE`.

### POST `/api/staff/bills/{id}/payments` (Idempotent)
- **Headers**: `Idempotency-Key: <UUID>`
- **Body**: `{ "amount": number, "method": "CASH" | "UPI" | "CARD" | "OTHER" }`
- **Rule**: When amount due reaches 0, atomically allocates sequential gapless invoice number (`INV/YY-YY/000000`), marks bill `PAID`, and closes session.

### POST `/api/staff/payments/{id}/reverse`
- **Roles**: `MANAGER`, `OWNER`
- **Purpose**: Append-only reversal entry for incorrect payment method.

### POST `/api/staff/bills/{id}/credit-notes`
- **Roles**: `MANAGER`, `OWNER`
- **Purpose**: Issues sequential credit note (`CN/YY-YY/000000`) for returns/refunds. Paid bills are never edited.

### GET `/api/staff/bills/{id}/invoice.pdf`
- **Purpose**: Printable legal tax invoice with GSTIN, FSSAI, SAC 996331, and CGST/SGST tax split.

### GET `/api/staff/reports/sales` & `/api/staff/reports/gst-summary`
- **Roles**: `MANAGER`, `OWNER` (cashier sees own daily payments).
- **Purpose**: Statutory GST report, taxable sales, tax collected, and gross collections.
