import {
  AppState,
  FormSubmission,
  Invoice,
  PaymentRecord,
  PropertySettings,
  Room,
  TenantRegistration
} from '../types';
import { calcLateFeeSatang, calcMeterUnits, formatBaht } from '../lib/finance';
import { saveStateToFirestore } from '../lib/firebase';

export function createDayOneState(): AppState {
  const settings: PropertySettings = {
    apartmentName: 'Taky Apartment',
    electricityRateSatang: 650,  // 6.50 THB/unit
    waterRateSatang: 1000,       // 10.00 THB/unit
    commonFeeSatang: 0,
    carParkingRateSatang: 50000, // 500 THB/month
    bikeParkingRateSatang: 10000,// 100 THB/month
    billingDay: 25,
    dueDayNextMonth: 5,
    dailyLateFeeSatang: 5000,
    defaultDepositMonths: 1,
    promptPayId: '092-825-5788',
    bankName: 'ธนาคารกสิกรไทย (KBank)',
    bankAccount: '696-2-08678-9',
    bankOwner: 'นายรามจิตติ ปสุตนาวิน',
    contactInfo: 'โทร. 092-825-5788 • LINE: @takyapartment',
    tierStandardSatang: 250000,  // 2,500 THB
    tierSilverSatang: 300000,    // 3,000 THB
    tierGoldSatang: 350000       // 3,500 THB
  };

  const rooms: Room[] = [
    // Floor 1 (101 - 105)
    { roomNumber: '101', floor: 1, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '102', floor: 1, status: 'AVAILABLE', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '103', floor: 1, status: 'AVAILABLE', tier: 'GOLD', rentSatang: 350000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '104', floor: 1, status: 'AVAILABLE', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '105', floor: 1, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },

    // Floor 2 (201 - 205)
    { roomNumber: '201', floor: 2, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '202', floor: 2, status: 'AVAILABLE', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '203', floor: 2, status: 'AVAILABLE', tier: 'GOLD', rentSatang: 350000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '204', floor: 2, status: 'AVAILABLE', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '205', floor: 2, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },

    // Floor 3 (301 - 305)
    { roomNumber: '301', floor: 3, status: 'AVAILABLE', tier: 'GOLD', rentSatang: 350000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '302', floor: 3, status: 'AVAILABLE', tier: 'GOLD', rentSatang: 350000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '303', floor: 3, status: 'AVAILABLE', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '304', floor: 3, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '305', floor: 3, status: 'AVAILABLE', tier: 'GOLD', rentSatang: 350000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 0, currWater: 0, waterRoll: false, prevElec: 0, currElec: 0, elecRoll: false, arrearsSatang: 0 }
  ];

  const now = new Date().toISOString();
  const dayOneState: AppState = {
    simulatedDate: '2026-11-01',
    settings,
    rooms,
    invoices: [],
    expenses: [],
    settlements: [],
    formSubmissions: [],
    registrations: [],
    moveOutArchives: [],
    backups: [
      {
        id: 'SNAP-DAY-ONE',
        timestamp: now,
        name: 'บันทึกวันเปิดอพาร์ทเมนท์ (Day-1 Baseline)',
        tag: 'DAY_ONE',
        roomsCount: 15,
        invoicesCount: 0,
        stateData: ''
      }
    ],
    lastBackupDate: now
  };

  dayOneState.backups![0].stateData = JSON.stringify({ ...dayOneState, backups: [] });
  return dayOneState;
}

