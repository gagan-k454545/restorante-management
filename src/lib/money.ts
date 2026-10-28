/**
 * Money utilities for integer paise representation
 */

export function formatPaiseToRupees(paise: number): string {
  const rupees = paise / 100;
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(rupees);
}

export function rupeesToPaise(rupees: number): number {
  return Math.round(rupees * 100);
}

export function assertNonNegativePaise(paise: number, label = 'Amount'): void {
  if (!Number.isInteger(paise) || paise < 0) {
    throw new Error(`${label} must be a non-negative integer number of paise, received: ${paise}`);
  }
}
