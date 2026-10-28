/**
 * Pure Pricing Module for QR Restaurant Ordering System
 * Strictly adheres to Section 16 of the Specification.
 * All monetary amounts are integer paise.
 */

export interface PricingLineItem {
  lineTotal: number; // in paise
  taxRateBp: number; // basis points, e.g. 500 for 5%
}

export type TaxScheme = 'REGULAR' | 'COMPOSITION';
export type PriceMode = 'EXCLUSIVE' | 'INCLUSIVE';

export interface DiscountInput {
  type: 'FLAT' | 'PERCENT';
  value: number; // flat amount in paise or integer percent (0-100)
}

export interface PricingSettings {
  taxScheme: TaxScheme;
  priceMode: PriceMode;
  serviceChargeBp: number; // basis points (e.g. 500 = 5%, 0 = none)
  serviceChargeTaxable: boolean;
  roundOffEnabled: boolean;
}

export interface TaxGroupBreakdown {
  taxRateBp: number;
  baseAmount: number;
  serviceChargeTaxable: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
}

export interface PricingResult {
  subtotal: number;
  discount: number;
  afterDiscount: number;
  serviceCharge: number;
  taxableTotal: number;
  cgstTotal: number;
  sgstTotal: number;
  totalBeforeRound: number;
  total: number;
  roundOff: number;
  taxLines: TaxGroupBreakdown[];
}

/**
 * Round half up for non-negative integers: floor((2n + d) / (2d))
 */
export function rhu(n: number, d: number): number {
  if (d <= 0) throw new Error('Division by zero or negative divisor');
  if (n < 0) throw new Error('rhu expects non-negative numerator');
  return Math.floor((2 * n + d) / (2 * d));
}

/**
 * Computes exact order/bill price, tax, discount, service charge, and rounding.
 */