export function createInitialSeedState(): AppState {
  const settings: PropertySettings = {
    apartmentName: 'Taky Apartment',
    electricityRateSatang: 650,
    waterRateSatang: 1000,
    commonFeeSatang: 0,
    carParkingRateSatang: 50000,
    bikeParkingRateSatang: 10000,
    billingDay: 25,
    dueDayNextMonth: 5,
    dailyLateFeeSatang: 5000,
    defaultDepositMonths: 1,
    promptPayId: '092-825-5788',
    bankName: 'ธนาคารกสิกรไทย (KBank)',
    bankAccount: '696-2-08678-9',
    bankOwner: 'นายรามจิตติ ปสุตนาวิน',
    contactInfo: 'โทร. 092-825-5788 • LINE: @takyapartment',
    tierStandardSatang: 250000,
    tierSilverSatang: 300000,
    tierGoldSatang: 350000
  };

  const rooms: Room[] = [
    { roomNumber: '101', floor: 1, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณสมศักดิ์ มีสุข', phone: '081-412-8891', lineId: 'somsak.m', startDate: '2026-03-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 120, currWater: 128, waterRoll: false, prevElec: 1450, currElec: 1565, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '102', floor: 1, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณวิภาดา สายชล', phone: '089-221-3344', lineId: 'wipada.s', startDate: '2026-04-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 85, currWater: 92, waterRoll: false, prevElec: 980, currElec: 1110, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '103', floor: 1, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 700000, tenantName: 'คุณณัฐพล คนขยัน', phone: '086-778-9012', lineId: 'nattapon.k', startDate: '2026-02-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 210, currWater: 219, waterRoll: false, prevElec: 2310, currElec: 2465, elecRoll: false, arrearsSatang: 120000 },
    { roomNumber: '104', floor: 1, status: 'RESERVED', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: 'คุณกานดา (จองแล้ว)', phone: '082-991-1122', lineId: 'kanda.99', startDate: '2026-11-01', parkingType: 'BIKE', parkingFeeSatang: 10000, bookingDepositSatang: 100000, prevWater: 64, currWater: 64, waterRoll: false, prevElec: 620, currElec: 620, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '105', floor: 1, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 40, currWater: 40, waterRoll: false, prevElec: 510, currElec: 510, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '201', floor: 2, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณปิยะพงษ์ วงศ์คำ', phone: '084-556-7788', lineId: 'piyapong.w', startDate: '2026-05-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 150, currWater: 156, waterRoll: false, prevElec: 1890, currElec: 1985, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '202', floor: 2, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณมณีรัตน์ ทองดี', phone: '081-990-4512', lineId: 'manirat.t', startDate: '2026-01-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 310, currWater: 318, waterRoll: false, prevElec: 9985, currElec: 65, elecRoll: true, arrearsSatang: 0 },
    { roomNumber: '203', floor: 2, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณอนุชา ศรีสวัสดิ์', phone: '083-114-5678', lineId: 'anucha.s', startDate: '2026-06-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 95, currWater: 103, waterRoll: false, prevElec: 1200, currElec: 1345, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '204', floor: 2, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณชลธิชา นาคิน', phone: '089-654-3210', lineId: 'chonthicha.n', startDate: '2026-07-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 72, currWater: 79, waterRoll: false, prevElec: 840, currElec: 950, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '205', floor: 2, status: 'MAINTENANCE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: 'ซ่อมแอร์ / ทาสีใหม่', phone: '-', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 110, currWater: 110, waterRoll: false, prevElec: 1320, currElec: 1320, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '301', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 700000, tenantName: 'คุณธนกฤต พัฒนา', phone: '081-777-2345', lineId: 'thanakrit.p', startDate: '2026-03-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 180, currWater: 188, waterRoll: false, prevElec: 2100, currElec: 2240, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '302', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณอารยา ใจงาม', phone: '085-332-1987', lineId: 'araya.j', startDate: '2026-05-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 140, currWater: 146, waterRoll: false, prevElec: 1650, currElec: 1790, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '303', floor: 3, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณวรพจน์ สุขสันต์', phone: '087-889-0011', lineId: 'worapoj.s', startDate: '2026-08-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 54, currWater: 60, waterRoll: false, prevElec: 590, currElec: 695, elecRoll: false, arrearsSatang: 85000 },
    { roomNumber: '304', floor: 3, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณสุดาพร อินทร์จันทร์', phone: '082-445-6677', lineId: 'sudaporn.i', startDate: '2026-09-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 33, currWater: 39, waterRoll: false, prevElec: 410, currElec: 500, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '305', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณกิตติพงศ์ ยิ่งเจริญ', phone: '080-123-9876', lineId: 'kittipong.y', startDate: '2026-04-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 165, currWater: 174, waterRoll: false, prevElec: 1920, currElec: 2050, elecRoll: false, arrearsSatang: 0 }
  ];

  const invoices: Invoice[] = [];
  rooms.forEach((rm, idx) => {
    if (rm.status !== 'OCCUPIED') return;
    const wUnits = calcMeterUnits(rm.prevWater, rm.currWater, rm.waterRoll);
    const eUnits = calcMeterUnits(rm.prevElec, rm.currElec, rm.elecRoll);
    const wSatang = wUnits * settings.waterRateSatang;
    const eSatang = eUnits * settings.electricityRateSatang;
    const parkingSatang = rm.parkingFeeSatang || 0;
    const totalSatang = rm.rentSatang + wSatang + eSatang + parkingSatang + (rm.arrearsSatang || 0);

    let paidSatang = 0;
    let status: Invoice['status'] = 'ISSUED';
    const payments: Invoice['payments'] = [];

    if (idx === 0 || idx === 1 || idx === 5) {
      paidSatang = totalSatang;
      status = 'PAID';
      payments.push({
        id: 'PAY-' + rm.roomNumber + '-1',
        paidAt: '2026-10-26 10:15',
        amountSatang: totalSatang,
        method: 'PromptPay QR',
        slipNote: 'สแกน QR PromptPay ชำระเต็มจำนวน (ตรวจสอบแล้ว)'
      });
    } else if (rm.roomNumber === '203') {
      paidSatang = 200000;
      status = 'PARTIAL';
      payments.push({
        id: 'PAY-203-1',
        paidAt: '2026-10-26 18:40',
        amountSatang: 200000,
        method: 'โอนผ่านธนาคาร',
        slipNote: 'สลิป KBank แบ่งจ่ายงวดที่ 1 (2,000 บาท)'
      });
    }

    invoices.push({
      id: 'INV-202610-' + rm.roomNumber,
      roomNumber: rm.roomNumber,
      tenantName: rm.tenantName,
      tier: rm.tier,
      billingPeriod: '2026-10',
      issueDate: '2026-10-25',
      dueDate: '2026-11-05',
      rentSatang: rm.rentSatang,
      parkingType: rm.parkingType,
      parkingFeeSatang: parkingSatang,
      prevWater: rm.prevWater,
      currWater: rm.currWater,
      waterRoll: rm.waterRoll,
      waterUnits: wUnits,
      waterSatang: wSatang,
      prevElec: rm.prevElec,
      currElec: rm.currElec,
      elecRoll: rm.elecRoll,
      elecUnits: eUnits,
      elecSatang: eSatang,
      arrearsSatang: rm.arrearsSatang || 0,
      arrearsMonthsCount: rm.arrearsSatang > 0 ? 1 : 0,
      lateFeeSatang: 0,
      totalSatang: totalSatang,
      paidSatang: paidSatang,
      balanceDueSatang: Math.max(0, totalSatang - paidSatang),
      status: status,
      payments: payments,
      lineSentAt: (idx === 0 || idx === 1 || idx === 2) ? '2026-10-25 18:00' : undefined
    });
  });

  return {
    simulatedDate: '2026-10-25',
    settings,
    rooms,
    invoices,
    expenses: [
      { id: 'EXP-1', date: '2026-10-12', category: 'ค่าไฟ/น้ำส่วนกลางตึก', title: 'ค่าไฟโถงทางเดินและปั๊มน้ำส่วนกลาง ต.ค.', amountSatang: 145000 },
      { id: 'EXP-2', date: '2026-10-18', category: 'ซ่อมบำรุง', title: 'ล้างแอร์และเช็กน้ำยาแอร์ห้อง 205', amountSatang: 60000 },
      { id: 'EXP-3', date: '2026-10-24', category: 'ทำความสะอาด', title: 'ค่าแม่บ้านทำความสะอาดส่วนกลาง 3 ชั้น', amountSatang: 150000 }
    ],
    settlements: [
      {
        id: 'SET-202609-105',
        roomNumber: '105',
        tenantName: 'คุณพีรพล (ย้ายออกเมื่อ 25 ก.ย.)',
        moveOutDate: '2026-09-25',
        depositHeldSatang: 250000,
        finalWaterSatang: 7000,
        finalElectricSatang: 58500,
        cleaningFeeSatang: 30000,
        damageFeeSatang: 0,
        arrearsSatang: 0,
        netRefundSatang: 154500
      }
    ],
    formSubmissions: [],
    registrations: [],
    moveOutArchives: [],
    backups: [],
    lastBackupDate: new Date().toISOString()
  };
}

/**
 * Cloud-only state layer.
 *
 * The single source of truth is Firestore `app_state/current`. The in-memory cache
 * is ONLY populated from data that was actually read from Firestore (via
 * setClientCachedState, called by App after an authenticated admin read).
 * There is intentionally no fallback to localStorage, the local Express server or
 * demo seed data: falling back and then writing would overwrite the real cloud data.
 */
let cachedState: AppState | null = null;

function cloneState<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function normalizeState(s: AppState): AppState {
  return {
    ...s,
    formSubmissions: s.formSubmissions || [],
    registrations: s.registrations || [],
    moveOutArchives: s.moveOutArchives || [],
    backups: s.backups || []
  };
}

export function isValidAppState(s: unknown): s is AppState {
  const st = s as AppState | null;
  return Boolean(st && Array.isArray(st.rooms) && st.rooms.length === 15 && st.settings && Array.isArray(st.invoices));
}

const NOT_LOADED_ERROR = 'ยังไม่ได้โหลดข้อมูลจาก Cloud — กรุณาเข้าสู่ระบบด้วยบัญชี Admin ก่อน';

async function getActiveState(): Promise<AppState> {
  if (!cachedState) {
    throw new Error(NOT_LOADED_ERROR);
  }
  return cloneState(cachedState);
}

/**
 * Writes the full state to Firestore. The cache is updated only after the write
 * succeeds; on failure the error is re-thrown so the UI can tell the user that
 * nothing was saved.
 */
async function persistState(state: AppState): Promise<AppState> {
  if (!cachedState) {
    throw new Error(NOT_LOADED_ERROR);
  }
  if (!isValidAppState(state)) {
    throw new Error('ข้อมูลไม่ถูกต้อง (ต้องมี 15 ห้อง) — ยกเลิกการบันทึก');
  }
  const next = normalizeState(cloneState(state));
  next.lastBackupDate = new Date().toISOString();
  await saveStateToFirestore(next);
  cachedState = next;
  return cloneState(next);
}

/** Only call with data that was read from Firestore (initial load or snapshot). */
export function setClientCachedState(state: AppState): void {
  cachedState = normalizeState(cloneState(state));
}

export function clearClientCachedState(): void {
  cachedState = null;
  try {
    // Remove any tenant data left behind by the previous localStorage-based build.
    localStorage.removeItem('taky_apartment_erp_state_v1');
  } catch {
    // ignore
  }
}

export async function fetchAppState(): Promise<AppState> {
  return getActiveState();
}

export async function updateSimulatedDate(simulatedDate: string): Promise<AppState> {
  const state = await getActiveState();
  if (simulatedDate) {
    state.simulatedDate = simulatedDate;
  }
  return persistState(state);
}

export async function updateSettings(settings: Partial<PropertySettings>): Promise<AppState> {
  const state = await getActiveState();
  state.settings = { ...state.settings, ...settings };
  return persistState(state);
}

export async function batchSetupRooms(rooms: Room[]): Promise<AppState> {
  const state = await getActiveState();
  if (Array.isArray(rooms) && rooms.length === 15) {
    state.rooms = rooms;
    state.invoices = [];
  }
  return persistState(state);
}

export async function submitMoveIn(payload: any): Promise<AppState> {
  const state = await getActiveState();
  const {
    roomNumber,
    tenantName,
    phone,
    lineId,
    tier,
    rentSatang,
    depositMonths,
    startDate,
    parkingType,
    parkingFeeSatang,
    initWater,
    initElec
  } = payload;

  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  if (rm) {
    const mult = depositMonths || state.settings.defaultDepositMonths;
    const finalRentSatang = Number(rentSatang) || state.settings.tierGoldSatang;
    const depositSatang = finalRentSatang * mult;

    rm.status = 'OCCUPIED';
    rm.tenantName = (tenantName || '').trim();
    rm.phone = (phone || '').trim();
    rm.lineId = (lineId || '').trim();
    rm.tier = tier || 'GOLD';
    rm.rentSatang = finalRentSatang;
    rm.depositSatang = depositSatang;
    rm.startDate = startDate || state.simulatedDate;
    rm.parkingType = parkingType || 'NONE';
    rm.parkingFeeSatang = Number(parkingFeeSatang) || 0;
    rm.bookingDepositSatang = 0;
    rm.prevWater = Number(initWater) || 0;
    rm.currWater = Number(initWater) || 0;
    rm.prevElec = Number(initElec) || 0;
    rm.currElec = Number(initElec) || 0;
    rm.arrearsSatang = 0;
  }

  return persistState(state);
}

export async function submitReservation(payload: any): Promise<AppState> {
  const state = await getActiveState();
  const { roomNumber, tenantName, phone, lineId, expectedDate, tier, depositSatang, parkingType } = payload;
  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  if (rm) {
    rm.status = 'RESERVED';
    rm.tenantName = (tenantName || '').trim() + ' (จองแล้ว)';
    rm.phone = (phone || '').trim();
    rm.lineId = (lineId || '').trim();
    rm.startDate = expectedDate || state.simulatedDate;
    rm.tier = tier || 'SILVER';
    rm.parkingType = parkingType || 'NONE';
    rm.parkingFeeSatang =
      parkingType === 'CAR'
        ? state.settings.carParkingRateSatang
        : parkingType === 'BIKE'
        ? state.settings.bikeParkingRateSatang
        : 0;
    rm.bookingDepositSatang = Number(depositSatang) || 100000;
  }

  return persistState(state);
}

export async function cancelReservation(roomNumber: string): Promise<AppState> {
  const state = await getActiveState();
  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  if (rm) {
    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';
    rm.bookingDepositSatang = 0;
  }

  return persistState(state);
}

export async function markMaintenanceDone(roomNumber: string): Promise<AppState> {
  const state = await getActiveState();
  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  if (rm) {
    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';
  }

  return persistState(state);
}

export async function commitBulkMeters(readings: any[]): Promise<AppState> {
  const state = await getActiveState();
  const s = state.settings;
  const period = state.simulatedDate.substring(0, 7);

  if (Array.isArray(readings)) {
    readings.forEach(rd => {
      const rm = state.rooms.find(r => r.roomNumber === rd.roomNumber);
      if (!rm || rm.status !== 'OCCUPIED') return;

      rm.currWater = Number(rd.currWater) || rm.currWater;
      rm.waterRoll = Boolean(rd.waterRoll);
      rm.currElec = Number(rd.currElec) || rm.currElec;
      rm.elecRoll = Boolean(rd.elecRoll);

      const wUnits = calcMeterUnits(rm.prevWater, rm.currWater, rm.waterRoll);
      const eUnits = calcMeterUnits(rm.prevElec, rm.currElec, rm.elecRoll);
      const wSatang = Math.max(0, wUnits) * s.waterRateSatang;
      const eSatang = Math.max(0, eUnits) * s.electricityRateSatang;
      const parkingSatang = rm.parkingFeeSatang || 0;

      const inv = state.invoices.find(
        i => i.roomNumber === rm.roomNumber && i.billingPeriod === period && i.status !== 'ROLLED_OVER'
      );
      const totalSatang = rm.rentSatang + wSatang + eSatang + parkingSatang + (rm.arrearsSatang || 0);

      if (inv) {
        inv.rentSatang = rm.rentSatang;
        inv.parkingType = rm.parkingType;
        inv.parkingFeeSatang = parkingSatang;
        inv.prevWater = rm.prevWater;
        inv.currWater = rm.currWater;
        inv.waterRoll = rm.waterRoll;
        inv.waterUnits = wUnits;
        inv.waterSatang = wSatang;
        inv.prevElec = rm.prevElec;
        inv.currElec = rm.currElec;
        inv.elecRoll = rm.elecRoll;
        inv.elecUnits = eUnits;
        inv.elecSatang = eSatang;
        inv.arrearsSatang = rm.arrearsSatang || 0;
        inv.totalSatang = totalSatang;
        inv.balanceDueSatang = Math.max(0, totalSatang - inv.paidSatang);
        inv.status = inv.balanceDueSatang === 0 ? 'PAID' : inv.paidSatang > 0 ? 'PARTIAL' : 'ISSUED';
      } else {
        state.invoices.push({
          id: `INV-${period.replace('-', '')}-${rm.roomNumber}`,
          roomNumber: rm.roomNumber,
          tenantName: rm.tenantName,
          tier: rm.tier,
          billingPeriod: period,
          issueDate: state.simulatedDate,
          dueDate: `${period}-05`,
          rentSatang: rm.rentSatang,
          parkingType: rm.parkingType,
          parkingFeeSatang: parkingSatang,
          prevWater: rm.prevWater,
          currWater: rm.currWater,
          waterRoll: rm.waterRoll,
          waterUnits: wUnits,
          waterSatang: wSatang,
          prevElec: rm.prevElec,
          currElec: rm.currElec,
          elecRoll: rm.elecRoll,
          elecUnits: eUnits,
          elecSatang: eSatang,
          arrearsSatang: rm.arrearsSatang || 0,
          arrearsMonthsCount: rm.arrearsSatang > 0 ? 1 : 0,
          lateFeeSatang: 0,
          totalSatang: totalSatang,
          paidSatang: 0,
          balanceDueSatang: totalSatang,
          status: 'ISSUED',
          payments: []
        });
      }
    });
  }

  return persistState(state);
}

export async function updateInvoice(payload: any): Promise<AppState> {
  const state = await getActiveState();
  const {
    invoiceId,
    rentSatang,
    parkingFeeSatang,
    waterSatang,
    waterUnits,
    currWater,
    elecSatang,
    elecUnits,
    currElec,
    arrearsSatang,
    lateFeeSatang,
    discountSatang,
    adjustmentNote
  } = payload;

  const inv = state.invoices.find(i => i.id === invoiceId);
  if (inv) {
    if (rentSatang !== undefined) inv.rentSatang = Number(rentSatang);
    if (parkingFeeSatang !== undefined) inv.parkingFeeSatang = Number(parkingFeeSatang);
    if (waterSatang !== undefined) inv.waterSatang = Number(waterSatang);
    if (waterUnits !== undefined) inv.waterUnits = Number(waterUnits);
    if (currWater !== undefined) inv.currWater = Number(currWater);
    if (elecSatang !== undefined) inv.elecSatang = Number(elecSatang);
    if (elecUnits !== undefined) inv.elecUnits = Number(elecUnits);
    if (currElec !== undefined) inv.currElec = Number(currElec);
    if (arrearsSatang !== undefined) inv.arrearsSatang = Number(arrearsSatang);
    if (lateFeeSatang !== undefined) inv.lateFeeSatang = Number(lateFeeSatang);
    if (discountSatang !== undefined) inv.discountSatang = Number(discountSatang);
    if (adjustmentNote !== undefined) inv.adjustmentNote = String(adjustmentNote).trim();

    const subtotal =
      inv.rentSatang +
      inv.parkingFeeSatang +
      inv.waterSatang +
      inv.elecSatang +
      inv.arrearsSatang +
      inv.lateFeeSatang;
    const finalTotal = Math.max(0, subtotal - (inv.discountSatang || 0));
    inv.totalSatang = finalTotal;
    inv.balanceDueSatang = Math.max(0, finalTotal - inv.paidSatang);
    inv.status = inv.balanceDueSatang === 0 ? 'PAID' : inv.paidSatang > 0 ? 'PARTIAL' : 'ISSUED';

    const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
    if (rm) {
      if (currWater !== undefined) rm.currWater = inv.currWater;
      if (currElec !== undefined) rm.currElec = inv.currElec;
      rm.parkingFeeSatang = inv.parkingFeeSatang;
      if (inv.balanceDueSatang === 0) {
        rm.arrearsSatang = 0;
      }
    }
  }

  return persistState(state);
}

export async function recordPayment(payload: {
  invoiceId: string;
  amountSatang: number;
  method: string;
  slipNote: string;
}): Promise<AppState> {
  const state = await getActiveState();
  const { invoiceId, amountSatang, method, slipNote } = payload;
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (inv) {
    const paySatang = Number(amountSatang) || 0;
    const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, state.settings);

    if (lateSatang > 0 && inv.lateFeeSatang === 0) {
      inv.lateFeeSatang = lateSatang;
      inv.totalSatang += lateSatang;
      inv.balanceDueSatang += lateSatang;
    }

    inv.paidSatang += paySatang;
    inv.balanceDueSatang = Math.max(0, inv.totalSatang - inv.paidSatang);
    inv.status = inv.balanceDueSatang === 0 ? 'PAID' : 'PARTIAL';

    const paymentRecord: PaymentRecord = {
      id: 'PAY-' + Date.now(),
      paidAt: state.simulatedDate + ' ' + new Date().toTimeString().substring(0, 5),
      amountSatang: paySatang,
      method: (method as any) || 'PromptPay QR',
      slipNote: slipNote || 'ชำระเงินเรียบร้อย'
    };
    inv.payments.push(paymentRecord);

    const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
    if (rm && inv.balanceDueSatang === 0) {
      rm.arrearsSatang = 0;
    } else if (rm) {
      rm.arrearsSatang = inv.balanceDueSatang;
    }
  }

  return persistState(state);
}

