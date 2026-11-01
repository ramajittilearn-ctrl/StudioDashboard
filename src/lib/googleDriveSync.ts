import { initializeApp, getApps } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

export const DEFAULT_REGISTRATIONS_SHEET_ID = '1Z1nEbrR18ZuN0yFvClf-JXlbD4UAVCL9CSwzTKPJAOs';
export const DEFAULT_PAYMENTS_SHEET_ID = '1UWRoQFTI_Ok-wqKWRBkIVU-g_XWWdO_p3hlBKmLhltU';

export const LIVE_REGISTRATIONS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_REGISTRATIONS_SHEET_ID}/edit`;
export const LIVE_PAYMENTS_SHEET_URL = `https://docs.google.com/spreadsheets/d/${DEFAULT_PAYMENTS_SHEET_ID}/edit`;

const ROOMS = [
  '101', '102', '103', '104', '105',
  '201', '202', '203', '204', '205',
  '301', '302', '303', '304', '305'
];

const SESSION_TOKEN_KEY = 'taky_gdrive_oauth_v1';
const LINK_SHARE_MODE_KEY = 'taky_gdrive_link_mode_v1';

// Isolated secondary Firebase Auth instance so selecting another Google account (e.g. ramajitti.learn@gmail.com)
// never logs out the primary Dashboard Admin session (p.ramajitti@gmail.com).
const driveApp =
  getApps().find(a => a.name === 'gdrive-sync') || initializeApp(firebaseConfig, 'gdrive-sync');
const driveAuth = getAuth(driveApp);

interface CachedDriveAuth {
  accessToken: string;
  email: string;
  expiresAt: number;
}

export interface ParsedSheetRegistration {
  externalKey: string;
  sheetRow: number;
  requestedRoomNumber: string;
  tenantName: string;
  phone: string;
  email: string;
  plannedMoveInDate: string;
  notes: string;
  submittedAt: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

export interface ParsedSheetPayment {
  externalKey: string;
  sheetRow: number;
  roomNumber: string;
  tenantName: string;
  amountBaht: number;
  billingPeriod: string;
  transferDate: string;
  transferTime: string;
  paymentCategories: string;
  slipUrl: string;
  driveFileId: string;
  submittedAt: string;
  status: 'PENDING' | 'RECONCILED' | 'REJECTED';
  verifiedAmountBaht: number;
  notes: string;
}

export class GoogleDriveAccessError extends Error {
  code: 'NEEDS_ACCESS' | 'PERMISSION_DENIED' | 'POPUP_CLOSED';
  connectedEmail?: string;

