# Restaurant Operations Runbook

Step-by-step procedures for managing live dining operations, emergency handling, and daily checklists.

---

## 1. Daily Checklist

### Opening (Before Service Starts)
- [ ] Check Kitchen Display: Open `/kitchen` on the tablet, verify live status indicator is green (`● LIVE`), and tap **Enable Sound**.
- [ ] Table Tents: Verify physical QR codes on tables T1 to T8 are clean and unblemished with no stickers placed over them.
- [ ] Needs Attention: Open `/admin/dashboard` and confirm the Needs Attention list is empty.
- [ ] Item Availability: Verify morning menu stock, update daily limits for limited portion dishes, and mark out-of-stock items as `SOLD_OUT_TODAY`.

### Closing (After Service Ends)
- [ ] Active Sessions: Confirm all tables are closed or settled (`/admin/dashboard`).
- [ ] Cash & Payments: Cashier verifies recorded payments against cash drawer and UPI statements via `/admin/reports`.
- [ ] Unsettled Bills: If diners left without paying, write off the session with reason `WRITTEN_OFF`.

---

## 2. Emergency Procedures

### Kitchen Screen Signed Out or Blank
- **Symptom**: Kitchen tablet shows full-screen red alarm or connection failure.
- **Remedy**:
  1. Check Wi-Fi connection on tablet.
  2. If signed out, pair standby tablet or sign in kitchen staff at `/login` (`kitchen@spicegarden.com`).
  3. All pending orders are securely preserved in PostgreSQL and appear immediately upon reconnect.

### Reset Owner Password
To reset or generate owner credentials from the terminal:
```bash
pnpm tsx scripts/create-owner.ts "owner@spicegarden.com" "NewPassword123!" "Owner Name"
```

### QR Code Abuse or Tampering
If a QR code is photographed, shared externally, or tampered with:
1. Open Table Details in Admin Console.
2. Tap **Regenerate QR Code**.
3. Seated diners at the table continue ordering uninterrupted (their signed cookies are bound to the table and session).
4. New scans require the newly printed QR code.

### Pause Ordering / Busy Mode
If the kitchen is overloaded with tickets:
1. Open Admin Dashboard or Kitchen Display.
2. Under Busy Mode, select **Add Delay** (+10, +20, or +30 mins) or tap **Pause Ordering**.
3. Enter an optional customer message (e.g., *"Kitchen at full capacity. Reopening in 20 minutes."*).
4. Diner apps update immediately via SSE.

### Paper Fallback Mode
If network or database failure exceeds 2 minutes:
1. Waiters switch to numbered physical carbon-copy order pads.
2. The kitchen prepares dishes directly from paper KOT tickets.
3. Cashier issues pre-printed numbered tax bills from the paper bill book.
4. Manual reconciliation is conducted at day end.