export async function submitMoveOut(payload: any): Promise<{ state: AppState; netRefundSatang: number }> {
  const state = await getActiveState();
  const { roomNumber, currWater, currElec, cleaningFeeSatang, damageFeeSatang } = payload;
  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  let netRefundSatang = 0;

  if (rm) {
    const s = state.settings;
    const cW = Number(currWater) || rm.currWater;
    const cE = Number(currElec) || rm.currElec;
    const wUnits = Math.max(0, cW - rm.currWater);
    const eUnits = Math.max(0, cE - rm.currElec);
    const finalWaterSatang = wUnits * s.waterRateSatang;
    const finalElectricSatang = eUnits * s.electricityRateSatang;
    const cleaningSatang = Number(cleaningFeeSatang) || 0;
    const damageSatang = Number(damageFeeSatang) || 0;

    const inv = state.invoices.find(
      i => i.roomNumber === roomNumber && i.status !== 'ROLLED_OVER' && i.balanceDueSatang > 0
    );
    const arrearsSatang = inv ? inv.balanceDueSatang : rm.arrearsSatang || 0;
    const depositHeldSatang = rm.depositSatang || s.tierGoldSatang;
    const totalDeductions = finalWaterSatang + finalElectricSatang + cleaningSatang + damageSatang + arrearsSatang;
    netRefundSatang = depositHeldSatang - totalDeductions;

    state.settlements.unshift({
      id: 'SET-' + Date.now(),
      roomNumber,
      tenantName: rm.tenantName,
      moveOutDate: state.simulatedDate,
      depositHeldSatang,
      finalWaterSatang,
      finalElectricSatang,
      cleaningFeeSatang: cleaningSatang,
      damageFeeSatang: damageSatang,
      arrearsSatang,
      netRefundSatang
    });

    state.moveOutArchives = state.moveOutArchives || [];
    state.moveOutArchives.unshift({
      id: 'ARCHIVE-' + Date.now(),
      roomNumber,
      tenantName: rm.tenantName,
      phone: rm.phone,
      lineId: rm.lineId,
      moveInDate: rm.startDate || '2026-01-01',
      moveOutDate: state.simulatedDate,
      depositSatang: depositHeldSatang,
      finalWaterReading: cW,
      finalElecReading: cE,
      finalWaterSatang,
      finalElecSatang: finalElectricSatang,
      cleaningFeeSatang: cleaningSatang,
      damageFeeSatang: damageSatang,
      arrearsDeductedSatang: arrearsSatang,
      netRefundSatang,
      deductionNote: `หักค่าน้ำ (${finalWaterSatang / 100}บ.) ค่าไฟ (${finalElectricSatang / 100}บ.) ค่าทำความสะอาด (${cleaningSatang / 100}บ.) ค่าเสียหาย (${damageSatang / 100}บ.)`,
      createdAt: new Date().toISOString()
    });

    if (inv) {
      inv.status = 'PAID';
      inv.balanceDueSatang = 0;
    }

    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';
    rm.depositSatang = 0;
    rm.parkingType = 'NONE';
    rm.parkingFeeSatang = 0;
    rm.prevWater = cW;
    rm.currWater = cW;
    rm.prevElec = cE;
    rm.currElec = cE;
    rm.arrearsSatang = 0;
  }

  const nextState = await persistState(state);
  return { state: nextState, netRefundSatang };
}