  constructor(
    message: string,
    code: 'NEEDS_ACCESS' | 'PERMISSION_DENIED' | 'POPUP_CLOSED',
    connectedEmail?: string
  ) {
    super(message);
    this.name = 'GoogleDriveAccessError';
    this.code = code;
    this.connectedEmail = connectedEmail;
  }
}

export function extractSpreadsheetId(input?: string, fallback = ''): string {
  const s = String(input || '').trim();
  if (!s) return fallback;
  const m = s.match(/\/spreadsheets\/d\/([A-Za-z0-9_-]{15,})/);
  if (m) return m[1];
  if (/^[A-Za-z0-9_-]{15,}$/.test(s)) return s;
  return fallback;
}

export function getCachedDriveAuth(): CachedDriveAuth | null {
  try {
    const raw = sessionStorage.getItem(SESSION_TOKEN_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CachedDriveAuth;
    if (!parsed?.accessToken || Date.now() >= parsed.expiresAt - 60_000) {
      sessionStorage.removeItem(SESSION_TOKEN_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearCachedDriveAuth(): void {
  try {
    sessionStorage.removeItem(SESSION_TOKEN_KEY);
  } catch {
    // ignore storage errors
  }
}

export function isLinkShareModeKnown(): boolean {
  try {
    return localStorage.getItem(LINK_SHARE_MODE_KEY) === '1';
  } catch {
    return false;
  }
}

function setLinkShareModeKnown(enabled: boolean): void {
  try {
    if (enabled) {
      localStorage.setItem(LINK_SHARE_MODE_KEY, '1');
    } else {
      localStorage.removeItem(LINK_SHARE_MODE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Must be invoked synchronously inside a click handler when opening a popup,
 * so Safari & Chrome preserve transient user activation and never block window.open.
 */
export async function requestDriveAccessTokenPopup(): Promise<CachedDriveAuth> {
  const provider = new GoogleAuthProvider();
  provider.addScope('https://www.googleapis.com/auth/spreadsheets.readonly');
  provider.setCustomParameters({ prompt: 'select_account' });

  const result = await signInWithPopup(driveAuth, provider);
  const cred = GoogleAuthProvider.credentialFromResult(result);
  const accessToken = cred?.accessToken;
  if (!accessToken) {
    throw new Error('ไม่ได้รับสิทธิ์เข้าถึง Google Sheets จากการล็อกอิน');
  }
  const authInfo: CachedDriveAuth = {
    accessToken,
    email: result.user.email || '',
    expiresAt: Date.now() + 50 * 60 * 1000
  };
  try {
    sessionStorage.setItem(SESSION_TOKEN_KEY, JSON.stringify(authInfo));
  } catch {
    // ignore
  }
  return authInfo;
}

let gvizSeq = 0;

function pad2(n: number | string): string {
  const s = String(parseInt(String(n), 10));
  return s.length < 2 ? '0' + s : s;
}

function formatGvizCellValue(cell: any, colType?: string): string {
  if (!cell || (cell.v === null && (cell.f === undefined || cell.f === null))) {
    return '';
  }
  const v = cell.v;
  if (v instanceof Date && !isNaN(v.getTime())) {
    const y = v.getFullYear();
    const m = pad2(v.getMonth() + 1);
    const d = pad2(v.getDate());
    if (colType === 'date' && v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0) {
      return `${y}-${m}-${d}`;
    }
    return `${y}-${m}-${d} ${pad2(v.getHours())}:${pad2(v.getMinutes())}:${pad2(v.getSeconds())}`;
  }
  if (typeof v === 'string') {
    const dm = v.match(/^Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?/);
    if (dm) {
      const y = Number(dm[1]);
      const mon = pad2(Number(dm[2]) + 1);
      const day = pad2(Number(dm[3]));
      if (dm[4] !== undefined) {
        return `${y}-${mon}-${day} ${pad2(dm[4])}:${pad2(dm[5] || 0)}:${pad2(dm[6] || 0)}`;
      }
      return `${y}-${mon}-${day}`;
    }
  }
  if (cell.f !== undefined && cell.f !== null && String(cell.f).trim() !== '') {
    return String(cell.f).trim();
  }
  return v === null || v === undefined ? '' : String(v).trim();
}

function loadGvizJsonp(
  sheetId: string,
  opts?: { accessToken?: string; sheetName?: string; timeoutMs?: number }
): Promise<string[][]> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
      reject(new Error('Browser environment required'));
      return;
    }

    const cbName = `__takyGvizCb_${Date.now()}_${++gvizSeq}`;
    const timeoutMs = opts?.timeoutMs || 8000;
    const w = window as any;
    let scriptEl: HTMLScriptElement | null = null;
    let settled = false;

    const cleanup = () => {
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
      try {
        delete w[cbName];
      } catch {
        w[cbName] = undefined;
      }
    };

    const timer = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(new Error('หมดเวลาเชื่อมต่อ Google Sheet (Timeout)'));
    }, timeoutMs);

    w[cbName] = (resp: any) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();

      if (!resp || resp.status === 'error' || !resp.table) {
        const reason = resp?.errors?.[0]?.reason || '';
        const detail = resp?.errors?.[0]?.detailed_message || resp?.errors?.[0]?.message || 'ไม่สามารถอ่าน Google Sheet ได้';
        const err = new Error(detail) as any;
        err.gvizReason = reason;
        reject(err);
        return;
      }

      const cols: any[] = Array.isArray(resp.table.cols) ? resp.table.cols : [];
      const rawRows: any[] = Array.isArray(resp.table.rows) ? resp.table.rows : [];
      const headerRow = cols.map(c => String(c?.label || '').trim());
      const dataRows = rawRows.map(r =>
        cols.map((col, idx) => formatGvizCellValue(r?.c?.[idx], col?.type))
      );

      if (headerRow.every(h => !h) && dataRows.length > 0) {
        resolve(dataRows);
      } else {
        resolve([headerRow, ...dataRows]);
      }
    };

    const params = [
      `tqx=responseHandler:${cbName}`,
      `headers=1`,
      opts?.sheetName ? `sheet=${encodeURIComponent(opts.sheetName)}` : '',
      opts?.accessToken ? `access_token=${encodeURIComponent(opts.accessToken)}` : '',
      `_ts=${Date.now()}`
    ]
      .filter(Boolean)
      .join('&');

    scriptEl = document.createElement('script');
    scriptEl.async = true;
    scriptEl.src = `https://docs.google.com/spreadsheets/d/${encodeURIComponent(sheetId)}/gviz/tq?${params}`;
    scriptEl.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      cleanup();
      const err = new Error('ไม่มีสิทธิ์เปิดไฟล์ Google Sheet นี้ (Private Sheet)') as any;
      err.gvizReason = 'access_denied';
      reject(err);
    };
    document.head.appendChild(scriptEl);
  });
}

async function fetchViaSheetsRestApi(
  sheetId: string,
  preferredTabs: string[],
  accessToken: string
): Promise<string[][]> {
  const metaRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}?fields=sheets.properties.title`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    }
  );

  if (!metaRes.ok) {
    let errBody: any = null;
    try {
      errBody = await metaRes.json();
    } catch {
      // ignore
    }
    const status = metaRes.status;
    const msg = String(errBody?.error?.message || `HTTP ${status}`);
    const err = new Error(msg) as any;
    err.httpStatus = status;
    err.apiReason = errBody?.error?.details?.[0]?.reason || errBody?.error?.status || '';
    throw err;
  }

  const meta = await metaRes.json();
  const titles: string[] = (meta?.sheets || [])
    .map((s: any) => String(s?.properties?.title || ''))
    .filter(Boolean);

  let chosenTab = titles[0] || '';
  for (const want of preferredTabs) {
    const exact = titles.find(t => t.toLowerCase() === want.toLowerCase());
    if (exact) {
      chosenTab = exact;
      break;
    }
  }
  if (chosenTab === titles[0]) {
    for (const want of preferredTabs) {
      const sub = titles.find(t => t.toLowerCase().includes(want.toLowerCase()));
      if (sub) {
        chosenTab = sub;
        break;
      }
    }
  }

  const range = chosenTab ? `'${chosenTab.replace(/'/g, "''")}'!A1:Z1000` : 'A1:Z1000';
  const valRes = await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(
      sheetId
    )}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: 'no-store'
    }
  );
  if (!valRes.ok) {
    throw new Error(`อ่านข้อมูลตารางไม่สำเร็จ (HTTP ${valRes.status})`);
  }
  const valData = await valRes.json();
  return Array.isArray(valData?.values) ? valData.values : [];
}

