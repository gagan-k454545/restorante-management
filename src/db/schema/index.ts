import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  boolean,
  timestamp,
  bigserial,
  jsonb,
  uniqueIndex,
  index,
  check,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// 1. Restaurants
export const restaurants = pgTable('restaurants', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  legalName: varchar('legal_name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull().unique(),
  logoUrl: text('logo_url'),
  brandColor: varchar('brand_color', { length: 30 }).default('#f97316').notNull(),
  address: text('address').notNull(),
  stateCode: varchar('state_code', { length: 10 }).notNull(), // e.g. "29" for Karnataka
  phone: varchar('phone', { length: 20 }).notNull(),
  gstin: varchar('gstin', { length: 15 }),
  fssaiNumber: varchar('fssai_number', { length: 14 }),
  taxScheme: varchar('tax_scheme', { length: 20 }).default('REGULAR').notNull(), // REGULAR or COMPOSITION
  timezone: varchar('timezone', { length: 50 }).default('Asia/Kolkata').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 2. Restaurant Settings
export const restaurantSettings = pgTable('restaurant_settings', {
  restaurantId: uuid('restaurant_id')
    .primaryKey()
    .references(() => restaurants.id, { onDelete: 'restrict' }),
  defaultTaxRateBp: integer('default_tax_rate_bp').default(500).notNull(), // 5% = 500 bp
  priceMode: varchar('price_mode', { length: 20 }).default('EXCLUSIVE').notNull(), // EXCLUSIVE or INCLUSIVE
  serviceChargeBp: integer('service_charge_bp').default(0).notNull(),
  serviceChargeTaxable: boolean('service_charge_taxable').default(true).notNull(),
  roundOffEnabled: boolean('round_off_enabled').default(true).notNull(),
  invoicePrefix: varchar('invoice_prefix', { length: 4 }).default('INV').notNull(),
  openingHours: jsonb('opening_hours').default({}).notNull(),
  lastOrderMinutesBeforeClose: integer('last_order_minutes_before_close').default(30).notNull(),
  businessDayCutoff: varchar('business_day_cutoff', { length: 5 }).default('04:00').notNull(),
  orderGuardMode: varchar('order_guard_mode', { length: 30 }).default('CONFIRM_NEW_DEVICE').notNull(), // CONFIRM_NEW_DEVICE, TABLE_CODE, OPEN
  autoAccept: boolean('auto_accept').default(false).notNull(),
  cancelWindowSeconds: integer('cancel_window_seconds').default(60).notNull(),
  sessionIdleMinutes: integer('session_idle_minutes').default(120).notNull(),
  maxActiveOrders: integer('max_active_orders').default(5).notNull(),
  maxOrderValue: integer('max_order_value').default(500000).notNull(), // 5,000 rupees in paise
  maxSessionValue: integer('max_session_value').default(1500000).notNull(), // 15,000 rupees in paise
  maxLinesPerOrder: integer('max_lines_per_order').default(50).notNull(),
  maxQtyPerLine: integer('max_qty_per_line').default(20).notNull(),
  ackWarnSeconds: integer('ack_warn_seconds').default(90).notNull(),
  kdsWarnMinutes: integer('kds_warn_minutes').default(8).notNull(),
  kdsLateMinutes: integer('kds_late_minutes').default(15).notNull(),
  kitchenCapacityTickets: integer('kitchen_capacity_tickets').default(10).notNull(),
  minutesPerExtraTicket: integer('minutes_per_extra_ticket').default(2).notNull(),
  extraDelayMinutes: integer('extra_delay_minutes').default(0).notNull(),
  orderingPausedUntil: timestamp('ordering_paused_until', { withTimezone: true }),
  pauseMessage: text('pause_message'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

// 3. Users (Staff)
export const users = pgTable(
  'users',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    passwordHash: text('password_hash').notNull(),
    pinHash: text('pin_hash'),
    role: varchar('role', { length: 20 }).notNull(), // OWNER, MANAGER, KITCHEN, WAITER, CASHIER
    isActive: boolean('is_active').default(true).notNull(),
    tokenVersion: integer('token_version').default(1).notNull(),
    lastLoginAt: timestamp('last_login_at', { withTimezone: true }),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('unique_restaurant_email').on(table.restaurantId, table.email),
  ]
);

// 4. Paired Devices (Tablets, KDS)
export const pairedDevices = pgTable(
  'paired_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    kind: varchar('kind', { length: 20 }).notNull(), // KDS, STAFF
    name: varchar('name', { length: 100 }).notNull(),
    tokenHash: varchar('token_hash', { length: 64 }).notNull().unique(),
    pairingCodeHash: varchar('pairing_code_hash', { length: 64 }),
    pairingExpiresAt: timestamp('pairing_expires_at', { withTimezone: true }),
    lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
    revokedAt: timestamp('revoked_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// 5. Tables
export const tables = pgTable(
  'tables',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    label: varchar('label', { length: 50 }).notNull(), // e.g. "T1", "Table 5"
    zone: varchar('zone', { length: 50 }).default('Main Dining').notNull(),
    capacity: integer('capacity').default(4).notNull(),
    token: varchar('token', { length: 64 }).notNull().unique(),
    isEnabled: boolean('is_enabled').default(true).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('unique_active_table_label')
      .on(table.restaurantId, table.label)
      .where(sql`deleted_at IS NULL`),
  ]
);

// 6. Categories
export const categories = pgTable(
  'categories',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    translations: jsonb('translations').default({}).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    isActive: boolean('is_active').default(true).notNull(),
    availableFrom: varchar('available_from', { length: 5 }), // "07:00"
    availableTo: varchar('available_to', { length: 5 }), // "11:00"
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_categories_sort').on(table.restaurantId, table.sortOrder),
  ]
);

// 7. Menu Items
export const menuItems = pgTable(
  'menu_items',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    categoryId: uuid('category_id')
      .notNull()
      .references(() => categories.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    description: text('description').default('').notNull(),
    translations: jsonb('translations').default({}).notNull(),
    imageUrl: text('image_url'),
    basePrice: integer('base_price').notNull(), // paise
    isVeg: boolean('is_veg').default(true).notNull(),
    allergens: text('allergens').array().default(sql`ARRAY[]::text[]`).notNull(),
    tags: text('tags').array().default(sql`ARRAY[]::text[]`).notNull(),
    spiceLevel: integer('spice_level').default(0).notNull(), // 0 to 3
    taxRateBp: integer('tax_rate_bp'), // null means use default
    sacCode: varchar('sac_code', { length: 10 }).default('996331').notNull(),
    availability: varchar('availability', { length: 20 }).default('AVAILABLE').notNull(), // AVAILABLE, SOLD_OUT_TODAY, OFF
    soldOutUntil: timestamp('sold_out_until', { withTimezone: true }),
    dailyLimit: integer('daily_limit'), // null means unlimited
    soldToday: integer('sold_today').default(0).notNull(),
    prepTimeMinutes: integer('prep_time_minutes').default(15).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_menu_items_sort').on(table.restaurantId, table.categoryId, table.sortOrder),
    check('chk_menu_items_base_price', sql`base_price >= 0`),
    check('chk_menu_items_sold_today', sql`sold_today >= 0`),
  ]
);

// 8. Menu Item Variants
export const menuItemVariants = pgTable(
  'menu_item_variants',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    price: integer('price').notNull(), // absolute price in paise
    sortOrder: integer('sort_order').default(0).notNull(),
    isAvailable: boolean('is_available').default(true).notNull(),
  },
  (table) => [
    index('idx_variants_sort').on(table.itemId, table.sortOrder),
    check('chk_variant_price', sql`price >= 0`),
  ]
);

// 9. Modifier Groups & Options
export const modifierGroups = pgTable(
  'modifier_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    minSelect: integer('min_select').default(0).notNull(),
    maxSelect: integer('max_select').default(1).notNull(),
  },
  (table) => [
    check('chk_modifier_select_range', sql`min_select <= max_select`),
  ]
);

export const modifierOptions = pgTable(
  'modifier_options',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    groupId: uuid('group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 100 }).notNull(),
    priceDelta: integer('price_delta').default(0).notNull(), // paise added to item price
    isAvailable: boolean('is_available').default(true).notNull(),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    index('idx_mod_options_sort').on(table.groupId, table.sortOrder),
  ]
);

export const menuItemModifierGroups = pgTable(
  'menu_item_modifier_groups',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    itemId: uuid('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    groupId: uuid('group_id')
      .notNull()
      .references(() => modifierGroups.id, { onDelete: 'restrict' }),
    sortOrder: integer('sort_order').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('unique_item_mod_group').on(table.itemId, table.groupId),
  ]
);

// 10. Table Sessions
export const tableSessions = pgTable(
  'table_sessions',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 30 }).default('OPEN').notNull(), // OPEN, BILL_REQUESTED, BILLING, CLOSED
    closedReason: varchar('closed_reason', { length: 30 }), // PAID, WRITTEN_OFF, NO_CHARGE, EXPIRED
    openedBy: varchar('opened_by', { length: 50 }).notNull(), // CUSTOMER or user UUID
    tableCodeHash: varchar('table_code_hash', { length: 64 }),
    openedAt: timestamp('opened_at', { withTimezone: true }).defaultNow().notNull(),
    lastActivityAt: timestamp('last_activity_at', { withTimezone: true }).defaultNow().notNull(),
    billRequestedAt: timestamp('bill_requested_at', { withTimezone: true }),
    closedAt: timestamp('closed_at', { withTimezone: true }),
    closedBy: uuid('closed_by'),
    guestName: varchar('guest_name', { length: 100 }),
    guestPhone: varchar('guest_phone', { length: 20 }),
  },
  (table) => [
    // Partial unique index: at most one live session per table
    uniqueIndex('unique_live_session_per_table')
      .on(table.tableId)
      .where(sql`status IN ('OPEN', 'BILL_REQUESTED', 'BILLING')`),
    index('idx_sessions_activity').on(table.restaurantId, table.status, table.lastActivityAt),
  ]
);

