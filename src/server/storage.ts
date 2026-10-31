import fs from 'fs';
import path from 'path';
import { AppState, Invoice, PropertySettings, Room } from '../types';
import { calcMeterUnits } from '../lib/finance';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STATE_FILE = path.join(DATA_DIR, 'dormitory_state.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');

export function createInitialSeedState(): AppState {
  const settings: PropertySettings = {
    apartmentName: 'Taky Apartment',
    electricityRateSatang: 650,  // 6.50 THB/unit
    waterRateSatang: 1000,       // 10.00 THB/unit (no minimum)
    commonFeeSatang: 0,          // 0 THB (no common fee)
    carParkingRateSatang: 50000, // 500 THB/month
    bikeParkingRateSatang: 10000,// 100 THB/month
    billingDay: 25,
    dueDayNextMonth: 5,
    dailyLateFeeSatang: 5000,    // 50 THB/day after 5th
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
    // Floor 1
    { roomNumber: '101', floor: 1, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณสมศักดิ์ มีสุข', phone: '081-412-8891', lineId: 'somsak.m', startDate: '2026-03-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 120, currWater: 128, waterRoll: false, prevElec: 1450, currElec: 1565, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '102', floor: 1, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณวิภาดา สายชล', phone: '089-221-3344', lineId: 'wipada.s', startDate: '2026-04-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 85, currWater: 92, waterRoll: false, prevElec: 980, currElec: 1110, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '103', floor: 1, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 700000, tenantName: 'คุณณัฐพล คนขยัน', phone: '086-778-9012', lineId: 'nattapon.k', startDate: '2026-02-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 210, currWater: 219, waterRoll: false, prevElec: 2310, currElec: 2465, elecRoll: false, arrearsSatang: 120000 },
    { roomNumber: '104', floor: 1, status: 'RESERVED', tier: 'SILVER', rentSatang: 300000, depositSatang: 0, tenantName: 'คุณกานดา (จองแล้ว)', phone: '082-991-1122', lineId: 'kanda.99', startDate: '2026-11-01', parkingType: 'BIKE', parkingFeeSatang: 10000, bookingDepositSatang: 100000, prevWater: 64, currWater: 64, waterRoll: false, prevElec: 620, currElec: 620, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '105', floor: 1, status: 'AVAILABLE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: '', phone: '', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 40, currWater: 40, waterRoll: false, prevElec: 510, currElec: 510, elecRoll: false, arrearsSatang: 0 },

    // Floor 2
    { roomNumber: '201', floor: 2, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณปิยะพงษ์ วงศ์คำ', phone: '084-556-7788', lineId: 'piyapong.w', startDate: '2026-05-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 150, currWater: 156, waterRoll: false, prevElec: 1890, currElec: 1985, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '202', floor: 2, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณมณีรัตน์ ทองดี', phone: '081-990-4512', lineId: 'manirat.t', startDate: '2026-01-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 310, currWater: 318, waterRoll: false, prevElec: 9985, currElec: 65, elecRoll: true, arrearsSatang: 0 },
    { roomNumber: '203', floor: 2, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณอนุชา ศรีสวัสดิ์', phone: '083-114-5678', lineId: 'anucha.s', startDate: '2026-06-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 95, currWater: 103, waterRoll: false, prevElec: 1200, currElec: 1345, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '204', floor: 2, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณชลธิชา นาคิน', phone: '089-654-3210', lineId: 'chonthicha.n', startDate: '2026-07-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 72, currWater: 79, waterRoll: false, prevElec: 840, currElec: 950, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '205', floor: 2, status: 'MAINTENANCE', tier: 'STANDARD', rentSatang: 250000, depositSatang: 0, tenantName: 'ซ่อมแอร์ / ทาสีใหม่', phone: '-', lineId: '', startDate: '', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 110, currWater: 110, waterRoll: false, prevElec: 1320, currElec: 1320, elecRoll: false, arrearsSatang: 0 },

    // Floor 3
    { roomNumber: '301', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 700000, tenantName: 'คุณธนกฤต พัฒนา', phone: '081-777-2345', lineId: 'thanakrit.p', startDate: '2026-03-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 180, currWater: 188, waterRoll: false, prevElec: 2100, currElec: 2240, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '302', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณอารยา ใจงาม', phone: '085-332-1987', lineId: 'araya.j', startDate: '2026-05-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 140, currWater: 146, waterRoll: false, prevElec: 1650, currElec: 1790, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '303', floor: 3, status: 'OCCUPIED', tier: 'SILVER', rentSatang: 300000, depositSatang: 300000, tenantName: 'คุณวรพจน์ สุขสันต์', phone: '087-889-0011', lineId: 'worapoj.s', startDate: '2026-08-01', parkingType: 'BIKE', parkingFeeSatang: 10000, prevWater: 54, currWater: 60, waterRoll: false, prevElec: 590, currElec: 695, elecRoll: false, arrearsSatang: 85000 },
    { roomNumber: '304', floor: 3, status: 'OCCUPIED', tier: 'STANDARD', rentSatang: 250000, depositSatang: 250000, tenantName: 'คุณสุดาพร อินทร์จันทร์', phone: '082-445-6677', lineId: 'sudaporn.i', startDate: '2026-09-01', parkingType: 'NONE', parkingFeeSatang: 0, prevWater: 33, currWater: 39, waterRoll: false, prevElec: 410, currElec: 500, elecRoll: false, arrearsSatang: 0 },
    { roomNumber: '305', floor: 3, status: 'OCCUPIED', tier: 'GOLD', rentSatang: 350000, depositSatang: 350000, tenantName: 'คุณกิตติพงศ์ ยิ่งเจริญ', phone: '080-123-9876', lineId: 'kittipong.y', startDate: '2026-04-01', parkingType: 'CAR', parkingFeeSatang: 50000, prevWater: 165, currWater: 174, waterRoll: false, prevElec: 1920, currElec: 2050, elecRoll: false, arrearsSatang: 0 }
  ];

  // Invoices for 12 occupied rooms as of 25 Oct 2026
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
      paidSatang = 200000; // จ่ายบางส่วน 2,000 บ.
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
    lastBackupDate: new Date().toISOString()
  };
}

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

  dayOneState.backups![0].stateData = JSON.stringify(dayOneState);
  return dayOneState;
}

export function loadAppState(): AppState {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }

    if (fs.existsSync(STATE_FILE)) {
      const raw = fs.readFileSync(STATE_FILE, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length === 15) {
        // Ensure new arrays exist
        parsed.formSubmissions = parsed.formSubmissions || [];
        parsed.registrations = parsed.registrations || [];
        parsed.moveOutArchives = parsed.moveOutArchives || [];
        parsed.backups = parsed.backups || [];
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to load state from disk, using Day-One state:', err);
  }

  const initial = createDayOneState();
  saveAppState(initial);
  return initial;
}

export function saveAppState(state: AppState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    state.lastBackupDate = new Date().toISOString();
    const tempFile = STATE_FILE + '.tmp';
    fs.writeFileSync(tempFile, JSON.stringify(state, null, 2), 'utf-8');
    fs.renameSync(tempFile, STATE_FILE);
  } catch (err) {
    console.error('Failed to write state file:', err);
  }
}

