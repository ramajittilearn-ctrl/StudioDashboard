import {
  AppState,
  FormSubmission,
  Invoice,
  ParkingType,
  PaymentRecord,
  PropertySettings,
  Room,
  TenantRegistration
} from '../types';
import { calcLateFeeSatang, calcMeterUnits, calcNextDueDate, calcProratedRentSatang, formatBaht, getLatestRoomInvoice } from '../lib/finance';
import { saveStateToFirestore } from '../lib/firebase';
import { LIVE_INFORM_PAGE_URL, LIVE_PAYMENT_FORM_URL, LIVE_REGISTRATION_FORM_URL } from '../lib/bridgeScript';

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
    tierGoldSatang: 350000,      // 3,500 THB
    paymentFormUrl: LIVE_PAYMENT_FORM_URL,
    registrationFormUrl: LIVE_REGISTRATION_FORM_URL,
    informPageUrl: LIVE_INFORM_PAGE_URL
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
    tierGoldSatang: 350000,
    paymentFormUrl: LIVE_PAYMENT_FORM_URL,
    registrationFormUrl: LIVE_REGISTRATION_FORM_URL,
    informPageUrl: LIVE_INFORM_PAGE_URL
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
    settings: {
      ...s.settings,
      paymentFormUrl: s.settings.paymentFormUrl || LIVE_PAYMENT_FORM_URL,
      registrationFormUrl: s.settings.registrationFormUrl || LIVE_REGISTRATION_FORM_URL,
      informPageUrl: s.settings.informPageUrl || LIVE_INFORM_PAGE_URL
    },
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
  if (process.env.NODE_ENV !== 'test') {
    await saveStateToFirestore(next);
  }
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

    const hasInitWater = initWater !== undefined && initWater !== null && initWater !== '';
    const hasInitElec = initElec !== undefined && initElec !== null && initElec !== '';
    const wVal = hasInitWater ? Number(initWater) : (rm.currWater || 0);
    const eVal = hasInitElec ? Number(initElec) : (rm.currElec || 0);
    const bookingCreditSatang = Number(payload.bookingCreditSatang) || (rm.status === 'RESERVED' ? (rm.bookingDepositSatang || 0) : 0);

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
    rm.prevWater = wVal;
    rm.currWater = wVal;
    rm.prevElec = eVal;
    rm.currElec = eVal;
    rm.arrearsSatang = 0;

    // B8 & H4: Issue initial move-in invoice (both prorated and full-month, deducting any booking deposit credit)
    const moveInDate = payload.startDate || state.simulatedDate;
    if (moveInDate) {
      const useProrate = payload.useProrate !== undefined ? Boolean(payload.useProrate) : false;
      const pro = calcProratedRentSatang(finalRentSatang, moveInDate, state.settings.billingDay);
      const firstRentSatang = useProrate ? pro.proratedAmountSatang : finalRentSatang;
      const period = moveInDate.substring(0, 7);
      const nextDue = calcNextDueDate(moveInDate, state.settings.dueDayNextMonth || 5);
      const parkingFee = Number(parkingFeeSatang) || 0;
      const subtotalMoveInSatang = firstRentSatang + parkingFee;
      const discountSatang = Math.min(subtotalMoveInSatang, Math.max(0, bookingCreditSatang));
      const totalMoveInSatang = Math.max(0, subtotalMoveInSatang - discountSatang);

      state.invoices.push({
        id: `INV-${period.replace('-', '')}-${rm.roomNumber}-PRORATE`,
        roomNumber: rm.roomNumber,
        tenantName: rm.tenantName,
        tier: rm.tier,
        billingPeriod: period,
        issueDate: moveInDate,
        dueDate: nextDue,
        rentSatang: firstRentSatang,
        parkingType: rm.parkingType,
        parkingFeeSatang: parkingFee,
        prevWater: rm.prevWater,
        currWater: rm.currWater,
        waterRoll: false,
        waterUnits: 0,
        waterSatang: 0,
        prevElec: rm.prevElec,
        currElec: rm.currElec,
        elecRoll: false,
        elecUnits: 0,
        elecSatang: 0,
        arrearsSatang: 0,
        lateFeeSatang: 0,
        discountSatang: discountSatang > 0 ? discountSatang : undefined,
        adjustmentNote: discountSatang > 0 ? 'หักเงินมัดจำจองล่วงหน้า' : undefined,
        totalSatang: totalMoveInSatang,
        paidSatang: 0,
        balanceDueSatang: totalMoveInSatang,
        status: totalMoveInSatang === 0 ? 'PAID' : 'ISSUED',
        payments: []
      });
    }
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

      const inv = state.invoices.find(
        i =>
          i.roomNumber === rm.roomNumber &&
          i.billingPeriod === period &&
          i.status !== 'ROLLED_OVER' &&
          !i.id.endsWith('-PRORATE')
      );

      // C2: Preserve the period's starting meter reading if re-committing in the same period
      const prevW =
        rd.prevWater !== undefined && rd.prevWater !== null && rd.prevWater !== ''
          ? Number(rd.prevWater)
          : inv
          ? inv.prevWater
          : rm.prevWater;
      const prevE =
        rd.prevElec !== undefined && rd.prevElec !== null && rd.prevElec !== ''
          ? Number(rd.prevElec)
          : inv
          ? inv.prevElec
          : rm.prevElec;

      const currW =
        rd.currWater !== undefined && rd.currWater !== null && rd.currWater !== ''
          ? Number(rd.currWater)
          : rm.currWater;
      const currE =
        rd.currElec !== undefined && rd.currElec !== null && rd.currElec !== ''
          ? Number(rd.currElec)
          : rm.currElec;
      const waterRoll = rd.waterRoll !== undefined ? Boolean(rd.waterRoll) : (inv ? inv.waterRoll : rm.waterRoll);
      const elecRoll = rd.elecRoll !== undefined ? Boolean(rd.elecRoll) : (inv ? inv.elecRoll : rm.elecRoll);

      const wUnits = calcMeterUnits(prevW, currW, waterRoll);
      const eUnits = calcMeterUnits(prevE, currE, elecRoll);
      const wSatang = Math.max(0, wUnits) * s.waterRateSatang;
      const eSatang = Math.max(0, eUnits) * s.electricityRateSatang;
      const parkingSatang = rm.parkingFeeSatang || 0;

      // B3 & H2: Calculate arrears from prior unpaid invoices and mark them ROLLED_OVER
      const priorUnpaidInvoices = state.invoices.filter(
        oldInv =>
          oldInv.roomNumber === rm.roomNumber &&
          oldInv.billingPeriod !== period &&
          oldInv.balanceDueSatang > 0 &&
          oldInv.status !== 'ROLLED_OVER'
      );

      let arrearsToRoll = 0;
      if (priorUnpaidInvoices.length > 0) {
        arrearsToRoll = priorUnpaidInvoices.reduce((sum, oldInv) => {
          const late = calcLateFeeSatang(oldInv, state.simulatedDate, s);
          return sum + oldInv.balanceDueSatang + late;
        }, 0);
        priorUnpaidInvoices.forEach(oldInv => {
          oldInv.status = 'ROLLED_OVER';
        });
        if (inv) {
          arrearsToRoll += inv.arrearsSatang || 0;
        }
      } else if (inv) {
        arrearsToRoll = inv.arrearsSatang || 0;
      } else {
        const hasAnyPriorInvoice = state.invoices.some(
          i => i.roomNumber === rm.roomNumber && !i.id.endsWith('-PRORATE')
        );
        arrearsToRoll = hasAnyPriorInvoice ? 0 : (rm.arrearsSatang || 0);
      }

      const nextDueDate = calcNextDueDate(state.simulatedDate, s.dueDayNextMonth || 5);
      const discountSatang = inv ? (inv.discountSatang || 0) : 0;
      const lateFeeSatang = inv ? (inv.lateFeeSatang || 0) : 0;
      const totalSatang = Math.max(
        0,
        rm.rentSatang + wSatang + eSatang + parkingSatang + arrearsToRoll + lateFeeSatang - discountSatang
      );

      if (inv) {
        inv.rentSatang = rm.rentSatang;
        inv.parkingType = rm.parkingType;
        inv.parkingFeeSatang = parkingSatang;
        inv.dueDate = nextDueDate;
        inv.prevWater = prevW;
        inv.currWater = currW;
        inv.waterRoll = waterRoll;
        inv.waterUnits = wUnits;
        inv.waterSatang = wSatang;
        inv.prevElec = prevE;
        inv.currElec = currE;
        inv.elecRoll = elecRoll;
        inv.elecUnits = eUnits;
        inv.elecSatang = eSatang;
        inv.arrearsSatang = arrearsToRoll;
        inv.totalSatang = totalSatang;
        inv.balanceDueSatang = Math.max(0, totalSatang - inv.paidSatang);
        inv.status = inv.balanceDueSatang === 0 ? 'PAID' : inv.paidSatang > 0 ? 'PARTIAL' : 'ISSUED';
        rm.arrearsSatang = inv.balanceDueSatang === 0 ? 0 : arrearsToRoll;
      } else {
        state.invoices.push({
          id: `INV-${period.replace('-', '')}-${rm.roomNumber}`,
          roomNumber: rm.roomNumber,
          tenantName: rm.tenantName,
          tier: rm.tier,
          billingPeriod: period,
          issueDate: state.simulatedDate,
          dueDate: nextDueDate,
          rentSatang: rm.rentSatang,
          parkingType: rm.parkingType,
          parkingFeeSatang: parkingSatang,
          prevWater: prevW,
          currWater: currW,
          waterRoll: waterRoll,
          waterUnits: wUnits,
          waterSatang: wSatang,
          prevElec: prevE,
          currElec: currE,
          elecRoll: elecRoll,
          elecUnits: eUnits,
          elecSatang: eSatang,
          arrearsSatang: arrearsToRoll,
          arrearsMonthsCount: arrearsToRoll > 0 ? 1 : 0,
          lateFeeSatang: 0,
          totalSatang: totalSatang,
          paidSatang: 0,
          balanceDueSatang: totalSatang,
          status: 'ISSUED',
          payments: []
        });
        rm.arrearsSatang = arrearsToRoll;
      }

      // B1: Advance room meter readings for the NEXT cycle and reset rollover flags
      rm.currWater = currW;
      rm.currElec = currE;
      rm.prevWater = currW;
      rm.prevElec = currE;
      rm.waterRoll = false;
      rm.elecRoll = false;
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
    prevWater,
    currWater,
    elecSatang,
    elecUnits,
    prevElec,
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
    if (prevWater !== undefined) inv.prevWater = Number(prevWater);
    if (currWater !== undefined) inv.currWater = Number(currWater);
    if (elecSatang !== undefined) inv.elecSatang = Number(elecSatang);
    if (elecUnits !== undefined) inv.elecUnits = Number(elecUnits);
    if (prevElec !== undefined) inv.prevElec = Number(prevElec);
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
  const paySatang = Number(amountSatang) || 0;
  if (paySatang <= 0) {
    throw new Error('จำนวนเงินที่ชำระต้องมากกว่า 0 บาท');
  }

  const inv = state.invoices.find(i => i.id === invoiceId);
  if (inv) {
    const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, state.settings);

    if (lateSatang > 0) {
      inv.lateFeeSatang = (inv.lateFeeSatang || 0) + lateSatang;
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
  const { roomNumber, currWater, currElec, waterRoll, elecRoll, cleaningFeeSatang, damageFeeSatang } = payload;
  const rm = state.rooms.find(r => r.roomNumber === roomNumber);
  let netRefundSatang = 0;

  if (rm) {
    const s = state.settings;
    const cW = currWater !== undefined && currWater !== null && currWater !== '' && Number(currWater) >= 0 ? Number(currWater) : rm.currWater;
    const cE = currElec !== undefined && currElec !== null && currElec !== '' && Number(currElec) >= 0 ? Number(currElec) : rm.currElec;
    const wUnits = calcMeterUnits(rm.currWater, cW, Boolean(waterRoll));
    const eUnits = calcMeterUnits(rm.currElec, cE, Boolean(elecRoll));
    const finalWaterSatang = Math.max(0, wUnits) * s.waterRateSatang;
    const finalElectricSatang = Math.max(0, eUnits) * s.electricityRateSatang;
    const cleaningSatang = Number(cleaningFeeSatang) || 0;
    const damageSatang = Number(damageFeeSatang) || 0;

    // Sum all unpaid active balances for this room
    const unpaidInvoices = state.invoices.filter(
      i => i.roomNumber === roomNumber && i.status !== 'ROLLED_OVER' && i.balanceDueSatang > 0
    );
    const totalInvoiceArrears = unpaidInvoices.reduce((sum, inv) => sum + inv.balanceDueSatang, 0);
    const arrearsSatang = unpaidInvoices.length > 0 ? totalInvoiceArrears : (rm.arrearsSatang || 0);

    // B4: Use actual deposit (if 0 then 0, do not invent 3,500 THB)
    const depositHeldSatang = rm.depositSatang || 0;
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

    // Only close invoices if deposit was sufficient to clear them
    if (netRefundSatang >= 0) {
      unpaidInvoices.forEach(inv => {
        inv.status = 'PAID';
        inv.balanceDueSatang = 0;
      });
      rm.arrearsSatang = 0;
    } else {
      // Tenant still owes money after deducting deposit
      rm.arrearsSatang = Math.abs(netRefundSatang);
    }

    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.email = '';
    rm.lineId = '';
    rm.notes = '';
    rm.depositSatang = 0;
    rm.parkingType = 'NONE';
    rm.parkingFeeSatang = 0;
    rm.prevWater = cW;
    rm.currWater = cW;
    rm.prevElec = cE;
    rm.currElec = cE;
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
    } else {
      const err = await lineRes.text();
      return { success: false, error: `LINE API Error (${lineRes.status}): ${err}` };
    }
  } catch (err: any) {
    // Note: Calling LINE API directly from browser will hit CORS restriction
    return {
      success: false,
      error: 'เบราว์เซอร์ไม่สามารถเรียก LINE API ได้โดยตรงเนื่องจากติด CORS Policy (Token ได้ถูกบันทึกลงระบบแล้ว และจะถูกใช้เมื่อส่งผ่าน Backend/Webhook)'
    };
  }
}