// 11. Session Devices
export const sessionDevices = pgTable(
  'session_devices',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => tableSessions.id, { onDelete: 'restrict' }),
    deviceId: varchar('device_id', { length: 64 }).notNull(),
    label: varchar('label', { length: 50 }).default('Guest 1').notNull(),
    verifiedAt: timestamp('verified_at', { withTimezone: true }),
    verifiedBy: uuid('verified_by'),
    blockedAt: timestamp('blocked_at', { withTimezone: true }),
    firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('unique_session_device').on(table.sessionId, table.deviceId),
  ]
);

// 12. Orders
export const orders = pgTable(
  'orders',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => tableSessions.id, { onDelete: 'restrict' }),
    deviceId: varchar('device_id', { length: 64 }).notNull(),
    tableId: uuid('table_id')
      .notNull()
      .references(() => tables.id, { onDelete: 'restrict' }),
    tableLabelAtOrder: varchar('table_label_at_order', { length: 50 }).notNull(),
    businessDate: varchar('business_date', { length: 10 }).notNull(), // YYYY-MM-DD
    orderNumber: integer('order_number').notNull(),
    roundNo: integer('round_no').default(1).notNull(),
    status: varchar('status', { length: 30 }).default('PENDING_CONFIRMATION').notNull(),
    version: integer('version').default(1).notNull(),
    source: varchar('source', { length: 20 }).default('CUSTOMER').notNull(), // CUSTOMER, STAFF
    placedByUserId: uuid('placed_by_user_id'),
    note: text('note'),
    subtotal: integer('subtotal').notNull(), // paise
    etaMinutes: integer('eta_minutes').default(20).notNull(),
    rejectionReason: text('rejection_reason'),
    placedAt: timestamp('placed_at', { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp('accepted_at', { withTimezone: true }),
    readyAt: timestamp('ready_at', { withTimezone: true }),
    servedAt: timestamp('served_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('unique_order_number_per_day').on(table.restaurantId, table.businessDate, table.orderNumber),
    index('idx_orders_status').on(table.restaurantId, table.status, table.placedAt),
    index('idx_orders_session').on(table.sessionId),
    check('chk_order_subtotal', sql`subtotal >= 0`),
  ]
);

// 13. Order Lines
export const orderLines = pgTable(
  'order_lines',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    itemId: uuid('item_id')
      .notNull()
      .references(() => menuItems.id, { onDelete: 'restrict' }),
    name: varchar('name', { length: 150 }).notNull(),
    variantName: varchar('variant_name', { length: 100 }),
    modifiers: jsonb('modifiers').default([]).notNull(), // snapshot: [{ name, price_delta }]
    unitPrice: integer('unit_price').notNull(), // paise
    qty: integer('qty').notNull(),
    lineTotal: integer('line_total').notNull(), // unitPrice * qty
    taxRateBp: integer('tax_rate_bp').notNull(),
    sacCode: varchar('sac_code', { length: 10 }).default('996331').notNull(),
    note: text('note'),
    isAllergyNote: boolean('is_allergy_note').default(false).notNull(),
    status: varchar('status', { length: 20 }).default('ACTIVE').notNull(), // ACTIVE, VOID
    voidReason: text('void_reason'),
  },
  (table) => [
    check('chk_order_line_qty', sql`qty >= 1 AND qty <= 99`),
    check('chk_order_line_total', sql`line_total >= 0`),
  ]
);

