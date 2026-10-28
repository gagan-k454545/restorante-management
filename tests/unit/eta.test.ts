import { describe, it, expect } from 'vitest';
import { calculateEtaMinutes, formatEtaRange } from '@/lib/eta';

describe('ETA Calculation - Section 7 Specification', () => {
  it('computes ETA without queue delay when below capacity', () => {
    const eta = calculateEtaMinutes({
      linePrepTimes: [10, 15, 8],
      activeTickets: 5,
      kitchenCapacityTickets: 10,
      minutesPerExtraTicket: 2,
      extraDelayMinutes: 0,
    });

    // max(prep times) = 15, queueDelay = 0
    expect(eta).toBe(15);
    const range = formatEtaRange(eta);
    expect(range.min).toBe(15);
    expect(range.max).toBe(20);
    expect(range.label).toBe('15–20 mins');
  });

  it('adds queue delay and busy delay when kitchen is overloaded', () => {
    const eta = calculateEtaMinutes({
      linePrepTimes: [12, 18],
      activeTickets: 15, // 5 extra tickets over capacity 10
      kitchenCapacityTickets: 10,
      minutesPerExtraTicket: 2, // 5 * 2 = 10m
      extraDelayMinutes: 10, // Busy mode +10m
    });

    // 18 + 10 + 10 = 38m
    expect(eta).toBe(38);
    const range = formatEtaRange(eta);
    expect(range.label).toBe('38–43 mins');
  });
});