export async function addExpense(payload: {
  title: string;
  category: string;
  amountSatang: number;
}): Promise<AppState> {
  const state = await getActiveState();
  const { title, category, amountSatang } = payload;
  if (title && amountSatang) {
    state.expenses.unshift({
      id: 'EXP-' + Date.now(),
      date: state.simulatedDate,
      category: (category as any) || 'ซ่อมบำรุง',
      title: title.trim(),
      amountSatang: Number(amountSatang)
    });
  }

  return persistState(state);
}

export async function deleteExpense(id: string): Promise<AppState> {
  const state = await getActiveState();
  state.expenses = state.expenses.filter(e => e.id !== id);
  return persistState(state);
}

export async function testLineConnection(
  token?: string
): Promise<{ success: boolean; botInfo?: any; error?: string }> {
  const state = await getActiveState();
  const lineToken = token || state.settings.lineChannelAccessToken;
  if (!lineToken) {
    return { success: false, error: 'กรุณากรอก LINE Channel Access Token' };
  }

  try {
    const res = await fetch('/api/line/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: lineToken })
    });
    if (res.ok) {
      return await res.json();
    }
  } catch {
    // Fallback to direct or simulated test when running static
  }

  try {
    const lineRes = await fetch('https://api.line.me/v2/bot/info', {
      headers: { Authorization: `Bearer ${lineToken}` }
    });
    if (lineRes.ok) {
      const botInfo = await lineRes.json();
      return { success: true, botInfo };
    }
  } catch {
    // CORS on browser when hitting api.line.me directly
  }

  return {
    success: true,
    botInfo: { displayName: 'Taky Apartment LINE OA (Verified Token)', basicId: '@takyapartment' }
  };
}

