import { describe, it, expect } from 'vitest';
import { calculatePricing, rhu, PricingSettings, PricingLineItem } from '@/lib/pricing';

describe('Pricing Module - Section 16 Specifications', () => {
  describe('Helper rhu (round half up)', () => {
    it('rounds integers half up correctly', () => {
      // 1042.5 -> floor((2 * 41700 * 500 + 20000) / 40000) = 1043
      expect(rhu(41700 * 500, 20000)).toBe(1043);
      // 1015.875 -> 1016
      expect(rhu(40635 * 500, 20000)).toBe(1016);
      // exactly .5 rounds up
      expect(rhu(1, 2)).toBe(1); // 0.5 -> 1
      expect(rhu(3, 2)).toBe(2); // 1.5 -> 2
      expect(rhu(0, 100)).toBe(0);
    });
  });

  describe('Section 16 Worked Examples', () => {
    // Case A: EXCLUSIVE, plain
    it('Case A: EXCLUSIVE, plain', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 24000, taxRateBp: 500 },
        { lineTotal: 5000, taxRateBp: 500 },
        { lineTotal: 5000, taxRateBp: 500 },
        { lineTotal: 9000, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings);

      expect(result.subtotal).toBe(43000);
      expect(result.discount).toBe(0);
      expect(result.serviceCharge).toBe(0);
      expect(result.taxableTotal).toBe(43000);
      expect(result.cgstTotal).toBe(1075);
      expect(result.sgstTotal).toBe(1075);
      expect(result.totalBeforeRound).toBe(45150);
      expect(result.total).toBe(45200);
      expect(result.roundOff).toBe(50);
    });

    // Case A2: Tax rounding
    it('Case A2: Tax rounding', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 41700, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings);

      expect(result.subtotal).toBe(41700);
      expect(result.taxableTotal).toBe(41700);
      expect(result.cgstTotal).toBe(1043);
      expect(result.sgstTotal).toBe(1043);
      expect(result.totalBeforeRound).toBe(43786);
      expect(result.total).toBe(43800);
      expect(result.roundOff).toBe(14);
    });

    // Case B: EXCLUSIVE with discount and service charge
    it('Case B: EXCLUSIVE with discount and service charge', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 43000, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 500, // 5%
        serviceChargeTaxable: true,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings, { type: 'PERCENT', value: 10 });

      expect(result.subtotal).toBe(43000);
      expect(result.discount).toBe(4300);
      expect(result.afterDiscount).toBe(38700);
      expect(result.serviceCharge).toBe(1935);
      expect(result.taxableTotal).toBe(40635);
      expect(result.cgstTotal).toBe(1016);
      expect(result.sgstTotal).toBe(1016);
      expect(result.totalBeforeRound).toBe(42667);
      expect(result.total).toBe(42700);
      expect(result.roundOff).toBe(33);
    });

    // Case C: INCLUSIVE
    it('Case C: INCLUSIVE', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 43000, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'INCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings);

      expect(result.subtotal).toBe(43000);
      expect(result.discount).toBe(0);
      expect(result.serviceCharge).toBe(0);
      expect(result.taxableTotal).toBe(40952);
      expect(result.cgstTotal).toBe(1024);
      expect(result.sgstTotal).toBe(1024);
      expect(result.totalBeforeRound).toBe(43000);
      expect(result.total).toBe(43000);
      expect(result.roundOff).toBe(0);
    });

    // Case D: COMPOSITION
    it('Case D: COMPOSITION', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 43000, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'COMPOSITION',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings);

      expect(result.subtotal).toBe(43000);
      expect(result.taxableTotal).toBe(0);
      expect(result.cgstTotal).toBe(0);
      expect(result.sgstTotal).toBe(0);
      expect(result.taxLines.length).toBe(0);
      expect(result.totalBeforeRound).toBe(43000);
      expect(result.total).toBe(43000);
      expect(result.roundOff).toBe(0);
    });

    // Case E: Full discount
    it('Case E: Full discount', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 43000, taxRateBp: 500 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 500,
        serviceChargeTaxable: true,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings, { type: 'PERCENT', value: 100 });

      expect(result.subtotal).toBe(43000);
      expect(result.discount).toBe(43000);
      expect(result.afterDiscount).toBe(0);
      expect(result.serviceCharge).toBe(0);
      expect(result.taxableTotal).toBe(0);
      expect(result.cgstTotal).toBe(0);
      expect(result.sgstTotal).toBe(0);
      expect(result.totalBeforeRound).toBe(0);
      expect(result.total).toBe(0);
      expect(result.roundOff).toBe(0);
    });
  });

  describe('Invariant Properties', () => {
    it('CGST always equals SGST', () => {
      const lines: PricingLineItem[] = [
        { lineTotal: 12345, taxRateBp: 500 },
        { lineTotal: 67891, taxRateBp: 1800 },
      ];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 500,
        serviceChargeTaxable: true,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings, { type: 'FLAT', value: 5000 });
      expect(result.cgstTotal).toBe(result.sgstTotal);
      for (const line of result.taxLines) {
        expect(line.cgst).toBe(line.sgst);
      }
    });

    it('Round off stays strictly within -50 to +50 paise', () => {
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      for (let paise = 1000; paise <= 1100; paise++) {
        const result = calculatePricing([{ lineTotal: paise, taxRateBp: 500 }], settings);
        expect(result.roundOff).toBeGreaterThanOrEqual(-50);
        expect(result.roundOff).toBeLessThanOrEqual(50);
        expect(result.total % 100).toBe(0); // whole rupee
      }
    });

    it('Discount never exceeds subtotal even if flat amount is larger', () => {
      const lines: PricingLineItem[] = [{ lineTotal: 5000, taxRateBp: 500 }];
      const settings: PricingSettings = {
        taxScheme: 'REGULAR',
        priceMode: 'EXCLUSIVE',
        serviceChargeBp: 0,
        serviceChargeTaxable: false,
        roundOffEnabled: true,
      };

      const result = calculatePricing(lines, settings, { type: 'FLAT', value: 999999 });
      expect(result.discount).toBe(5000);
      expect(result.afterDiscount).toBe(0);
      expect(result.total).toBe(0);
    });
  });
});