export function calculatePricing(
  lines: PricingLineItem[],
  settings: PricingSettings,
  discountInput?: DiscountInput | null
): PricingResult {
  // 1. Subtotal = sum of line_total of all billable lines
  const subtotal = lines.reduce((acc, line) => acc + line.lineTotal, 0);

  // 2. Discount = flat or rhu(subtotal * percent, 100), never more than subtotal
  let discount = 0;
  if (discountInput && discountInput.value > 0) {
    if (discountInput.type === 'FLAT') {
      discount = Math.min(discountInput.value, subtotal);
    } else {
      const pct = Math.min(discountInput.value, 100);
      discount = rhu(subtotal * pct, 100);
      if (discount > subtotal) discount = subtotal;
    }
  }

  // 3. After discount
  const afterDiscount = subtotal - discount;

  // 4. Service charge = rhu(after_discount * service_charge_bp, 10000)
  const serviceCharge = settings.serviceChargeBp > 0
    ? rhu(afterDiscount * settings.serviceChargeBp, 10000)
    : 0;

  // If COMPOSITION scheme
  if (settings.taxScheme === 'COMPOSITION') {
    const totalBeforeRound = afterDiscount + serviceCharge;
    let total = totalBeforeRound;
    let roundOff = 0;
    if (settings.roundOffEnabled && totalBeforeRound > 0) {
      total = rhu(totalBeforeRound, 100) * 100;
      roundOff = total - totalBeforeRound;
    }
    return {
      subtotal,
      discount,
      afterDiscount,
      serviceCharge,
      taxableTotal: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      totalBeforeRound,
      total,
      roundOff,
      taxLines: [],
    };
  }

  // REGULAR SCHEME
  // Group lines by tax rate
  const groupsMap = new Map<number, number>();
  for (const line of lines) {
    const current = groupsMap.get(line.taxRateBp) || 0;
    groupsMap.set(line.taxRateBp, current + line.lineTotal);
  }

  // If no lines, handle empty
  if (groupsMap.size === 0) {
    return {
      subtotal: 0,
      discount: 0,
      afterDiscount: 0,
      serviceCharge: 0,
      taxableTotal: 0,
      cgstTotal: 0,
      sgstTotal: 0,
      totalBeforeRound: 0,
      total: 0,
      roundOff: 0,
      taxLines: [],
    };
  }

  const groups = Array.from(groupsMap.entries()).map(([taxRateBp, groupTotal]) => ({
    taxRateBp,
    groupTotal,
  }));

  // Sort descending by groupTotal to find the largest group for rounding remainders
  groups.sort((a, b) => b.groupTotal - a.groupTotal);

  // 5. Share discount and service charge over tax groups in proportion to line totals
  // Remainder goes to largest group (groups[0])
  let allocatedDiscount = 0;
  let allocatedSc = 0;

  interface IntermediateGroup {
    taxRateBp: number;
    base_g: number;
    sc_g: number;
    sc_taxable_g: number;
  }

  const intermediateGroups: IntermediateGroup[] = groups.map((g, index) => {
    let discountShare = 0;
    let scShare = 0;
    if (subtotal > 0) {
      if (index === 0) {
        // Will compute after allocating other groups
      } else {
        discountShare = rhu(discount * g.groupTotal, subtotal);
        allocatedDiscount += discountShare;
        scShare = rhu(serviceCharge * g.groupTotal, subtotal);
        allocatedSc += scShare;
      }
    }
    return {
      taxRateBp: g.taxRateBp,
      base_g: g.groupTotal - discountShare,
      sc_g: scShare,
      sc_taxable_g: settings.serviceChargeTaxable ? scShare : 0,
    };
  });

  // Remainder to largest group
  if (groups.length > 0) {
    const largestDiscountShare = discount - allocatedDiscount;
    const largestScShare = serviceCharge - allocatedSc;
    intermediateGroups[0].base_g = groups[0].groupTotal - largestDiscountShare;
    intermediateGroups[0].sc_g = largestScShare;
    intermediateGroups[0].sc_taxable_g = settings.serviceChargeTaxable ? largestScShare : 0;
  }

  let taxableTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let totalBeforeRound = 0;

  const taxLines: TaxGroupBreakdown[] = [];

  if (settings.priceMode === 'EXCLUSIVE') {
    // 6. taxable_g = base_g + sc_taxable_g
    // 7. cgst_g = sgst_g = rhu(taxable_g x rate_bp_g, 20000)
    for (const g of intermediateGroups) {
      const taxable_g = g.base_g + g.sc_taxable_g;
      const cgst_g = rhu(taxable_g * g.taxRateBp, 20000);
      const sgst_g = cgst_g; // always equal

      taxableTotal += taxable_g;
      cgstTotal += cgst_g;
      sgstTotal += sgst_g;

      taxLines.push({
        taxRateBp: g.taxRateBp,
        baseAmount: g.base_g,
        serviceChargeTaxable: g.sc_taxable_g,
        taxableValue: taxable_g,
        cgst: cgst_g,
        sgst: sgst_g,
      });
    }
    // 8. total_before_round = after_discount + service_charge + sum(cgst_g + sgst_g)
    totalBeforeRound = afterDiscount + serviceCharge + cgstTotal + sgstTotal;
  } else {
    // INCLUSIVE
    // 6. item_half_g = rhu(base_g x rate_bp_g, 2 x (10000 + rate_bp_g))
    // 7. sc_half_g = rhu(sc_taxable_g x rate_bp_g, 20000)
    // 8. cgst_g = sgst_g = item_half_g + sc_half_g
    //    taxable_g = (base_g - 2 x item_half_g) + sc_taxable_g
    let sumScHalf = 0;
    for (const g of intermediateGroups) {
      const item_half_g = rhu(g.base_g * g.taxRateBp, 2 * (10000 + g.taxRateBp));
      const sc_half_g = rhu(g.sc_taxable_g * g.taxRateBp, 20000);
      const cgst_g = item_half_g + sc_half_g;
      const sgst_g = cgst_g; // always equal
      const taxable_g = (g.base_g - 2 * item_half_g) + g.sc_taxable_g;

      taxableTotal += taxable_g;
      cgstTotal += cgst_g;
      sgstTotal += sgst_g;
      sumScHalf += sc_half_g;

      taxLines.push({
        taxRateBp: g.taxRateBp,
        baseAmount: g.base_g,
        serviceChargeTaxable: g.sc_taxable_g,
        taxableValue: taxable_g,
        cgst: cgst_g,
        sgst: sgst_g,
      });
    }
    // 9. total_before_round = after_discount + service_charge + sum(2 x sc_half_g)
    totalBeforeRound = afterDiscount + serviceCharge + 2 * sumScHalf;
  }

  // 10. ROUND OFF
  let total = totalBeforeRound;
  let roundOff = 0;
  if (settings.roundOffEnabled && totalBeforeRound > 0) {
    total = rhu(totalBeforeRound, 100) * 100;
    roundOff = total - totalBeforeRound;
  }

  return {
    subtotal,
    discount,
    afterDiscount,
    serviceCharge,
    taxableTotal,
    cgstTotal,
    sgstTotal,
    totalBeforeRound,
    total,
    roundOff,
    taxLines,
  };
}