// 14. Order History (Append-only)
export const orderHistory = pgTable(
  'order_history',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    orderId: uuid('order_id')
      .notNull()
      .references(() => orders.id, { onDelete: 'restrict' }),
    fromStatus: varchar('from_status', { length: 30 }).notNull(),
    toStatus: varchar('to_status', { length: 30 }).notNull(),
    actorType: varchar('actor_type', { length: 20 }).notNull(), // CUSTOMER, STAFF, SYSTEM
    actorId: varchar('actor_id', { length: 64 }),
    reason: text('reason'),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  }
);

// 15. Bills
export const bills = pgTable(
  'bills',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => tableSessions.id, { onDelete: 'restrict' }),
    status: varchar('status', { length: 20 }).default('DRAFT').notNull(), // DRAFT, PAID, VOID
    subtotal: integer('subtotal').notNull(),
    discount: integer('discount').default(0).notNull(),
    discountReason: text('discount_reason'),
    discountApprovedBy: uuid('discount_approved_by'),
    serviceCharge: integer('service_charge').default(0).notNull(),
    taxableTotal: integer('taxable_total').default(0).notNull(),
    cgstTotal: integer('cgst_total').default(0).notNull(),
    sgstTotal: integer('sgst_total').default(0).notNull(),
    roundOff: integer('round_off').default(0).notNull(),
    total: integer('total').notNull(),
    paidTotal: integer('paid_total').default(0).notNull(),
    priceMode: varchar('price_mode', { length: 20 }).notNull(),
    taxScheme: varchar('tax_scheme', { length: 20 }).notNull(),
    invoiceNumber: varchar('invoice_number', { length: 32 }),
    invoiceFy: varchar('invoice_fy', { length: 10 }),
    issuedAt: timestamp('issued_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    // Partial unique index: at most one live bill per session
    uniqueIndex('unique_live_bill_per_session')
      .on(table.sessionId)
      .where(sql`status IN ('DRAFT', 'PAID')`),
    // Unique invoice number per FY
    uniqueIndex('unique_invoice_number_fy')
      .on(table.restaurantId, table.invoiceFy, table.invoiceNumber)
      .where(sql`invoice_number IS NOT NULL`),
    check('chk_bill_paid_invoice', sql`status <> 'PAID' OR invoice_number IS NOT NULL`),
    check('chk_bill_amounts', sql`subtotal >= 0 AND total >= 0`),
  ]
);