export async function readSpreadsheetRowsResilient(
  sheetId: string,
  preferredTabs: string[],
  accessToken?: string,
  connectedEmail?: string
): Promise<string[][]> {
  if (accessToken) {
    try {
      return await fetchViaSheetsRestApi(sheetId, preferredTabs, accessToken);
    } catch (err: any) {
      if (err?.httpStatus === 401) {
        clearCachedDriveAuth();
      }
      // Fallback to gviz JSONP with access_token (works even when sheets.googleapis.com is disabled on GCP project)
      try {
        if (preferredTabs.length > 0) {
          try {
            return await loadGvizJsonp(sheetId, { accessToken, sheetName: preferredTabs[0] });
          } catch {
            return await loadGvizJsonp(sheetId, { accessToken });
          }
        }
        return await loadGvizJsonp(sheetId, { accessToken });
      } catch (gvizErr: any) {
        if (err?.httpStatus === 403 || gvizErr?.gvizReason === 'access_denied') {
          throw new GoogleDriveAccessError(
            connectedEmail
              ? `บัญชี Google (${connectedEmail}) ไม่มีสิทธิ์เข้าถึงไฟล์ Google Sheet นี้ — กรุณากดเปลี่ยนเป็นบัญชีเจ้าของฟอร์ม (เช่น ramajitti.learn@gmail.com) หรือแชร์ชีตให้ ${connectedEmail}`
              : 'ไม่มีสิทธิ์เข้าถึงไฟล์ Google Sheet นี้',
            'PERMISSION_DENIED',
            connectedEmail
          );
        }
        throw gvizErr;
      }
    }
  }

  // Link-shared / public read via gviz JSONP (no OAuth token needed)
  if (preferredTabs.length > 0) {
    try {
      return await loadGvizJsonp(sheetId, { sheetName: preferredTabs[0], timeoutMs: 5000 });
    } catch {
      return await loadGvizJsonp(sheetId, { timeoutMs: 5000 });
    }
  }
  return await loadGvizJsonp(sheetId, { timeoutMs: 5000 });
}