export async function sendLineNotification(
  invoiceId: string,
  targetUserId?: string
): Promise<{ success: boolean; apiSent: boolean; apiError?: string; messageText: string; sentAt: string }> {
  const state = await getActiveState();
  const inv = state.invoices.find(i => i.id === invoiceId);
  if (!inv) {
    throw new Error('ไม่พบข้อมูลใบแจ้งหนี้');
  }

  const s = state.settings;
  const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
  const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, s);
  const netDue = inv.balanceDueSatang + lateSatang;

  const dueText = inv.dueDate ? ` (กำหนดชำระภายใน ${inv.dueDate})` : '';

  const messageText = [
    `🏢 แจ้งบิลค่าเช่า ${s.apartmentName} — ห้อง ${inv.roomNumber}`,
    `ผู้เช่า: ${inv.tenantName} (แพ็กเกจ ${inv.tier})`,
    `รอบตัดบิล: ${inv.issueDate}${dueText}`,
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
    `🔗 แจ้งชำระเงิน/แนบสลิป: ${s.informPageUrl || LIVE_INFORM_PAGE_URL}`,
    `เมื่อโอนแล้วกรุณาแจ้งชำระผ่านลิงก์ด้านบนหรือแนบรูปสลิปตอบกลับ ขอบคุณครับ`
  ]
    .filter(Boolean)
    .join('\n');

  // Check required settings for LINE API
  if (!s.lineChannelAccessToken) {
    throw new Error('ยังไม่ได้ระบุ LINE Channel Access Token ในหน้าตั้งค่า');
  }

  const destination = targetUserId || (rm && rm.lineId && rm.lineId.startsWith('U') ? rm.lineId : s.lineDestinationId);
  if (!destination) {
    throw new Error(`ไม่พบ LINE User ID (ขึ้นต้นด้วย U...) ของห้อง ${inv.roomNumber} หรือ Target User ID ในหน้าตั้งค่า`);
  }

  let apiSent = false;
  let apiError = '';

  try {
    const res = await fetch('/api/line/notify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invoiceId, targetUserId: destination })
    });
    if (res.ok) {
      const data = await res.json();
      apiSent = Boolean(data.apiSent);
      apiError = data.apiError || '';
    } else {
      apiError = `Server error HTTP ${res.status}`;
    }
  } catch {
    apiError = 'ไม่สามารถส่งข้อความได้โดยตรงจากเบราว์เซอร์ (ติดข้อจำกัด CORS ของ LINE API) กรุณาใช้ปุ่ม "คัดลอกข้อความบิล" หรือ "เปิดแอป LINE" เพื่อส่งให้ผู้เช่า';
  }

  if (!apiSent) {
    throw new Error(apiError || 'ไม่สามารถส่งข้อความผ่าน LINE API ได้');
  }

  const sentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
  inv.lineSentAt = sentAt;
  await persistState(state);

  return {
    success: true,
    apiSent: true,
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

function inferVehicleFromNotes(notes?: string): ParkingType {
  const s = String(notes || '').toLowerCase();
  if (!s) return 'NONE';
  if (/รถยนต์|เก๋ง|กระบะ|\bcar\b/.test(s)) return 'CAR';
  if (/มอเตอร์ไซค์|มอไซ|จักรยานยนต์|\bbike\b|\bmotor/.test(s)) return 'BIKE';
  return 'NONE';
}

async function postToGoogleBridge(
  state: AppState,
  payload: Record<string, any>
): Promise<{ synced: boolean; warning?: string }> {
  const url = String(state.settings.googleAppsScriptUrl || '').trim();
  const token = String(state.settings.googleAppsScriptToken || '').trim();
  if (!url || !token || !payload.externalKey) {
    return { synced: false };
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...payload, token })
    });
    const data = await res.json();
    if (!res.ok || !data || !data.ok) {
      return {
        synced: false,
        warning: data?.error || `อัปเดต Google Sheet ไม่สำเร็จ (HTTP ${res.status})`
      };
    }
    return { synced: true };
  } catch (err: any) {
    return {
      synced: false,
      warning: `บันทึกใน Dashboard สำเร็จ แต่ซิงก์กลับ Google Sheet ไม่ได้: ${err?.message || 'Network error'}`
    };
  }
}

