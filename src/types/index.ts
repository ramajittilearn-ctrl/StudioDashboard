export type RoomStatus = 'AVAILABLE' | 'OCCUPIED' | 'RESERVED' | 'MAINTENANCE';
export type PackageTier = 'STANDARD' | 'SILVER' | 'GOLD' | 'CUSTOM';
export type ParkingType = 'NONE' | 'BIKE' | 'CAR';
export type InvoiceStatus = 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'ROLLED_OVER';
export type PaymentMethod = 'PromptPay QR' | 'โอนผ่านธนาคาร' | 'เงินสด';

export interface PropertySettings {
  apartmentName: string;
  electricityRateSatang: number; // 650 = 6.50 THB
  waterRateSatang: number;       // 1000 = 10.00 THB
  commonFeeSatang: number;      // 0 = 0 THB (no common fee)
  carParkingRateSatang: number; // 50000 = 500 THB
  bikeParkingRateSatang: number;// 10000 = 100 THB
  billingDay: number;           // 25
  dueDayNextMonth: number;      // 5
  dailyLateFeeSatang: number;   // 5000 = 50 THB/day
  defaultDepositMonths: number; // 1 or 2
  promptPayId: string;          // Mobile or Tax ID
  bankName: string;
  bankAccount: string;
  bankOwner: string;
  contactInfo: string;
  tierStandardSatang: number;   // 250000 = 2,500 THB
  tierSilverSatang: number;     // 300000 = 3,000 THB
  tierGoldSatang: number;       // 350000 = 3,500 THB
  lineChannelAccessToken?: string;
  lineDestinationId?: string;   // Target user or group ID
}

export interface Room {
  roomNumber: string; // "101" .. "305"
  floor: number;      // 1, 2, 3
  status: RoomStatus;
  tier: PackageTier;
  rentSatang: number;
  depositSatang: number;
  tenantName: string;
  phone: string;
  lineId?: string;
  startDate?: string;
  parkingType: ParkingType;
  parkingFeeSatang: number;
  bookingDepositSatang?: number;
  prevWater: number;
  currWater: number;
  waterRoll: boolean;
  prevElec: number;
  currElec: number;
  elecRoll: boolean;
  arrearsSatang: number;
}

export interface PaymentRecord {
  id: string;
  paidAt: string;
  amountSatang: number;
  method: PaymentMethod;
  slipNote: string;
}

export interface Invoice {
  id: string;
  roomNumber: string;
  tenantName: string;
  tier: PackageTier;
  billingPeriod: string; // "2026-10"
  issueDate: string;    // "2026-10-25"
  dueDate: string;      // "2026-11-05"
  rentSatang: number;
  parkingType: ParkingType;
  parkingFeeSatang: number;
  prevWater: number;
  currWater: number;
  waterRoll: boolean;
  waterUnits: number;
  waterSatang: number;
  prevElec: number;
  currElec: number;
  elecRoll: boolean;
  elecUnits: number;
  elecSatang: number;
  arrearsSatang: number;
  arrearsMonthsCount?: number;
  lateFeeSatang: number;
  discountSatang?: number;
  adjustmentNote?: string;
  totalSatang: number;
  paidSatang: number;
  balanceDueSatang: number;
  status: InvoiceStatus;
  payments: PaymentRecord[];
  lineSentAt?: string;
}

export interface Expense {
  id: string;
  date: string;
  category: 'ซ่อมบำรุง' | 'ค่าไฟ/น้ำส่วนกลางตึก' | 'ทำความสะอาด' | 'อุปกรณ์หอพัก';
  title: string;
  amountSatang: number;
}

export interface Settlement {
  id: string;
  roomNumber: string;
  tenantName: string;
  moveOutDate: string;
  depositHeldSatang: number;
  finalWaterSatang: number;
  finalElectricSatang: number;
  cleaningFeeSatang: number;
  damageFeeSatang: number;
  arrearsSatang: number;
  netRefundSatang: number;
}

export interface FormSubmission {
  id: string;
  roomNumber: string;
  tenantName: string;
  amountSatang: number;
  transferDate: string;
  transferTime: string;
  bankAccount: string;
  slipUrl: string; // URL or Base64 DataURL
  submittedAt: string;
  status: 'PENDING' | 'RECONCILED' | 'REJECTED';
  matchedInvoiceId?: string;
  adminNote?: string;
  reconciledAt?: string;
}

export interface TenantRegistration {
  id: string;
  requestedRoomNumber: string;
  tenantName: string;
  phone: string;
  lineId?: string;
  idCardNumber?: string;
  vehicleType: ParkingType;
  licensePlate?: string;
  plannedMoveInDate: string;
  depositPaidSatang: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  submittedAt: string;
  approvedAt?: string;
  adminNote?: string;
}

export interface MoveOutArchive {
  id: string;
  roomNumber: string;
  tenantName: string;
  phone: string;
  lineId?: string;
  moveInDate: string;
  moveOutDate: string;
  depositSatang: number;
  finalWaterReading: number;
  finalElecReading: number;
  finalWaterSatang: number;
  finalElecSatang: number;
  cleaningFeeSatang: number;
  damageFeeSatang: number;
  arrearsDeductedSatang: number;
  netRefundSatang: number;
  deductionNote: string;
  createdAt: string;
}

export interface BackupSnapshot {
  id: string;
  timestamp: string;
  name: string;
  tag: 'DAY_ONE' | 'WEEKLY_AUTO' | 'MANUAL';
  roomsCount: number;
  invoicesCount: number;
  stateData: string; // JSON string of state
}

export interface AppState {
  simulatedDate: string;
  settings: PropertySettings;
  rooms: Room[];
  invoices: Invoice[];
  expenses: Expense[];
  settlements: Settlement[];
  formSubmissions?: FormSubmission[];
  registrations?: TenantRegistration[];
  moveOutArchives?: MoveOutArchive[];
  backups?: BackupSnapshot[];
  lastBackupDate?: string;
}