// 16. Bill Lines
export const billLines = pgTable('bill_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  billId: uuid('bill_id')
    .notNull()
    .references(() => bills.id, { onDelete: 'restrict' }),
  orderLineId: uuid('order_line_id')
    .notNull()
    .references(() => orderLines.id, { onDelete: 'restrict' }),
  name: varchar('name', { length: 150 }).notNull(),
  qty: integer('qty').notNull(),
  lineTotal: integer('line_total').notNull(),
  taxRateBp: integer('tax_rate_bp').notNull(),
  sacCode: varchar('sac_code', { length: 10 }).notNull(),
});

// 17. Bill Tax Lines
export const billTaxLines = pgTable('bill_tax_lines', {
  id: uuid('id').defaultRandom().primaryKey(),
  billId: uuid('bill_id')
    .notNull()
    .references(() => bills.id, { onDelete: 'restrict' }),
  taxRateBp: integer('tax_rate_bp').notNull(),
  taxableValue: integer('taxable_value').notNull(),
  cgst: integer('cgst').notNull(),
  sgst: integer('sgst').notNull(),
});

// 18. Payments (Append-only)
export const payments = pgTable(
  'payments',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    billId: uuid('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'restrict' }),
    method: varchar('method', { length: 20 }).notNull(), // CASH, UPI, CARD, OTHER
    kind: varchar('kind', { length: 20 }).default('PAYMENT').notNull(), // PAYMENT, REFUND, REVERSAL
    amount: integer('amount').notNull(), // paise
    reference: varchar('reference', { length: 100 }),
    reversesPaymentId: uuid('reverses_payment_id'),
    takenBy: uuid('taken_by'),
    takenAt: timestamp('taken_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    check('chk_payment_amount', sql`amount > 0`),
  ]
);

// 19. Credit Notes (Append-only)
export const creditNotes = pgTable(
  'credit_notes',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    billId: uuid('bill_id')
      .notNull()
      .references(() => bills.id, { onDelete: 'restrict' }),
    noteNumber: varchar('note_number', { length: 32 }).notNull(),
    fy: varchar('fy', { length: 10 }).notNull(),
    reason: text('reason').notNull(),
    taxableValue: integer('taxable_value').notNull(),
    cgst: integer('cgst').notNull(),
    sgst: integer('sgst').notNull(),
    total: integer('total').notNull(),
    createdBy: uuid('created_by').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('unique_credit_note_fy').on(table.restaurantId, table.fy, table.noteNumber),
  ]
);