export interface GoogleBridgeSyncResult {
  synced: boolean;
  changed: boolean;
  newPaymentsCount: number;
  newRegistrationsCount: number;
  pendingPaymentsCount: number;
  pendingRegistrationsCount: number;
  dueDay?: number;
  state: AppState;
}

export async function syncGoogleFormsFromBridge(
  overrideUrl?: string,
  overrideToken?: string
): Promise<GoogleBridgeSyncResult> {
  const state = await getActiveState();
  const url = String(overrideUrl !== undefined ? overrideUrl : (state.settings.googleAppsScriptUrl || '')).trim();
  const token = String(overrideToken !== undefined ? overrideToken : (state.settings.googleAppsScriptToken || '')).trim();

  if (!url || !token) {
    throw new Error('กรุณาระบุ Apps Script Web App URL และ Secret Token ก่อนดึงข้อมูลจาก Google Form');
  }
  if (!/^https:\/\/script\.google\.com\/macros\/s\//.test(url)) {
    throw new Error('รูปแบบ Web App URL ไม่ถูกต้อง (ต้องขึ้นต้นด้วย https://script.google.com/macros/s/.../exec)');
  }

  const sep = url.includes('?') ? '&' : '?';
  let res: Response;
  try {
    res = await fetch(`${url}${sep}action=pull&token=${encodeURIComponent(token)}`, {
      method: 'GET',
      cache: 'no-store'
    });
  } catch (err: any) {
    throw new Error(
      `เชื่อมต่อ Google Apps Script ไม่สำเร็จ (${err?.message || 'CORS / Network Error'}) — กรุณาตรวจสอบว่า Deploy เป็น Web App (Execute as: Me, Who has access: Anyone)`
    );
  }

  let data: any;
  try {
    data = await res.json();
  } catch {
    throw new Error('Google Apps Script ไม่ได้ส่งข้อมูล JSON กลับมา กรุณาตรวจสอบสิทธิ์ Who has access: Anyone ในหน้า Manage deployments');
  }

  if (!res.ok || !data || !data.ok) {
    throw new Error(data?.error || `ดึงข้อมูลจาก Google Sheet ไม่สำเร็จ (HTTP ${res.status})`);
  }

  let changed = false;
  let newPaymentsCount = 0;
  let newRegistrationsCount = 0;

  if (
    (overrideUrl !== undefined && url !== (state.settings.googleAppsScriptUrl || '')) ||
    (overrideToken !== undefined && token !== (state.settings.googleAppsScriptToken || ''))
  ) {
    state.settings.googleAppsScriptUrl = url;
    state.settings.googleAppsScriptToken = token;
    changed = true;
  }

  state.formSubmissions = state.formSubmissions || [];
  state.registrations = state.registrations || [];

  const incomingPayments: any[] = Array.isArray(data.payments) ? data.payments : [];
  incomingPayments.forEach((p, idx) => {
    const extKey = String(p.externalKey || '').trim();
    if (!extKey) return;
    const amountSatang = Math.round(Number(p.amountBaht || 0) * 100);
    const existing = state.formSubmissions!.find(s => s.externalKey === extKey);

    if (!existing) {
      const status: FormSubmission['status'] =
        p.status === 'RECONCILED' ? 'RECONCILED' : p.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
      state.formSubmissions!.unshift({
        id: `GF-PAY-${Date.now()}-${idx}`,
        externalKey: extKey,
        sheetRow: Number(p.sheetRow) || undefined,
        roomNumber: String(p.roomNumber || '').trim(),
        tenantName: String(p.tenantName || '').trim() || `ผู้เช่าห้อง ${p.roomNumber}`,
        amountSatang,
        billingPeriod: p.billingPeriod ? String(p.billingPeriod) : undefined,
        transferDate: String(p.transferDate || state.simulatedDate),
        transferTime: String(p.transferTime || '12:00'),
        bankAccount: state.settings.bankName || 'KBank',
        paymentCategories: p.paymentCategories ? String(p.paymentCategories) : undefined,
        slipUrl: String(p.slipUrl || ''),
        driveFileId: p.driveFileId ? String(p.driveFileId) : undefined,
        submittedAt: String(p.submittedAt || new Date().toISOString()),
        status,
        adminNote: p.notes ? String(p.notes) : undefined
      });
      changed = true;
      if (status === 'PENDING') {
        newPaymentsCount++;
      }
    } else {
      if (p.sheetRow && existing.sheetRow !== Number(p.sheetRow)) {
        existing.sheetRow = Number(p.sheetRow);
        changed = true;
      }
      // If reconciled or rejected directly on the Google Sheet while still PENDING on Dashboard, reflect it
      if (existing.status === 'PENDING' && (p.status === 'RECONCILED' || p.status === 'REJECTED')) {
        existing.status = p.status;
        existing.adminNote = existing.adminNote || 'อัปเดตสถานะจาก Google Sheet';
        changed = true;
      }
    }
  });

  const incomingRegs: any[] = Array.isArray(data.registrations) ? data.registrations : [];
  incomingRegs.forEach((r, idx) => {
    const extKey = String(r.externalKey || '').trim();
    if (!extKey) return;
    const existing = state.registrations!.find(reg => reg.externalKey === extKey);

    if (!existing) {
      const status: TenantRegistration['status'] =
        r.status === 'APPROVED' ? 'APPROVED' : r.status === 'REJECTED' ? 'REJECTED' : 'PENDING';
      const notesStr = r.notes ? String(r.notes).trim() : '';
      state.registrations!.unshift({
        id: `GF-REG-${Date.now()}-${idx}`,
        externalKey: extKey,
        sheetRow: Number(r.sheetRow) || undefined,
        requestedRoomNumber: String(r.requestedRoomNumber || '').trim(),
        tenantName: String(r.tenantName || '').trim() || `ผู้สมัครห้อง ${r.requestedRoomNumber}`,
        phone: String(r.phone || '').trim(),
        email: r.email ? String(r.email).trim() : undefined,
        lineId: '',
        vehicleType: inferVehicleFromNotes(notesStr),
        plannedMoveInDate: String(r.plannedMoveInDate || state.simulatedDate),
        notes: notesStr || undefined,
        depositPaidSatang: 0,
        status,
        submittedAt: String(r.submittedAt || new Date().toISOString())
      });
      changed = true;
      if (status === 'PENDING') {
        newRegistrationsCount++;
      }
    } else {
      if (r.sheetRow && existing.sheetRow !== Number(r.sheetRow)) {
        existing.sheetRow = Number(r.sheetRow);
        changed = true;
      }
      if (existing.status === 'PENDING' && (r.status === 'APPROVED' || r.status === 'REJECTED')) {
        existing.status = r.status;
        changed = true;
      }
    }
  });

  const finalState = changed ? await persistState(state) : state;
  const pendingPaymentsCount = (finalState.formSubmissions || []).filter(s => s.status === 'PENDING').length;
  const pendingRegistrationsCount = (finalState.registrations || []).filter(r => r.status === 'PENDING').length;

  return {
    synced: true,
    changed,
    newPaymentsCount,
    newRegistrationsCount,
    pendingPaymentsCount,
    pendingRegistrationsCount,
    dueDay: data.dueDay,
    state: finalState
  };
}

