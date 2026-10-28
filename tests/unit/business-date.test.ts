import { describe, it, expect } from 'vitest';
import {
  getBusinessDate,
  getFinancialYear,
  formatOrderNumber,
  formatInvoiceNumber,
  formatCreditNoteNumber,
} from '@/lib/business-date';

describe('Business Date & Invoicing - Section 5, 9, 16 Specifications', () => {
  it('correctly shifts business date before 04:00 cutoff', () => {
    // 27 Oct 2026 01:30 AM IST (which is 26 Oct 20:00 UTC)
    const earlyMorningIst = new Date('2026-10-26T20:00:00.000Z');
    const bDate = getBusinessDate(earlyMorningIst, 'Asia/Kolkata', '04:00');
    expect(bDate).toBe('2026-10-26');

    // 27 Oct 2026 05:00 AM IST (which is 26 Oct 23:30 UTC)
    const afterCutoffIst = new Date('2026-10-26T23:30:00.000Z');
    const bDateAfter = getBusinessDate(afterCutoffIst, 'Asia/Kolkata', '04:00');
    expect(bDateAfter).toBe('2026-10-27');
  });

  it('correctly calculates Indian Financial Year (April 1 - March 31)', () => {
    // Oct 2026 -> 26-27
    expect(getFinancialYear('2026-10-27')).toBe('26-27');
    // Jan 2027 -> 26-27
    expect(getFinancialYear('2027-01-15')).toBe('26-27');
    // April 2027 -> 27-28
    expect(getFinancialYear('2027-04-01')).toBe('27-28');
  });

  it('formats order numbers with 3-digit zero padding (#023)', () => {
    expect(formatOrderNumber(1)).toBe('#001');
    expect(formatOrderNumber(23)).toBe('#023');
    expect(formatOrderNumber(105)).toBe('#105');
  });

  it('formats gapless sequential invoice numbers with prefix, FY and 6 digits', () => {
    const inv = formatInvoiceNumber('INV', '26-27', 123);
    expect(inv).toBe('INV/26-27/000123');
    expect(inv.length).toBeLessThanOrEqual(16);
  });

  it('formats credit note numbers with CN, FY and 6 digits', () => {
    const cn = formatCreditNoteNumber('26-27', 1);
    expect(cn).toBe('CN/26-27/000001');
  });
});