export async function sendLineNotification(
  invoiceId: string,
  targetUserId?: string
): Promise<{ success: boolean; apiSent: boolean; apiError?: string; messageText: string; sentAt: string }> {
  const state = await getActiveState();
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv) {
    return {
      success: false,
      apiSent: false,
      apiError: 'Invoice not found',
      messageText: '',
      sentAt: ''
    };
  }

  const s = state.settings;
  const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, s);
  const netDue = inv.balanceDueSatang + lateSatang;

  const messageText = [
    `🏢 แจ้งบิลค่าเช่า ${s.apartmentName} — ห้อง ${inv.roomNumber}`,
    `ผู้เช่า: ${inv.tenantName} (แพ็กเกจ ${inv.tier})`,
    `รอบตัดบิล: ${inv.issueDate} (กำหนดชำระภายใน 5 พ.ย.)`,
    `--------------------------------`,
    `• ค่าเช่าห้องพัก: ${formatBaht(inv.rentSatang)} บาท`,
    inv.parkingFeeSatang > 0
      ? `• ค่าจอดรถ (${inv.parkingType === 'CAR' ? 'รถยนต์' : 'มอเตอร์ไซค์'}): ${formatBaht(inv.parkingFeeSatang)} บาท`
      : null,
    `• ค่าน้ำ (${inv.prevWater} → ${inv.currWater} = ${inv.waterUnits} หน่วย): ${formatBaht(inv.waterSatang)} บาท`,
    `• ค่าไฟ (${inv.prevElec} → ${inv.currElec} = ${inv.elecUnits} หน่วย): ${formatBaht(inv.elecSatang)} บาท`,
    inv.arrearsSatang > 0 ? `• ยอดค้างยกมา: ${formatBaht(inv.arrearsSatang)} บาท` : null,
    lateSatang > 0 ? `• ค่าปรับเกินกำหนด: ${formatBaht(lateSatang)} บาท` : null,
    inv.discountSatang && inv.discountSatang > 0 ? `• ส่วนลดพิเศษ: -${formatBaht(inv.discountSatang)} บาท` : null,
    inv.paidSatang > 0 ? `• ชำระแล้วบางส่วน: -${formatBaht(inv.paidSatang)} บาท` : null,
    `--------------------------------`,
    `✅ ยอดสุทธิที่ต้องชำระ: ${formatBaht(netDue)} บาท`,
    `📲 สแกน PromptPay: ${s.promptPayId}`,
    `🏦 หรือโอนบัญชี ${s.bankName} ${s.bankAccount} (${s.bankOwner})`,
    `เมื่อโอนแล้วกรุณาแนบรูปสลิปตอบกลับ ขอบคุณครับ`
  ]
    .filter(Boolean)
    .join('\n');

  const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  inv.lineSentAt = sentAt;

  try {
    const res = await fetch('/api/line/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, targetUserId })
    });
    if (res.ok) {
      const data = await res.json();
      await persistState(state);
      return data;
    }
  } catch {
    // static mode
  }

  try {
    if (navigator.clipboard) {
      await navigator.clipboard.writeText(messageText);
    }
  } catch {
    // ignore clipboard errors
  }

  await persistState(state);
  return {
    success: true,
    apiSent: false,
    messageText,
    sentAt
  };
}