export async function refreshGoogleFormsViaBridge(): Promise<{ ok: boolean; message: string }> {
  const state = await getActiveState();
  const url = String(state.settings.googleAppsScriptUrl || '').trim();
  const token = String(state.settings.googleAppsScriptToken || '').trim();
  if (!url || !token) {
    throw new Error('กรุณาตั้งค่า Web App URL และ Token ก่อน');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'refreshForms', token })
  });
  const data = await res.json();
  if (!res.ok || !data?.ok) {
    throw new Error(data?.error || 'อัปเดตตัวเลือกเดือนใน Google Form ไม่สำเร็จ');
  }
  return { ok: true, message: data.message || 'อัปเดตวันครบกำหนดใน Google Form เรียบร้อยแล้ว' };
}

export async function approveReconcile(
  submissionId: string,
  invoiceId?: string,
  note?: string
): Promise<{ success: boolean; state: AppState; sheetSynced?: boolean; sheetWarning?: string }> {
  const state = await getActiveState();
  state.formSubmissions = state.formSubmissions || [];
  const sub = state.formSubmissions.find(s => s.id === submissionId);
  if (!sub) {
    throw new Error('ไม่พบรายการแจ้งโอนนี้');
  }
  if (sub.status !== 'PENDING') {
    throw new Error('รายการแจ้งโอนนี้ได้รับการดำเนินการไปแล้ว ไม่สามารถดำเนินการซ้ำได้');
  }

  let inv = invoiceId ? state.invoices.find(i => i.id === invoiceId) : undefined;
  if (!inv && sub.billingPeriod) {
    inv = state.invoices.find(
      i =>
        i.roomNumber === sub.roomNumber &&
        i.billingPeriod === sub.billingPeriod &&
        i.status !== 'ROLLED_OVER' &&
        i.balanceDueSatang > 0
    );
  }
  if (!inv) {
    inv = getLatestRoomInvoice(state.invoices, sub.roomNumber);
    if (inv && inv.balanceDueSatang <= 0) {
      inv = undefined;
    }
  }

  if (inv) {
    const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, state.settings);
    if (lateSatang > 0) {
      inv.lateFeeSatang = (inv.lateFeeSatang || 0) + lateSatang;
      inv.totalSatang += lateSatang;
      inv.balanceDueSatang += lateSatang;
    }

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
    } else if (rm) {
      rm.arrearsSatang = inv.balanceDueSatang;
    }

    sub.matchedInvoiceId = inv.id;
  }

  sub.status = 'RECONCILED';
  sub.reconciledAt = new Date().toISOString();
  sub.adminNote = note || 'ยืนยันยอดเงินเข้าบัญชีเรียบร้อย';

  const nextState = await persistState(state);
  const bridge = await postToGoogleBridge(nextState, {
    action: 'reconcilePayment',
    externalKey: sub.externalKey,
    sheetRow: sub.sheetRow,
    verifiedAmountBaht: sub.amountSatang / 100,
    bankRef: note || `Dashboard ${sub.transferDate} ${sub.transferTime}`
  });

  return { success: true, state: nextState, sheetSynced: bridge.synced, sheetWarning: bridge.warning };
}