// ——— Row Parsing Helpers (matching DashboardBridge.gs & Code.gs 100%) ———

function isBlank(v: any): boolean {
  return v === '' || v === null || v === undefined;
}

function canonicalUnit(v: any): string {
  if (isBlank(v)) return '';
  const s = String(v)
    .replace(/\s+/g, '')
    .replace(/^(ห้อง|room|unit)/i, '')
    .replace(/^(\d+)\.0+$/, '$1');
  return ROOMS.includes(s) ? s : '';
}

function colsWhere(headers: string[], test: (s: string) => boolean): number[] {
  const out: number[] = [];
  for (let i = 0; i < headers.length; i++) {
    const s = String(headers[i] || '').trim().toLowerCase();
    if (s && test(s)) out.push(i);
  }
  return out;
}

function findCol(headers: string[], needles: string[]): number {
  for (let i = 0; i < headers.length; i++) {
    const h = String(headers[i] || '').toLowerCase();
    for (const needle of needles) {
      if (h.includes(needle.toLowerCase())) return i;
    }
  }
  return -1;
}

function splitUnitCols(headers: string[], test: (s: string) => boolean) {
  const all = colsWhere(headers, test);
  const current: number[] = [];
  const old: number[] = [];
  for (const idx of all) {
    const s = String(headers[idx] || '').trim().toLowerCase();
    if (s.includes('(เก่า)') || s.includes('(old)')) {
      old.push(idx);
    } else {
      current.push(idx);
    }
  }
  return { all, current, old };
}