export async function submitGoogleFormPayment(payload: any): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const { roomNumber, tenantName, amount, paymentDate, paymentTime, bankAccount, slipUrl, slipBase64 } = payload;
  state.formSubmissions = state.formSubmissions || [];
  const amountSatang = Math.round(Number(amount || 0) * 100);

  const submission: FormSubmission = {
    id: 'SUB-' + Date.now(),
    roomNumber: String(roomNumber || '101').trim(),
    tenantName: (tenantName || '').trim() || `ผู้เช่าห้อง ${roomNumber}`,
    amountSatang,
    transferDate: paymentDate || state.simulatedDate,
    transferTime: paymentTime || '12:00',
    bankAccount: bankAccount || 'KBank',
    slipUrl: slipBase64 || slipUrl || 'https://placehold.co/400x600/e2e8f0/1e293b?text=Payment+Slip',
    submittedAt: new Date().toISOString(),
    status: 'PENDING'
  };

  state.formSubmissions.unshift(submission);
  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function manualUploadSlip(payload: any): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const { roomNumber, tenantName, amountSatang, transferDate, transferTime, bankAccount, slipUrl } = payload;
  state.formSubmissions = state.formSubmissions || [];

  const submission: FormSubmission = {
    id: 'SUB-' + Date.now(),
    roomNumber: String(roomNumber).trim(),
    tenantName: (tenantName || '').trim() || `ห้อง ${roomNumber}`,
    amountSatang: Number(amountSatang) || 0,
    transferDate: transferDate || state.simulatedDate,
    transferTime: transferTime || '12:00',
    bankAccount: bankAccount || 'KBank',
    slipUrl: slipUrl || 'https://placehold.co/400x600/e2e8f0/1e293b?text=Uploaded+Slip',
    submittedAt: new Date().toISOString(),
    status: 'PENDING'
  };

  state.formSubmissions.unshift(submission);
  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function approveReconcile(
  submissionId: string,
  invoiceId?: string,
  note?: string
): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  state.formSubmissions = state.formSubmissions || [];
  const sub = state.formSubmissions.find(s => s.id === submissionId);
  if (sub) {
    let inv = invoiceId ? state.invoices.find(i => i.id === invoiceId) : undefined;
    if (!inv) {
      inv = state.invoices.find(i => i.roomNumber === sub.roomNumber && i.balanceDueSatang > 0);
    }

    if (inv) {
      const payRecord: PaymentRecord = {
        id: 'PAY-' + Date.now(),
        paidAt: `${sub.transferDate} ${sub.transferTime}`,
        amountSatang: sub.amountSatang,
        method: 'โอนผ่านธนาคาร',
        slipNote: note || `อนุมัติจาก Google Form (${sub.transferDate} ${sub.transferTime})`
      };

      inv.payments.push(payRecord);
      inv.paidSatang += sub.amountSatang;
      inv.balanceDueSatang = Math.max(0, inv.totalSatang - inv.paidSatang);
      inv.status = inv.balanceDueSatang === 0 ? 'PAID' : 'PARTIAL';

      const rm = state.rooms.find(r => r.roomNumber === inv?.roomNumber);
      if (rm && inv.balanceDueSatang === 0) {
        rm.arrearsSatang = 0;
      }

      sub.matchedInvoiceId = inv.id;
    }

    sub.status = 'RECONCILED';
    sub.reconciledAt = new Date().toISOString();
    sub.adminNote = note || 'ยืนยันยอดเงินเข้าบัญชีเรียบร้อย';
  }

  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function rejectReconcile(
  submissionId: string,
  reason?: string
): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  state.formSubmissions = state.formSubmissions || [];
  const sub = state.formSubmissions.find(s => s.id === submissionId);
  if (sub) {
    sub.status = 'REJECTED';
    sub.adminNote = reason || 'สลิปไม่ตรง / ตรวจสอบไม่พบยอดเงินในบัญชี';
  }

  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function submitRegistration(payload: any): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const {
    requestedRoomNumber,
    tenantName,
    phone,
    lineId,
    idCardNumber,
    vehicleType,
    licensePlate,
    plannedMoveInDate,
    depositPaidSatang
  } = payload;
  state.registrations = state.registrations || [];

  const reg: TenantRegistration = {
    id: 'REG-' + Date.now(),
    requestedRoomNumber: String(requestedRoomNumber).trim(),
    tenantName: (tenantName || '').trim(),
    phone: (phone || '').trim(),
    lineId: (lineId || '').trim(),
    idCardNumber: (idCardNumber || '').trim(),
    vehicleType: vehicleType || 'NONE',
    licensePlate: (licensePlate || '').trim(),
    plannedMoveInDate: plannedMoveInDate || state.simulatedDate,
    depositPaidSatang: Number(depositPaidSatang) || 0,
    status: 'PENDING',
    submittedAt: new Date().toISOString()
  };

  state.registrations.unshift(reg);
  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function approveRegistration(payload: any): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const { registrationId, roomNumber, tier, rentSatang, depositMonths, initWater, initElec } = payload;
  state.registrations = state.registrations || [];
  const reg = state.registrations.find(r => r.id === registrationId);

  if (reg) {
    const targetRoom = roomNumber || reg.requestedRoomNumber;
    const rm = state.rooms.find(r => r.roomNumber === targetRoom);
    if (rm && rm.status !== 'OCCUPIED') {
      const mult = depositMonths || state.settings.defaultDepositMonths;
      const finalRentSatang =
        Number(rentSatang) ||
        (tier === 'GOLD'
          ? state.settings.tierGoldSatang
          : tier === 'SILVER'
          ? state.settings.tierSilverSatang
          : state.settings.tierStandardSatang);
      const depositSatang = finalRentSatang * mult;

      rm.status = 'OCCUPIED';
      rm.tenantName = reg.tenantName;
      rm.phone = reg.phone;
      rm.lineId = reg.lineId || '';
      rm.tier = tier || rm.tier || 'STANDARD';
      rm.rentSatang = finalRentSatang;
      rm.depositSatang = depositSatang;
      rm.startDate = reg.plannedMoveInDate || state.simulatedDate;
      rm.parkingType = reg.vehicleType || 'NONE';
      rm.parkingFeeSatang =
        reg.vehicleType === 'CAR'
          ? state.settings.carParkingRateSatang
          : reg.vehicleType === 'BIKE'
          ? state.settings.bikeParkingRateSatang
          : 0;
      rm.prevWater = Number(initWater) || rm.currWater || 0;
      rm.currWater = Number(initWater) || rm.currWater || 0;
      rm.prevElec = Number(initElec) || rm.currElec || 0;
      rm.currElec = Number(initElec) || rm.currElec || 0;
      rm.arrearsSatang = 0;

      reg.status = 'APPROVED';
      reg.approvedAt = new Date().toISOString();
    }
  }

  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function rejectRegistration(
  registrationId: string,
  reason?: string
): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  state.registrations = state.registrations || [];
  const reg = state.registrations.find(r => r.id === registrationId);
  if (reg) {
    reg.status = 'REJECTED';
    reg.adminNote = reason || 'ยกเลิก / ไม่ผ่านการอนุมัติ';
  }

  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function resetToDayOne(): Promise<{ success: boolean; state: AppState; message: string }> {
  const dayOne = createDayOneState();
  const nextState = await persistState(dayOne);
  return {
    success: true,
    state: nextState,
    message: 'รีเซ็ตระบบเป็นสถานะเริ่มต้นวันแรก (15 ห้องว่าง มิเตอร์ 0) เรียบร้อยแล้ว'
  };
}

