/**
 * Pure Order State Machine
 * Strictly enforces Section 3 of the Specification.
 */

export type OrderStatus =
  | 'PENDING_CONFIRMATION'
  | 'PLACED'
  | 'ACCEPTED'
  | 'PREPARING'
  | 'READY'
  | 'SERVED'
  | 'REJECTED'
  | 'CANCELLED';

export type UserRole = 'OWNER' | 'MANAGER' | 'KITCHEN' | 'WAITER' | 'CASHIER';
export type ActorType = 'CUSTOMER' | 'STAFF' | 'SYSTEM';

export interface TransitionContext {
  actorType: ActorType;
  role?: UserRole;
  placedByDeviceId?: string;
  requestDeviceId?: string;
  secondsSincePlacement?: number;
  secondsSinceLastMove?: number;
  minutesSinceServed?: number;
  cancelWindowSeconds?: number;
  isKitchenOnline?: boolean;
  autoAcceptEnabled?: boolean;
  reason?: string;
  allLinesVoid?: boolean;
}

export interface TransitionValidationResult {
  allowed: boolean;
  errorCode?: string;
  errorMessage?: string;
}

export function canTransitionOrder(
  from: OrderStatus,
  to: OrderStatus,
  ctx: TransitionContext
): TransitionValidationResult {
  // REJECTED and CANCELLED are terminal
  if (from === 'REJECTED' || from === 'CANCELLED') {
    return {
      allowed: false,
      errorCode: 'INVALID_TRANSITION',
      errorMessage: `Order is already in terminal state ${from}`,
    };
  }

  // System rule: Any open status -> REJECTED when every line is VOID
  if (to === 'REJECTED' && ctx.actorType === 'SYSTEM' && ctx.allLinesVoid) {
    return { allowed: true };
  }

  // 1. PENDING_CONFIRMATION -> PLACED
  if (from === 'PENDING_CONFIRMATION' && to === 'PLACED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'WAITER' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only waiter, manager or owner can confirm orders' };
  }

  // 2. PENDING_CONFIRMATION -> REJECTED
  if (from === 'PENDING_CONFIRMATION' && to === 'REJECTED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'WAITER' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      if (!ctx.reason) {
        return { allowed: false, errorCode: 'REASON_REQUIRED', errorMessage: 'Rejection reason is required' };
      }
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only waiter, manager or owner can reject held orders' };
  }

  // 3. Guest cancellation: PENDING_CONFIRMATION or PLACED -> CANCELLED
  if ((from === 'PENDING_CONFIRMATION' || from === 'PLACED') && to === 'CANCELLED' && ctx.actorType === 'CUSTOMER') {
    if (ctx.placedByDeviceId && ctx.requestDeviceId && ctx.placedByDeviceId !== ctx.requestDeviceId) {
      return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only the device that placed the order can cancel it' };
    }
    const cancelWindow = ctx.cancelWindowSeconds ?? 60;
    if (ctx.secondsSincePlacement !== undefined && ctx.secondsSincePlacement > cancelWindow) {
      return { allowed: false, errorCode: 'CANCEL_WINDOW_EXPIRED', errorMessage: 'Cancellation window has expired' };
    }
    return { allowed: true };
  }

  // 4. Staff cancellation: PLACED, ACCEPTED, PREPARING, READY -> CANCELLED
  if (['PLACED', 'ACCEPTED', 'PREPARING', 'READY'].includes(from) && to === 'CANCELLED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      if (!ctx.reason) {
        return { allowed: false, errorCode: 'REASON_REQUIRED', errorMessage: 'Cancellation reason is required' };
      }
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only manager or owner can cancel active orders' };
  }

  // 5. PLACED -> ACCEPTED
  if (from === 'PLACED' && to === 'ACCEPTED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'KITCHEN' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      return { allowed: true };
    }
    if (ctx.actorType === 'SYSTEM' && ctx.autoAcceptEnabled && ctx.isKitchenOnline) {
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Acceptance not permitted' };
  }

  // 6. PLACED, ACCEPTED, PREPARING -> REJECTED (Kitchen, Manager)
  if (['PLACED', 'ACCEPTED', 'PREPARING'].includes(from) && to === 'REJECTED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'KITCHEN' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      if (!ctx.reason) {
        return { allowed: false, errorCode: 'REASON_REQUIRED', errorMessage: 'Rejection reason is required' };
      }
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only kitchen or manager can reject this order' };
  }

  // 7. ACCEPTED -> PREPARING
  if (from === 'ACCEPTED' && to === 'PREPARING') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'KITCHEN' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only kitchen or manager can start preparation' };
  }

  // 8. PREPARING -> READY
  if (from === 'PREPARING' && to === 'READY') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'KITCHEN' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only kitchen or manager can mark ready' };
  }

  // 9. READY -> SERVED
  if (from === 'READY' && to === 'SERVED') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'WAITER' || ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only waiter, manager or owner can mark served' };
  }

  // 10. Undo to previous status: ACCEPTED -> PLACED, PREPARING -> ACCEPTED, READY -> PREPARING
  const undoMap: Record<OrderStatus, OrderStatus> = {
    ACCEPTED: 'PLACED',
    PREPARING: 'ACCEPTED',
    READY: 'PREPARING',
    PENDING_CONFIRMATION: 'PENDING_CONFIRMATION',
    PLACED: 'PLACED',
    SERVED: 'SERVED',
    REJECTED: 'REJECTED',
    CANCELLED: 'CANCELLED',
  };

  if (undoMap[from] === to) {
    if (ctx.actorType === 'STAFF') {
      // Manager can undo any time before SERVED
      if (ctx.role === 'MANAGER' || ctx.role === 'OWNER') {
        return { allowed: true };
      }
      // Kitchen can undo within 60s
      if (ctx.role === 'KITCHEN') {
        if (ctx.secondsSinceLastMove !== undefined && ctx.secondsSinceLastMove > 60) {
          return { allowed: false, errorCode: 'UNDO_WINDOW_EXPIRED', errorMessage: 'Kitchen undo window is 60 seconds' };
        }
        return { allowed: true };
      }
    }
  }

  // 11. Recall: SERVED -> READY (Manager within 10 minutes)
  if (from === 'SERVED' && to === 'READY') {
    if (ctx.actorType === 'STAFF' && (ctx.role === 'MANAGER' || ctx.role === 'OWNER')) {
      if (ctx.minutesSinceServed !== undefined && ctx.minutesSinceServed > 10) {
        return { allowed: false, errorCode: 'RECALL_WINDOW_EXPIRED', errorMessage: 'Recall window is 10 minutes' };
      }
      return { allowed: true };
    }
    return { allowed: false, errorCode: 'FORBIDDEN', errorMessage: 'Only manager can recall served order' };
  }

  return {
    allowed: false,
    errorCode: 'INVALID_TRANSITION',
    errorMessage: `Transition from ${from} to ${to} is not permitted`,
  };
}
