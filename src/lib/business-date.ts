/**
 * Business Date and Financial Year Calculation
 * Strictly adheres to Section 5, 9, 16 of the Specification.
 */

/**
 * Calculates the current business date given a UTC timestamp, timezone, and cutoff (e.g. "04:00").
 * Returns date formatted as YYYY-MM-DD.
 */
export function getBusinessDate(
  dateUtc: Date = new Date(),
  timezone = 'Asia/Kolkata',
  cutoff = '04:00'
): string {
  // Convert UTC date to local date parts in restaurant timezone
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dateUtc);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  const hour = parseInt(partMap.hour, 10);
  const minute = parseInt(partMap.minute, 10);

  const [cutoffHourStr, cutoffMinuteStr] = cutoff.split(':');
  const cutoffHour = parseInt(cutoffHourStr, 10);
  const cutoffMinute = parseInt(cutoffMinuteStr || '0', 10);

  // If time is before cutoff, belongs to previous calendar day
  const isBeforeCutoff = hour < cutoffHour || (hour === cutoffHour && minute < cutoffMinute);

  const localCalendarDate = new Date(Date.UTC(year, month - 1, day));
  if (isBeforeCutoff) {
    localCalendarDate.setUTCDate(localCalendarDate.getUTCDate() - 1);
  }

  return localCalendarDate.toISOString().slice(0, 10);
}

/**
 * Computes Indian Financial Year format "YY-YY" (April 1 to March 31).
 * E.g., for business date 2026-10-27 -> "26-27"
 * For business date 2027-02-15 -> "26-27"
 */
export function getFinancialYear(businessDateStr: string): string {
  const [yearStr, monthStr] = businessDateStr.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);

  let startYear = year;
  let endYear = year + 1;

  if (month < 4) {
    startYear = year - 1;
    endYear = year;
  }

  const startYY = String(startYear % 100).padStart(2, '0');
  const endYY = String(endYear % 100).padStart(2, '0');

  return `${startYY}-${endYY}`;
}

export function formatOrderNumber(seq: number): string {
  return `#${String(seq).padStart(3, '0')}`;
}

export function formatInvoiceNumber(prefix: string, fy: string, seq: number): string {
  return `${prefix}/${fy}/${String(seq).padStart(6, '0')}`;
}

export function formatCreditNoteNumber(fy: string, seq: number): string {
  return `CN/${fy}/${String(seq).padStart(6, '0')}`;
}
