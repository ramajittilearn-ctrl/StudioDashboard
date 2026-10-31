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
 * Late fee calculation after the 5th of following month
 * Rule: daily fee * days past due date (only if balance due > 0 and status is not PAID)
 */
export function calcLateFeeSatang(
  invoice: Invoice,
  currentDateStr: string,
  settings: PropertySettings
): number {
  if (!invoice || invoice.status === 'PAID' || invoice.status === 'ROLLED_OVER') return 0;
  if ((invoice.balanceDueSatang || 0) <= 0) return 0;

  const due = new Date(invoice.dueDate + 'T23:59:59');
  const curr = new Date(currentDateStr + 'T12:00:00');
  if (curr <= due) return 0;

  const diffMs = curr.getTime() - due.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays) * (settings.dailyLateFeeSatang || 5000);
}