export function createBackupSnapshot(state: AppState, tag: 'DAY_ONE' | 'WEEKLY_AUTO' | 'MANUAL' = 'MANUAL', customName?: string): string {
  try {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
    const now = new Date();
    const timestamp = now.toISOString().replace(/[:.]/g, '-');
    const backupId = `SNAP-${Date.now()}`;
    const name = customName || (tag === 'WEEKLY_AUTO' ? `สำรองรายสัปดาห์อัตโนมัติ (${now.toLocaleDateString('th-TH')})` : `สำรองข้อมูลโดย Admin (${now.toLocaleTimeString('th-TH')})`);

    const snapshot = {
      id: backupId,
      timestamp: now.toISOString(),
      name,
      tag,
      roomsCount: state.rooms.length,
      invoicesCount: state.invoices.length,
      stateData: JSON.stringify(state)
    };

    state.backups = state.backups || [];
    // Keep max 20 snapshots in state
    state.backups.unshift(snapshot);
    if (state.backups.length > 20) {
      state.backups = state.backups.slice(0, 20);
    }

    const backupFile = path.join(BACKUPS_DIR, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(state, null, 2), 'utf-8');
    return backupFile;
  } catch (err) {
    console.error('Failed to create backup snapshot:', err);
    return '';
  }
}