// 20. Calls (Waiter / Bill)
export const calls = pgTable(
  'calls',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    sessionId: uuid('session_id')
      .notNull()
      .references(() => tableSessions.id, { onDelete: 'restrict' }),
    type: varchar('type', { length: 20 }).notNull(), // WAITER or BILL
    status: varchar('status', { length: 20 }).default('OPEN').notNull(), // OPEN or DONE
    handledBy: uuid('handled_by'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    handledAt: timestamp('handled_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_calls_status').on(table.restaurantId, table.status, table.createdAt),
  ]
);

// 21. Events (Transactional Outbox)
export const events = pgTable(
  'events',
  {
    id: bigserial('id', { mode: 'number' }).primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    channel: varchar('channel', { length: 50 }).notNull(),
    type: varchar('type', { length: 50 }).notNull(),
    sessionId: uuid('session_id'),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index('idx_events_lookup').on(table.restaurantId, table.id),
  ]
);

// 22. Idempotency Keys
export const idempotencyKeys = pgTable(
  'idempotency_keys',
  {
    scopeType: varchar('scope_type', { length: 20 }).notNull(), // DEVICE, USER
    scopeId: varchar('scope_id', { length: 64 }).notNull(),
    key: varchar('key', { length: 64 }).notNull(),
    requestHash: varchar('request_hash', { length: 64 }).notNull(),
    response: jsonb('response').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    uniqueIndex('pk_idempotency').on(table.scopeType, table.scopeId, table.key),
  ]
);

// 23. Counters (Sequential numbering)
export const counters = pgTable(
  'counters',
  {
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    key: varchar('key', { length: 50 }).notNull(), // e.g. "order:2026-10-27", "invoice:26-27"
    value: integer('value').default(0).notNull(),
  },
  (table) => [
    uniqueIndex('pk_counters').on(table.restaurantId, table.key),
  ]
);

// 24. Audit Logs (Append-only)
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    restaurantId: uuid('restaurant_id')
      .notNull()
      .references(() => restaurants.id, { onDelete: 'restrict' }),
    actorId: varchar('actor_id', { length: 64 }),
    action: varchar('action', { length: 50 }).notNull(),
    entity: varchar('entity', { length: 50 }).notNull(),
    entityId: varchar('entity_id', { length: 64 }),
    before: jsonb('before'),
    after: jsonb('after'),
    ip: varchar('ip', { length: 50 }),
    at: timestamp('at', { withTimezone: true }).defaultNow().notNull(),
  }
);