export async function rejectReconcile(
  submissionId: string,
  reason?: string
): Promise<{ success: boolean; state: AppState; sheetSynced?: boolean; sheetWarning?: string }> {
  const state = await getActiveState();
  state.formSubmissions = state.formSubmissions || [];
  const sub = state.formSubmissions.find(s => s.id === submissionId);
  if (!sub) {
    throw new Error('ไม่พบรายการแจ้งโอนนี้');
  }
  if (sub.status !== 'PENDING') {
    throw new Error('รายการแจ้งโอนนี้ได้รับการดำเนินการไปแล้ว');
  }

  sub.status = 'REJECTED';
  sub.adminNote = reason || 'สลิปไม่ตรง / ตรวจสอบไม่พบยอดเงินในบัญชี';

  const nextState = await persistState(state);
  const bridge = await postToGoogleBridge(nextState, {
    action: 'rejectPayment',
    externalKey: sub.externalKey,
    sheetRow: sub.sheetRow
  });

  return { success: true, state: nextState, sheetSynced: bridge.synced, sheetWarning: bridge.warning };
}

export async function submitRegistration(payload: any): Promise<{ success: boolean; state: AppState }> {
  const state = await getActiveState();
  const {
    requestedRoomNumber,
    tenantName,
    phone,
    email,
    lineId,
    idCardNumber,
    vehicleType,
    licensePlate,
    plannedMoveInDate,
    notes,
    depositPaidSatang
  } = payload;
  state.registrations = state.registrations || [];

  const reg: TenantRegistration = {
    id: 'REG-' + Date.now(),
    requestedRoomNumber: String(requestedRoomNumber).trim(),
    tenantName: (tenantName || '').trim(),
    phone: (phone || '').trim(),
    email: email ? String(email).trim() : undefined,
    lineId: (lineId || '').trim(),
    idCardNumber: (idCardNumber || '').trim(),
    vehicleType: vehicleType || 'NONE',
    licensePlate: (licensePlate || '').trim(),
    plannedMoveInDate: plannedMoveInDate || state.simulatedDate,
    notes: notes ? String(notes).trim() : undefined,
    depositPaidSatang: Number(depositPaidSatang) || 0,
    status: 'PENDING',
    submittedAt: new Date().toISOString()
  };

  state.registrations.unshift(reg);
  const nextState = await persistState(state);
  return { success: true, state: nextState };
}

