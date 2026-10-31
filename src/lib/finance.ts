import { Invoice, PropertySettings } from '../types';

/**
 * Convert Baht to Satang (Integer)
 * 1 THB = 100 Satang
 */
export function toSatang(baht: number | string): number {
  return Math.round(Number(baht || 0) * 100);
}

/**
 * Convert Satang to Baht (Float with 2 decimals)
 */
export function fromSatang(satang: number): number {
  return Math.round(Number(satang || 0)) / 100;
}

/**
 * Format Satang to Thai Baht String (e.g. "3,500.00")
 */
export function formatBaht(satang: number): string {
  const val = fromSatang(satang);
  return val.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Meter consumption with 4-digit rollover support (9999 -> 0000)
 */
export function calcMeterUnits(prev: number, curr: number, isRollover: boolean): number {
  const p = Math.round(Number(prev || 0));
  const c = Math.round(Number(curr || 0));
  if (isRollover) {
    return (10000 - p) + c;
  }
  return c - p;
}

/**
 * Proration formula: Monthly Rent / 30 fixed days * days up to the 25th
 */
export function calcProratedRentSatang(
  monthlyRentSatang: number,
  moveInDateStr: string,
  billingDay: number = 25
): { dailyRateSatang: number; proratedDays: number; proratedAmountSatang: number } {
  const parts = (moveInDateStr || '2026-10-10').split('-');
  const dayOfMonth = parseInt(parts[2], 10) || 1;
  const dailyRateSatang = Math.round(monthlyRentSatang / 30);
  let days = 0;
  if (dayOfMonth <= billingDay) {
    days = (billingDay - dayOfMonth) + 1;
  } else {
    days = (30 - dayOfMonth) + billingDay;
  }
  return {
    dailyRateSatang,
    proratedDays: days,
    proratedAmountSatang: dailyRateSatang * days
  };
}

/**
 * Calculate next month due date (e.g. 2026-10-25 -> 2026-11-05, 2026-12-25 -> 2027-01-05)
 */
export function calcNextDueDate(issueDateStr: string, dueDay: number = 5): string {
  const parts = (issueDateStr || '').split('-');
  const year = parseInt(parts[0], 10) || 2026;
  const month = parseInt(parts[1], 10) || 1;

  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  const mm = String(nextMonth).padStart(2, '0');
  const dd = String(dueDay).padStart(2, '0');
  return `${nextYear}-${mm}-${dd}`;
}

/**
 * Parse YYYY-MM-DD into UTC midnight timestamp (ms)
 */
function parseDateUtcMs(dateStr: string): number {
  const parts = (dateStr || '').split('-');
  const y = parseInt(parts[0], 10) || 2026;
  const m = (parseInt(parts[1], 10) || 1) - 1;
  const d = parseInt(parts[2], 10) || 1;
  return Date.UTC(y, m, d);
}

/**
 * Late fee calculation after the due date (e.g. 5th of following month)
 * Rule: daily fee * calendar days past due date (only if balance due > 0 and status is not PAID)
 * Subtracts any lateFeeSatang already baked into the invoice so partial payments never double-count.
 */
export function calcLateFeeSatang(
  invoice: Invoice,
  currentDateStr: string,
  settings: PropertySettings
): number {
  if (!invoice || invoice.status === 'PAID' || invoice.status === 'ROLLED_OVER') return 0;
  if ((invoice.balanceDueSatang || 0) <= 0) return 0;
  if (!invoice.dueDate || !currentDateStr) return 0;

  const dueMs = parseDateUtcMs(invoice.dueDate);
  const currMs = parseDateUtcMs(currentDateStr);
  if (currMs <= dueMs) return 0;

  const diffDays = Math.round((currMs - dueMs) / (1000 * 60 * 60 * 24));
  const totalAccruedSatang = Math.max(0, diffDays) * (settings.dailyLateFeeSatang || 5000);
  const alreadyRecordedSatang = invoice.lateFeeSatang || 0;
  return Math.max(0, totalAccruedSatang - alreadyRecordedSatang);
}

/**
 * Get the latest active (non-ROLLED_OVER) invoice for a room.
 * Prioritizes unpaid invoices, and picks the latest billingPeriod (and latest item in array).
 */
export function getLatestRoomInvoice(invoices: Invoice[], roomNumber: string): Invoice | undefined {
  const active = (invoices || []).filter(
    i => i.roomNumber === roomNumber && i.status !== 'ROLLED_OVER'
  );
  if (active.length === 0) return undefined;
  const unpaid = active.filter(i => i.balanceDueSatang > 0);
  const pool = unpaid.length > 0 ? unpaid : active;
  return pool.reduce((latest, curr) => {
    if ((curr.billingPeriod || '') >= (latest.billingPeriod || '')) {
      return curr;
    }
    return latest;
  }, pool[0]);
}
