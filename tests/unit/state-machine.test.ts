import { describe, it, expect } from 'vitest';
import { canTransitionOrder } from '@/lib/state-machine';

describe('Order State Machine - Section 3 Specification', () => {
  it('allows WAITER to confirm PENDING_CONFIRMATION to PLACED', () => {
    const res = canTransitionOrder('PENDING_CONFIRMATION', 'PLACED', {
      actorType: 'STAFF',
      role: 'WAITER',
    });
    expect(res.allowed).toBe(true);
  });

  it('rejects KITCHEN from confirming PENDING_CONFIRMATION', () => {
    const res = canTransitionOrder('PENDING_CONFIRMATION', 'PLACED', {
      actorType: 'STAFF',
      role: 'KITCHEN',
    });
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('FORBIDDEN');
  });

  it('allows GUEST to cancel within cancel window', () => {
    const res = canTransitionOrder('PLACED', 'CANCELLED', {
      actorType: 'CUSTOMER',
      placedByDeviceId: 'device-1',
      requestDeviceId: 'device-1',
      secondsSincePlacement: 30,
      cancelWindowSeconds: 60,
    });
    expect(res.allowed).toBe(true);
  });

  it('rejects GUEST from cancelling after cancel window expires', () => {
    const res = canTransitionOrder('PLACED', 'CANCELLED', {
      actorType: 'CUSTOMER',
      placedByDeviceId: 'device-1',
      requestDeviceId: 'device-1',
      secondsSincePlacement: 65,
      cancelWindowSeconds: 60,
    });
    expect(res.allowed).toBe(false);
    expect(res.errorCode).toBe('CANCEL_WINDOW_EXPIRED');
  });

  it('rejects GUEST from cancelling after kitchen accepted', () => {
    const res = canTransitionOrder('ACCEPTED', 'CANCELLED', {
      actorType: 'CUSTOMER',
      placedByDeviceId: 'device-1',
      requestDeviceId: 'device-1',
      secondsSincePlacement: 10,
    });
    expect(res.allowed).toBe(false);
  });

  it('allows KITCHEN to accept PLACED order', () => {
    const res = canTransitionOrder('PLACED', 'ACCEPTED', {
      actorType: 'STAFF',
      role: 'KITCHEN',
    });
    expect(res.allowed).toBe(true);
  });

  it('allows SYSTEM auto-accept only when kitchen is online', () => {
    const onlineRes = canTransitionOrder('PLACED', 'ACCEPTED', {
      actorType: 'SYSTEM',
      autoAcceptEnabled: true,
      isKitchenOnline: true,
    });
    expect(onlineRes.allowed).toBe(true);

    const offlineRes = canTransitionOrder('PLACED', 'ACCEPTED', {
      actorType: 'SYSTEM',
      autoAcceptEnabled: true,
      isKitchenOnline: false,
    });
    expect(offlineRes.allowed).toBe(false);
  });

  it('enforces terminal status for REJECTED and CANCELLED', () => {
    const rej = canTransitionOrder('REJECTED', 'PLACED', {
      actorType: 'STAFF',
      role: 'OWNER',
    });
    expect(rej.allowed).toBe(false);
    expect(rej.errorCode).toBe('INVALID_TRANSITION');

    const can = canTransitionOrder('CANCELLED', 'PLACED', {
      actorType: 'STAFF',
      role: 'OWNER',
    });
    expect(can.allowed).toBe(false);
    expect(can.errorCode).toBe('INVALID_TRANSITION');
  });

  it('allows KITCHEN undo within 60s and rejects after 60s', () => {
    const within = canTransitionOrder('PREPARING', 'ACCEPTED', {
      actorType: 'STAFF',
      role: 'KITCHEN',
      secondsSinceLastMove: 45,
    });
    expect(within.allowed).toBe(true);

    const after = canTransitionOrder('PREPARING', 'ACCEPTED', {
      actorType: 'STAFF',
      role: 'KITCHEN',
      secondsSinceLastMove: 70,
    });
    expect(after.allowed).toBe(false);
    expect(after.errorCode).toBe('UNDO_WINDOW_EXPIRED');
  });
});