export async function approveRegistration(
  payload: any
): Promise<{ success: boolean; state: AppState; sheetSynced?: boolean; sheetWarning?: string }> {
  const state = await getActiveState();
  const {
    registrationId,
    roomNumber,
    tier,
    rentSatang,
    depositMonths,
    parkingType,
    lineId,
    startDate,
    notes,
    initWater,
    initElec,
    issueInitialInvoice,
    useProrate
  } = payload;
  state.registrations = state.registrations || [];
  const reg = state.registrations.find(r => r.id === registrationId);

  if (!reg) {
    throw new Error('ไม่พบรายการลงทะเบียนนี้');
  }
  if (reg.status !== 'PENDING') {
    throw new Error('คำขอนี้ได้รับการประมวลผลไปแล้ว');
  }

  const targetRoom = roomNumber || reg.requestedRoomNumber;
  const rm = state.rooms.find(r => r.roomNumber === targetRoom);
  if (!rm) {
    throw new Error('ไม่พบห้องพักที่ระบุ');
  }
  if (rm.status === 'OCCUPIED') {
    throw new Error(`ห้อง ${targetRoom} มีผู้เช่าอยู่แล้วในปัจจุบัน`);
  }

  const bookingCreditSatang = rm.status === 'RESERVED' ? (rm.bookingDepositSatang || 0) : 0;
  const mult = depositMonths !== undefined ? Number(depositMonths) : state.settings.defaultDepositMonths;
  const finalTier = tier || rm.tier || 'STANDARD';
  const finalRentSatang =
    Number(rentSatang) ||
    (finalTier === 'GOLD'
      ? state.settings.tierGoldSatang
      : finalTier === 'SILVER'
      ? state.settings.tierSilverSatang
      : state.settings.tierStandardSatang);
  const depositSatang = finalRentSatang * mult;
  const finalParking: ParkingType = parkingType || reg.vehicleType || 'NONE';
  const parkingFeeSatang =
    finalParking === 'CAR'
      ? state.settings.carParkingRateSatang
      : finalParking === 'BIKE'
      ? state.settings.bikeParkingRateSatang
      : 0;
  const moveInDate = startDate || reg.plannedMoveInDate || state.simulatedDate;

  const hasInitWater = initWater !== undefined && initWater !== null && initWater !== '';
  const hasInitElec = initElec !== undefined && initElec !== null && initElec !== '';
  const wVal = hasInitWater ? Number(initWater) : (rm.currWater || 0);
  const eVal = hasInitElec ? Number(initElec) : (rm.currElec || 0);

  rm.status = 'OCCUPIED';
  rm.tenantName = reg.tenantName;
  rm.phone = reg.phone;
  rm.email = reg.email || rm.email || '';
  rm.lineId = (lineId !== undefined ? String(lineId) : (reg.lineId || '')).trim();
  rm.notes = (notes !== undefined ? String(notes) : (reg.notes || '')).trim();
  rm.tier = finalTier;
  rm.rentSatang = finalRentSatang;
  rm.depositSatang = depositSatang;
  rm.bookingDepositSatang = 0;
  rm.startDate = moveInDate;
  rm.parkingType = finalParking;
  rm.parkingFeeSatang = parkingFeeSatang;
  rm.prevWater = wVal;
  rm.currWater = wVal;
  rm.prevElec = eVal;
  rm.currElec = eVal;
  rm.waterRoll = false;
  rm.elecRoll = false;
  rm.arrearsSatang = 0;

  if (issueInitialInvoice && moveInDate) {
    const pro = calcProratedRentSatang(finalRentSatang, moveInDate, state.settings.billingDay);
    const firstRentSatang = useProrate ? pro.proratedAmountSatang : finalRentSatang;
    const period = moveInDate.substring(0, 7);
    const nextDue = calcNextDueDate(moveInDate, state.settings.dueDayNextMonth || 5);
    const subtotalMoveInSatang = firstRentSatang + parkingFeeSatang;
    const discountSatang = Math.min(subtotalMoveInSatang, Math.max(0, bookingCreditSatang));
    const totalMoveInSatang = Math.max(0, subtotalMoveInSatang - discountSatang);

    state.invoices.push({
      id: `INV-${period.replace('-', '')}-${rm.roomNumber}-MOVEIN`,
      roomNumber: rm.roomNumber,
      tenantName: rm.tenantName,
      tier: rm.tier,
      billingPeriod: period,
      issueDate: moveInDate,
      dueDate: nextDue,
      rentSatang: firstRentSatang,
      parkingType: rm.parkingType,
      parkingFeeSatang,
      prevWater: rm.prevWater,
      currWater: rm.currWater,
      waterRoll: false,
      waterUnits: 0,
      waterSatang: 0,
      prevElec: rm.prevElec,
      currElec: rm.currElec,
      elecRoll: false,
      elecUnits: 0,
      elecSatang: 0,
      arrearsSatang: 0,
      lateFeeSatang: 0,
      discountSatang: discountSatang > 0 ? discountSatang : undefined,
      adjustmentNote: discountSatang > 0 ? 'หักเงินมัดจำจองล่วงหน้า' : undefined,
      totalSatang: totalMoveInSatang,
      paidSatang: 0,
      balanceDueSatang: totalMoveInSatang,
      status: totalMoveInSatang === 0 ? 'PAID' : 'ISSUED',
      payments: []
    });
  }

  reg.status = 'APPROVED';
  reg.vehicleType = finalParking;
  reg.lineId = rm.lineId;
  reg.plannedMoveInDate = moveInDate;
  reg.approvedAt = new Date().toISOString();
  reg.adminNote = targetRoom !== reg.requestedRoomNumber ? `บรรจุเข้าห้อง ${targetRoom}` : 'อนุมัติเข้าพักเรียบร้อย';

  const nextState = await persistState(state);
  const bridge = await postToGoogleBridge(nextState, {
    action: 'approveRegistration',
    externalKey: reg.externalKey,
    sheetRow: reg.sheetRow,
    roomNumber: targetRoom,
    tier: finalTier,
    parkingType: finalParking
  });

  return { success: true, state: nextState, sheetSynced: bridge.synced, sheetWarning: bridge.warning };
}

export async function rejectRegistration(
  registrationId: string,
  reason?: string
): Promise<{ success: boolean; state: AppState; sheetSynced?: boolean; sheetWarning?: string }> {
  const state = await getActiveState();
  state.registrations = state.registrations || [];
  const reg = state.registrations.find(r => r.id === registrationId);
  if (!reg) {
    throw new Error('ไม่พบรายการลงทะเบียนนี้');
  }
  if (reg.status !== 'PENDING') {
    throw new Error('คำขอนี้ได้รับการประมวลผลไปแล้ว');
  }

  reg.status = 'REJECTED';
  reg.adminNote = reason || 'ยกเลิก / ไม่ผ่านการอนุมัติ';

  const nextState = await persistState(state);
  const bridge = await postToGoogleBridge(nextState, {
    action: 'rejectRegistration',
    externalKey: reg.externalKey,
    sheetRow: reg.sheetRow,
    roomNumber: reg.requestedRoomNumber
  });

  return { success: true, state: nextState, sheetSynced: bridge.synced, sheetWarning: bridge.warning };
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