function lastNonBlank(row: string[], cols: number[]): string {
  for (let i = cols.length - 1; i >= 0; i--) {
    const v = row[cols[i]];
    if (!isBlank(v) && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

function unitFromRow(row: string[], split: { current: number[]; old: number[] }): string {
  const v = lastNonBlank(row, split.current);
  if (v) return v;
  return lastNonBlank(row, split.old);
}

function normalizeThaiPhone(raw: any): string {
  const s = String(isBlank(raw) ? '' : raw).trim();
  if (!s) return '';
  const digits = s.replace(/\D/g, '');
  if (/^[689]\d{8}$/.test(digits)) {
    return '0' + digits.slice(0, 2) + '-' + digits.slice(2, 5) + '-' + digits.slice(5);
  }
  if (/^0\d{9}$/.test(digits)) {
    return digits.slice(0, 3) + '-' + digits.slice(3, 6) + '-' + digits.slice(6);
  }
  return s;
}

function parseDateAndTime(raw: any, fallbackDate: string): { date: string; time: string; iso: string } {
  const s = String(isBlank(raw) ? '' : raw).trim();
  if (!s) {
    return { date: fallbackDate, time: '12:00', iso: '' };
  }

  let datePart = fallbackDate;
  let timePart = '12:00';
  let secPart = '00';

  const tm = s.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
  if (tm) {
    let hh = Number(tm[1]);
    if (/pm|หลังเที่ยง/i.test(s) && hh < 12) hh += 12;
    if (/am|ก่อนเที่ยง/i.test(s) && hh === 12) hh = 0;
    timePart = `${pad2(hh)}:${tm[2]}`;
    secPart = tm[3] ? pad2(tm[3]) : '00';
  }

  const mIso = s.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (mIso) {
    let y = Number(mIso[1]);
    if (y > 2400) y -= 543;
    datePart = `${y}-${pad2(mIso[2])}-${pad2(mIso[3])}`;
  } else {
    const mDmy = s.match(/(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
    if (mDmy) {
      const a = Number(mDmy[1]);
      const b = Number(mDmy[2]);
      let y = Number(mDmy[3]);
      if (y > 2400) y -= 543;
      const day = b > 12 ? b : a;
      const mon = b > 12 ? a : b;
      datePart = `${y}-${pad2(mon)}-${pad2(day)}`;
    }
  }

  return {
    date: datePart,
    time: timePart,
    iso: `${datePart}T${timePart}:${secPart}+07:00`
  };
}

function parseMonthKey(val: any): string {
  let s = String(isBlank(val) ? '' : val).trim();
  if (!s) return '';
  s = s.replace(/\s*\(.*\)\s*$/, '');
  let m = s.match(/^(\d{4})[-/](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(m[2])}`;
  m = s.match(/^(\d{1,2})[-/](\d{4})$/);
  if (m) return `${m[2]}-${pad2(m[1])}`;
  return '';
}

function toNumber(v: any): number {
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = parseFloat(String(v || '').replace(/,/g, '').replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function extractDriveFileId(url: any): string {
  const s = String(url || '').trim();
  if (!s) return '';
  const m = s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || s.match(/\/d\/([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : '';
}

export function parseRegistrationsSheetRows(
  rows: string[][],
  fallbackDate: string
): ParsedSheetRegistration[] {
  const out: ParsedSheetRegistration[] = [];
  if (!rows || rows.length < 2) return out;

  const h = rows[0];
  const unitCols = splitUnitCols(h, s => s.includes('ห้อง') || /\bunit\b/.test(s));
  const nameCol = findCol(h, ['ชื่อ / name', 'name', 'ชื่อ']);
  const phoneCol = findCol(h, ['เบอร์โทร', 'phone', 'โทร']);
  const emailCol = findCol(h, ['email', 'อีเมล', 'e-mail']);
  const moveInCol = findCol(h, ['วันที่ย้ายเข้า', 'move-in', 'move in', 'ย้ายเข้า']);
  const notesCol = findCol(h, ['หมายเหตุ', 'notes']);
  const tsCol = findCol(h, ['timestamp', 'ประทับเวลา']);
  const approvedCols = colsWhere(h, s => s.startsWith('approved') || s.includes('อนุมัติ'));
  const approvedCol = approvedCols.length > 0 ? approvedCols[0] : -1;

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawUnit = unitFromRow(row, unitCols);
    const name = nameCol >= 0 ? String(row[nameCol] || '').trim() : '';
    if (!rawUnit && !name) continue;

    const unit = canonicalUnit(rawUnit) || String(rawUnit || '').trim();
    if (!unit) continue;

    const phone = phoneCol >= 0 ? normalizeThaiPhone(row[phoneCol]) : '';
    const email = emailCol >= 0 ? String(row[emailCol] || '').trim() : '';
    const tsParsed = parseDateAndTime(tsCol >= 0 ? row[tsCol] : '', fallbackDate);
    const tsIso = tsParsed.iso || `reg-row-${r + 1}`;
    const moveInParsed =
      moveInCol >= 0 && !isBlank(row[moveInCol])
        ? parseDateAndTime(row[moveInCol], tsParsed.date)
        : tsParsed;
    const notes = notesCol >= 0 ? String(row[notesCol] || '').trim() : '';

    const appRaw = approvedCol >= 0 ? String(row[approvedCol] || '').trim().toLowerCase() : '';
    const status: ParsedSheetRegistration['status'] =
      appRaw === 'yes' || appRaw === 'true'
        ? 'APPROVED'
        : appRaw === 'no'
        ? 'REJECTED'
        : 'PENDING';

    const extKey = `reg:${tsIso}|${unit}|${email || phone || name}`;

    out.push({
      externalKey: extKey,
      sheetRow: r + 1,
      requestedRoomNumber: unit,
      tenantName: name || `ผู้สมัครห้อง ${unit}`,
      phone,
      email,
      plannedMoveInDate: moveInParsed.date || fallbackDate,
      notes,
      submittedAt: tsIso,
      status
    });
  }

  return out;
}

export function parsePaymentsSheetRows(
  rows: string[][],
  fallbackDate: string
): ParsedSheetPayment[] {
  const out: ParsedSheetPayment[] = [];
  if (!rows || rows.length < 2) return out;

  const h = rows[0];
  const unitCols = splitUnitCols(h, s => s.includes('หมายเลขห้อง') || /\bunit\b/.test(s));
  const monthCols = colsWhere(h, s => s.includes('เดือนที่ชำระ') || s.includes('billing month'));
  const amountCols = colsWhere(h, s => s.includes('จำนวนเงิน') || s.includes('amount paid'));
  const dateCols = colsWhere(h, s => s.includes('วันที่โอน') || s.includes('date of transfer'));
  const nameCols = colsWhere(h, s => s.includes('ชื่อผู้เช่า') || s.includes('tenant name'));
  const catCols = colsWhere(h, s => s.includes('ประเภทการชำระ') || s.includes('payment category'));
  const slipCols = colsWhere(h, s => s.includes('สลิป') || s.includes('slip'));
  const statusCols = colsWhere(h, s => s.startsWith('status') || s.includes('สถานะ'));
  const verifiedCols = colsWhere(h, s => s === 'verified amount');
  const notesCols = colsWhere(h, s => s.startsWith('notes') || s.includes('หมายเหตุ'));
  const tsCol = findCol(h, ['timestamp', 'ประทับเวลา']);

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r] || [];
    const rawUnit = unitFromRow(row, unitCols);
    const amountRaw = amountCols.length > 0 ? row[amountCols[0]] : '';
    if (!rawUnit && isBlank(amountRaw)) continue;

    const unit = canonicalUnit(rawUnit) || String(rawUnit || '').trim();
    if (!unit) continue;

    const amountBaht = toNumber(amountRaw);
    // Skip old Gate A dummy test row (unit 100 / 197500)
    if (unit === '100' && amountBaht === 197500) continue;

    const tenantName = nameCols.length > 0 ? String(row[nameCols[0]] || '').trim() : '';
    const month = parseMonthKey(lastNonBlank(row, monthCols));
    const tsParsed = parseDateAndTime(tsCol >= 0 ? row[tsCol] : '', fallbackDate);
    const tsIso = tsParsed.iso || `pay-row-${r + 1}`;
    const transferParsed =
      dateCols.length > 0 && !isBlank(row[dateCols[0]])
        ? parseDateAndTime(row[dateCols[0]], tsParsed.date)
        : tsParsed;
    const slipUrl = slipCols.length > 0 ? String(row[slipCols[0]] || '').trim() : '';
    const driveFileId = extractDriveFileId(slipUrl);
    const statusStr = statusCols.length > 0 ? String(row[statusCols[0]] || '').trim() : '';
    const status: ParsedSheetPayment['status'] =
      statusStr === 'Confirmed / ยืนยันแล้ว'
        ? 'RECONCILED'
        : statusStr === 'Rejected / ปฏิเสธ'
        ? 'REJECTED'
        : 'PENDING';
    const verifiedBaht = verifiedCols.length > 0 ? toNumber(row[verifiedCols[0]]) : 0;
    const categories = catCols.length > 0 ? String(row[catCols[0]] || '').trim() : '';
    const notes = notesCols.length > 0 ? String(row[notesCols[0]] || '').trim() : '';

    const extKey = driveFileId
      ? `slip:${driveFileId}|${tsIso}`
      : `pay:${tsIso}|${unit}|${month}|${amountBaht}`;

    out.push({
      externalKey: extKey,
      sheetRow: r + 1,
      roomNumber: unit,
      tenantName: tenantName || `ผู้เช่าห้อง ${unit}`,
      amountBaht,
      billingPeriod: month,
      transferDate: transferParsed.date || fallbackDate,
      transferTime: tsParsed.time || '12:00',
      paymentCategories: categories,
      slipUrl,
      driveFileId,
      submittedAt: tsIso,
      status,
      verifiedAmountBaht: verifiedBaht,
      notes
    });
  }

  return out;
}

export async function pullBothGoogleSheets(options: {
  registrationsSheetId?: string;
  paymentsSheetId?: string;
  fallbackDate: string;
  interactive?: boolean;
  forceAccountSelect?: boolean;
  linkShareOnly?: boolean;
}): Promise<{
  registrations: ParsedSheetRegistration[];
  payments: ParsedSheetPayment[];
  connectedEmail?: string;
  partialWarning?: string;
}> {
  const regSheetId = extractSpreadsheetId(
    options.registrationsSheetId,
    DEFAULT_REGISTRATIONS_SHEET_ID
  );
  const paySheetId = extractSpreadsheetId(options.paymentsSheetId, DEFAULT_PAYMENTS_SHEET_ID);

  let authInfo = options.forceAccountSelect ? null : getCachedDriveAuth();

  // If user clicked the Refresh button (interactive) and we do NOT have a cached token or known link-share mode,
  // open the Google Account Chooser popup synchronously BEFORE any network await so Safari/Chrome never block it!
  if (
    options.interactive &&
    !options.linkShareOnly &&
    !authInfo &&
    (options.forceAccountSelect || !isLinkShareModeKnown())
  ) {
    try {
      authInfo = await requestDriveAccessTokenPopup();
    } catch (popupErr: any) {
      const errCode = String(popupErr?.code || '');
      // Try link-shared mode automatically before reporting an error!
      try {
        const [regRows, payRows] = await Promise.all([
          readSpreadsheetRowsResilient(regSheetId, []),
          readSpreadsheetRowsResilient(paySheetId, ['Payments', 'Form Responses 1'])
        ]);
        setLinkShareModeKnown(true);
        return {
          registrations: parseRegistrationsSheetRows(regRows, options.fallbackDate),
          payments: parsePaymentsSheetRows(payRows, options.fallbackDate)
        };
      } catch {
        if (errCode === 'auth/popup-closed-by-user' || errCode === 'auth/cancelled-popup-request') {
          throw new GoogleDriveAccessError(
            'คุณปิดหน้าต่างเลือกบัญชี Google ก่อนเชื่อมต่อสำเร็จ',
            'POPUP_CLOSED'
          );
        }
        throw new GoogleDriveAccessError(
          popupErr?.message ||
            'ยังเข้าถึงไฟล์ใน Google Drive ไม่ได้ — กรุณาเลือกบัญชีเจ้าของฟอร์ม หรือเปิดแชร์ลิงก์อ่านอย่างเดียว (Viewer) บน Google Sheet',
          'NEEDS_ACCESS'
        );
      }
    }
  }

  // Fetch both sheets independently so if even one sheet is accessible, its items immediately appear!
  const [regResult, payResult] = await Promise.allSettled([
    readSpreadsheetRowsResilient(regSheetId, [], authInfo?.accessToken, authInfo?.email),
    readSpreadsheetRowsResilient(
      paySheetId,
      ['Payments', 'Form Responses 1'],
      authInfo?.accessToken,
      authInfo?.email
    )
  ]);

  if (regResult.status === 'rejected' && payResult.status === 'rejected') {
    if (authInfo) {
      clearCachedDriveAuth();
      // Also check if the user enabled link-sharing on the sheets
      try {
        const [regRows, payRows] = await Promise.all([
          readSpreadsheetRowsResilient(regSheetId, []),
          readSpreadsheetRowsResilient(paySheetId, ['Payments', 'Form Responses 1'])
        ]);
        setLinkShareModeKnown(true);
        return {
          registrations: parseRegistrationsSheetRows(regRows, options.fallbackDate),
          payments: parsePaymentsSheetRows(payRows, options.fallbackDate)
        };
      } catch {
        // Fall through to report GoogleDriveAccessError
      }
    } else {
      setLinkShareModeKnown(false);
    }
    const reason = regResult.reason;
    if (reason instanceof GoogleDriveAccessError) {
      throw reason;
    }
    throw new GoogleDriveAccessError(
      reason?.message ||
        'ยังไม่มีสิทธิ์เปิดไฟล์ Google Sheet ใน Google Drive — กรุณากดเลือกบัญชีเจ้าของฟอร์ม (ramajitti.learn@gmail.com) หรือตั้งค่าแชร์ลิงก์อ่านอย่างเดียว (Viewer)',
      'NEEDS_ACCESS',
      authInfo?.email
    );
  }

  if (!authInfo) {
    setLinkShareModeKnown(true);
  }

  const registrations =
    regResult.status === 'fulfilled'
      ? parseRegistrationsSheetRows(regResult.value, options.fallbackDate)
      : [];
  const payments =
    payResult.status === 'fulfilled'
      ? parsePaymentsSheetRows(payResult.value, options.fallbackDate)
      : [];

  let partialWarning: string | undefined;
  if (regResult.status === 'rejected') {
    partialWarning = 'ดึงสลิปโอนเงินสำเร็จ แต่ยังไม่มีสิทธิ์เปิดชีตลงทะเบียนผู้เช่า';
  } else if (payResult.status === 'rejected') {
    partialWarning = 'ดึงรายการลงทะเบียนผู้เช่าสำเร็จ แต่ยังไม่มีสิทธิ์เปิดชีตแจ้งชำระเงิน';
  }

  return {
    registrations,
    payments,
    connectedEmail: authInfo?.email,
    partialWarning
  };
}