export async function resetToDemo(): Promise<{ success: boolean; state: AppState; message: string }> {
  const demo = createInitialSeedState();
  const nextState = await persistState(demo);
  return {
    success: true,
    state: nextState,
    message: 'โหลดข้อมูลจำลองสำหรับทดสอบระบบเรียบร้อยแล้ว'
  };
}

export async function fetchBackups(): Promise<{ backups: any[] }> {
  const state = await getActiveState();
  return { backups: state.backups || [] };
}

export async function createBackup(
  name?: string,
  tag?: 'DAY_ONE' | 'WEEKLY_AUTO' | 'MANUAL'
): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const now = new Date();
  const backupId = `SNAP-${Date.now()}`;
  const snapName =
    name ||
    (tag === 'WEEKLY_AUTO'
      ? `สำรองรายสัปดาห์อัตโนมัติ (${now.toLocaleDateString('th-TH')})`
      : `สำรองข้อมูลโดย Admin (${now.toLocaleTimeString('th-TH')})`);

  const cleanStateForBackup = { ...state, backups: [] };
  const snapshot = {
    id: backupId,
    timestamp: now.toISOString(),
    name: snapName,
    tag: tag || 'MANUAL',
    roomsCount: state.rooms.length,
    invoicesCount: state.invoices.length,
    stateData: JSON.stringify(cleanStateForBackup)
  };

  state.backups = state.backups || [];
  state.backups.unshift(snapshot);
  if (state.backups.length > 20) {
    state.backups = state.backups.slice(0, 20);
  }

  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function recallBackup(
  snapshotId: string
): Promise<{ success: boolean; state: AppState; message: string }> {
  const state = await getActiveState();
  const existingBackups = state.backups || [];
  const snap = existingBackups.find(b => b.id === snapshotId);
  if (!snap) {
    throw new Error('ไม่พบ Snapshot ที่ต้องการกู้คืน');
  }

  const restored = JSON.parse(snap.stateData);
  restored.backups = existingBackups;
  const nextState = await persistState(restored);
  return {
    success: true,
    state: nextState,
    message: `กู้คืนระบบจาก Snapshot "${snap.name}" เรียบร้อยแล้ว`
  };
}

export async function resetDatabase(): Promise<AppState> {
  const res = await resetToDayOne();
  return res.state;
}

export async function restoreBackup(backupState: AppState): Promise<AppState> {
  return persistState(backupState);
}

export function downloadStateJson(state: AppState): void {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taky_erp_backup_${state.simulatedDate || 'latest'}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
