import React from 'react';
import { AppState, Invoice } from '../types';
import { calcLateFeeSatang, formatBaht, fromSatang } from '../lib/finance';
import {
  TrendingUp,
  DollarSign,
  Users,
  AlertTriangle,
  Zap,
  Droplets,
  Car,
  PieChart,
  Calendar,
  ArrowUpRight,
  Send,
  CheckCircle2,
  Clock,
  Building,
  CreditCard,
  ShieldAlert,
  Percent
} from 'lucide-react';

interface DashboardViewProps {
  state: AppState;
  onNavigateTab: (tab: string) => void;
  onOpenPaymentModal: (invoiceId: string) => void;
  onViewInvoice: (roomNumber: string) => void;
  onSendLineNotify: (invoiceId: string) => Promise<any>;
  onOpenReconcileModal?: () => void;
  onOpenRegistrationModal?: () => void;
  onOpenBackupRecallModal?: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  state,
  onNavigateTab,
  onOpenPaymentModal,
  onViewInvoice,
  onSendLineNotify,
  onOpenReconcileModal,
  onOpenRegistrationModal,
  onOpenBackupRecallModal
}) => {
  const { rooms, invoices, expenses, settings, simulatedDate } = state;
  const pendingSubmissions = (state.formSubmissions || []).filter(s => s.status === 'PENDING');
  const pendingRegistrations = (state.registrations || []).filter(r => r.status === 'PENDING');
  const activeInvoices = invoices.filter(i => i.status !== 'ROLLED_OVER');

  // Operational metrics
  const totalRooms = 15;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE');
  const reservedRooms = rooms.filter(r => r.status === 'RESERVED');
  const maintenanceRooms = rooms.filter(r => r.status === 'MAINTENANCE');
  const occupancyRate = (occupiedRooms.length / totalRooms) * 100;

  // Financial aggregates
  let totalBilledSatang = 0;
  let totalCollectedSatang = 0;
  let totalOutstandingSatang = 0;
  let totalLateFeesSatang = 0;
  let totalRentSatang = 0;
  let totalWaterSatang = 0;
  let totalElecSatang = 0;
  let totalParkingSatang = 0;
  let totalArrearsSatang = 0;

  let totalWaterUnits = 0;
  let totalElecUnits = 0;

  const overdueInvoices: Array<{ inv: Invoice; lateSatang: number; netDueSatang: number }> = [];

  activeInvoices.forEach(inv => {
    const lateSatang = calcLateFeeSatang(inv, simulatedDate, settings);
    const netDue = inv.balanceDueSatang + lateSatang;

    totalBilledSatang += inv.totalSatang;
    totalCollectedSatang += inv.paidSatang;
    totalRentSatang += inv.rentSatang;
    totalWaterSatang += inv.waterSatang;
    totalElecSatang += inv.elecSatang;
    totalParkingSatang += (inv.parkingFeeSatang || 0);
    totalArrearsSatang += (inv.arrearsSatang || 0);
    totalLateFeesSatang += lateSatang;

    totalWaterUnits += (inv.waterUnits || 0);
    totalElecUnits += (inv.elecUnits || 0);

    if (inv.balanceDueSatang > 0) {
      totalOutstandingSatang += netDue;
      overdueInvoices.push({ inv, lateSatang, netDueSatang: netDue });
    }
  });

  const totalExpenseSatang = expenses.reduce((acc, ex) => acc + ex.amountSatang, 0);
  const netOperatingIncomeSatang = totalCollectedSatang - totalExpenseSatang;
  const collectionRate = totalBilledSatang > 0 ? (totalCollectedSatang / totalBilledSatang) * 100 : 0;
  const profitMargin = totalCollectedSatang > 0 ? (netOperatingIncomeSatang / totalCollectedSatang) * 100 : 0;

  // Sort top energy users
  const topElectricRooms = [...activeInvoices].sort((a, b) => (b.elecUnits || 0) - (a.elecUnits || 0)).slice(0, 3);
  const topWaterRooms = [...activeInvoices].sort((a, b) => (b.waterUnits || 0) - (a.waterUnits || 0)).slice(0, 3);

  // Revenue stream shares
  const safeTotalBilled = totalBilledSatang > 0 ? totalBilledSatang : 1;
  const rentPct = Math.round((totalRentSatang / safeTotalBilled) * 100);
  const elecPct = Math.round((totalElecSatang / safeTotalBilled) * 100);
  const waterPct = Math.round((totalWaterSatang / safeTotalBilled) * 100);
  const parkPct = Math.round((totalParkingSatang / safeTotalBilled) * 100);
  const arrearsPct = Math.max(0, 100 - (rentPct + elecPct + waterPct + parkPct));

  return (
    <div className="space-y-6">
      {/* Pending Google Form Payment Slips Alert Banner */}
      {pendingSubmissions.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-transparent border border-amber-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 flex items-center justify-center font-bold text-base shrink-0 animate-pulse">
              💳
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>แจ้งชำระเงินจาก Google Form: มี {pendingSubmissions.length} สลิปใหม่รอตรวจสอบ</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/30 text-amber-200 border border-amber-500/40 font-semibold">
                  รอ Reconcile
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                มีผู้เช่าแนบสลิปผ่าน Google Form เพื่อกระทบยอดเงินเข้าบัญชีธนาคาร ตรวจสอบและตัดยอดบิลได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenReconcileModal}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <span>เปิดตรวจสลิป & ตัดยอด ({pendingSubmissions.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Pending Tenant Registrations Alert Banner */}
      {pendingRegistrations.length > 0 && (
        <div className="bg-gradient-to-r from-sky-500/20 via-sky-500/10 to-transparent border border-sky-500/40 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/40 flex items-center justify-center font-bold text-base shrink-0 animate-bounce">
              🔔
            </div>
            <div>
              <div className="font-bold text-white text-sm flex items-center gap-2">
                <span>คำขอลงทะเบียนผู้เช่าใหม่: มี {pendingRegistrations.length} คำขอรออนุมัติ</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] bg-sky-500/30 text-sky-200 border border-sky-500/40 font-semibold">
                  รอเข้าห้อง
                </span>
              </div>
              <p className="text-slate-300 text-[11px] mt-0.5">
                ผู้เช่ากรอกข้อมูลสมัครเข้าพัก ตรวจสอบห้องว่างและกดยืนยันเพื่อบันทึกเข้าห้องพักได้ทันที
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenRegistrationModal}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold shadow-md transition flex items-center gap-1.5 shrink-0"
          >
            <span>ตรวจสอบคำขอลงทะเบียน ({pendingRegistrations.length})</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 1. Header Banner & Welcome */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-5 sm:p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute -right-8 -bottom-8 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              <span>ระบบบริหารจัดการหอพักแบบเรียลไทม์ (Live Dashboard)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white mt-1">
              ภาพรวมผลการดำเนินงาน & บัญชีการเงิน {settings.apartmentName}
            </h2>
            <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
              ติดตามยอดรับเงินสด ค่าเช่า ค่าน้ำ-ไฟ ค่าจอดรถ และอัตราการชำระเงินของ 15 ห้องพักอย่างแม่นยำ คำนวณเป็นหน่วยสตางค์และซิงก์ข้อมูลบน Google Cloud Firebase อัตโนมัติ
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {onOpenReconcileModal && (
              <button
                type="button"
                onClick={onOpenReconcileModal}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5"
                title="เปิดถาดตรวจสลิป Google Form"
              >
                <span>💳 สลิป Google Form</span>
                {pendingSubmissions.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                    {pendingSubmissions.length}
                  </span>
                )}
              </button>
            )}

            {onOpenRegistrationModal && (
              <button
                type="button"
                onClick={onOpenRegistrationModal}
                className="px-3.5 py-2 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5"
                title="จัดการคำขอลงทะเบียนผู้เช่าใหม่"
              >
                <span>🔔 ลงทะเบียนใหม่</span>
                {pendingRegistrations.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
                    {pendingRegistrations.length}
                  </span>
                )}
              </button>
            )}

            {onOpenBackupRecallModal && (
              <button
                type="button"
                onClick={onOpenBackupRecallModal}
                className="px-3.5 py-2 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5"
                title="สำรองข้อมูลรายสัปดาห์ / กู้คืนข้อมูล (Recall)"
              >
                <span>💾 สำรอง/กู้คืน</span>
              </button>
            )}

            <button
              type="button"
              onClick={() => onNavigateTab('billing')}
              className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow-md transition flex items-center gap-1.5"
            >
              <Zap className="w-4 h-4" />
              <span>จดมิเตอร์ 25 ต.ค.</span>
            </button>
            <button
              type="button"
              onClick={() => onNavigateTab('invoices')}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-semibold backdrop-blur-xs transition flex items-center gap-1.5"
            >
              <Send className="w-4 h-4 text-emerald-300" />
              <span>ส่งบิล LINE & QR</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Primary 4-Metric Command Center */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Cash Inflow */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">เงินสดเข้ากระเป๋าแล้ว (Collected)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600 mono-num">
              ฿{formatBaht(totalCollectedSatang)}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mono-num">
              {collectionRate.toFixed(1)}% เก็บแล้ว
            </span>
          </div>
          {/* Progress Bar */}
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, collectionRate))}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>เป้าหมายยอดบิลทั้งหมด:</span>
            <span className="font-semibold text-slate-800 mono-num">฿{formatBaht(totalBilledSatang)}</span>
          </div>
        </div>

        {/* Metric 2: Overdue Receivables */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">ยอดค้างชำระ + ค่าปรับ (Overdue)</span>
            <div className="w-8 h-8 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-rose-600 mono-num">
              ฿{formatBaht(totalOutstandingSatang)}
            </span>
            <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full mono-num">
              {overdueInvoices.length} ห้องค้าง
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-rose-500 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, (totalOutstandingSatang / (safeTotalBilled || 1)) * 100))}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>รวมค่าปรับรายวันสะสม:</span>
            <span className="font-semibold text-rose-600 mono-num">฿{formatBaht(totalLateFeesSatang)}</span>
          </div>
        </div>

        {/* Metric 3: Net Operating Profit */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">กำไรดำเนินงานสุทธิ (Net P&L)</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className={`text-2xl font-black mono-num ${netOperatingIncomeSatang >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
              ฿{formatBaht(netOperatingIncomeSatang)}
            </span>
            <span className="text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full mono-num">
              {profitMargin.toFixed(0)}% Margin
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-indigo-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, Math.max(0, profitMargin))}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>หักค่าใช้จ่ายตึกแล้ว:</span>
            <span className="font-semibold text-slate-700 mono-num">-฿{formatBaht(totalExpenseSatang)}</span>
          </div>
        </div>

        {/* Metric 4: Occupancy Health */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-500 font-semibold">อัตราการเข้าพัก (Occupancy Rate)</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900 mono-num">
              {occupiedRooms.length} / {totalRooms}
            </span>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full mono-num">
              {occupancyRate.toFixed(0)}% เต็ม
            </span>
          </div>
          <div className="w-full bg-slate-100 rounded-full h-1.5 mt-3 overflow-hidden">
            <div
              className="bg-emerald-600 h-1.5 rounded-full transition-all duration-500"
              style={{ width: `${occupancyRate}%` }}
            />
          </div>
          <div className="mt-2 text-[11px] text-slate-500 flex justify-between">
            <span>ห้องว่างพร้อมเช่า:</span>
            <span className="font-bold text-emerald-600 mono-num">{availableRooms.length} ห้อง ({reservedRooms.length} จอง, {maintenanceRooms.length} ซ่อม)</span>
          </div>
        </div>
      </div>

      {/* 3. Deep Dive Analytics Grid (2 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Revenue Composition & Cash Flow Breakdown */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <span>สัดส่วนโครงสร้างรายได้ประจำงวด (Revenue Streams)</span>
              </h3>
              <p className="text-xs text-slate-500">
                แยกตามค่าเช่า ค่าไฟ ค่าน้ำ ค่าจอดรถ และยอดค้างชำระ
              </p>
            </div>
            <span className="text-xs font-bold text-slate-900 mono-num">
              รวม ฿{formatBaht(totalBilledSatang)}
            </span>
          </div>

          {/* Stacked Visual Bar */}
          <div className="space-y-1.5">
            <div className="h-4 w-full rounded-xl overflow-hidden flex bg-slate-100">
              <div style={{ width: `${rentPct}%` }} className="bg-indigo-600 h-full" title={`ค่าเช่า ${rentPct}%`} />
              <div style={{ width: `${elecPct}%` }} className="bg-amber-500 h-full" title={`ค่าไฟ ${elecPct}%`} />
              <div style={{ width: `${waterPct}%` }} className="bg-sky-500 h-full" title={`ค่าน้ำ ${waterPct}%`} />
              <div style={{ width: `${parkPct}%` }} className="bg-emerald-500 h-full" title={`ค่าจอดรถ ${parkPct}%`} />
              <div style={{ width: `${arrearsPct}%` }} className="bg-rose-500 h-full" title={`ยอดค้าง ${arrearsPct}%`} />
            </div>
            <div className="text-[10px] text-slate-400 text-right">
              ค่าเช่า {rentPct}% • ค่าไฟ {elecPct}% • ค่าน้ำ {waterPct}% • จอดรถ {parkPct}% • ค้าง {arrearsPct}%
            </div>
          </div>

          {/* Detailed Stream Breakdown Table */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span className="text-[11px] text-slate-500 font-medium block">🏢 ค่าเช่าห้องพัก</span>
              <span className="text-sm font-bold text-indigo-900 mono-num block mt-0.5">
                ฿{formatBaht(totalRentSatang)}
              </span>
              <span className="text-[10px] text-indigo-600 font-semibold">{rentPct}% ของยอดบิล</span>
            </div>

            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-100">
              <span className="text-[11px] text-amber-900 font-medium block">⚡ ค่าไฟฟ้า</span>
              <span className="text-sm font-bold text-amber-900 mono-num block mt-0.5">
                ฿{formatBaht(totalElecSatang)}
              </span>
              <span className="text-[10px] text-amber-700 font-semibold">{totalElecUnits} หน่วย ({elecPct}%)</span>
            </div>

            <div className="bg-sky-50/60 p-3 rounded-xl border border-sky-100">
              <span className="text-[11px] text-sky-900 font-medium block">💧 ค่าน้ำประปา</span>
              <span className="text-sm font-bold text-sky-900 mono-num block mt-0.5">
                ฿{formatBaht(totalWaterSatang)}
              </span>
              <span className="text-[10px] text-sky-700 font-semibold">{totalWaterUnits} หน่วย ({waterPct}%)</span>
            </div>

            <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-100">
              <span className="text-[11px] text-emerald-900 font-medium block">🚗 ค่าจอดรถ</span>
              <span className="text-sm font-bold text-emerald-900 mono-num block mt-0.5">
                ฿{formatBaht(totalParkingSatang)}
              </span>
              <span className="text-[10px] text-emerald-700 font-semibold">รถยนต์ & มอเตอร์ไซค์</span>
            </div>
          </div>

          {/* Cash Flow Summary Table */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs">
            <div className="flex justify-between items-center text-slate-300">
              <span>รายรับที่เรียกเก็บได้จริงในรอบนี้ (Gross Cash In):</span>
              <span className="font-bold text-emerald-400 mono-num">+฿{formatBaht(totalCollectedSatang)}</span>
            </div>
            <div className="flex justify-between items-center text-slate-300">
              <span>หัก ค่าใช้จ่ายดำเนินงาน & ซ่อมบำรุงส่วนกลาง:</span>
              <span className="font-bold text-rose-400 mono-num">-฿{formatBaht(totalExpenseSatang)}</span>
            </div>
            <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline font-bold text-sm">
              <span className="text-white">กำไรสุทธิคงเหลือ (Net Operating Profit):</span>
              <span className={`text-base font-black mono-num ${netOperatingIncomeSatang >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
                ฿{formatBaht(netOperatingIncomeSatang)}
              </span>
            </div>
          </div>
        </div>

        {/* Right Column: Utility Consumption & Energy Watch */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>การใช้พลังงานและสาธารณูปโภค (Utility Insights)</span>
              </h3>
              <p className="text-xs text-slate-500">
                สถิติการใช้ไฟฟ้ารวมและตรวจจับห้องที่ใช้เกินเกณฑ์
              </p>
            </div>
          </div>

          {/* Electric and Water Top Stats */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/70">
              <div className="flex items-center gap-1.5 text-xs text-amber-900 font-bold">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>การใช้ไฟฟ้ารวม</span>
              </div>
              <div className="text-xl font-black text-amber-900 mono-num mt-1">
                {totalElecUnits} <span className="text-xs font-normal">หน่วย</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                เฉลี่ย {occupiedRooms.length > 0 ? (totalElecUnits / occupiedRooms.length).toFixed(0) : 0} หน่วย/ห้อง
              </div>
            </div>

            <div className="bg-sky-50/50 p-3.5 rounded-xl border border-sky-200/70">
              <div className="flex items-center gap-1.5 text-xs text-sky-900 font-bold">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                <span>การใช้น้ำประปารวม</span>
              </div>
              <div className="text-xl font-black text-sky-900 mono-num mt-1">
                {totalWaterUnits} <span className="text-xs font-normal">หน่วย</span>
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">
                เฉลี่ย {occupiedRooms.length > 0 ? (totalWaterUnits / occupiedRooms.length).toFixed(0) : 0} หน่วย/ห้อง
              </div>
            </div>
          </div>

          {/* Top Energy Consumer Rooms */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">⚡ ห้องที่ใช้ไฟฟ้าสูงสุด 3 อันดับแรก:</span>
            <div className="space-y-1.5">
              {topElectricRooms.map((inv, idx) => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-[10px] font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">ห้อง {inv.roomNumber}</span>
                    <span className="text-slate-500 truncate max-w-[110px] text-[11px]">{inv.tenantName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-amber-800 mono-num">{inv.elecUnits} หน่วย</span>
                    <span className="text-[10px] text-slate-400 block mono-num">฿{formatBaht(inv.elecSatang)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Water Consumer Rooms */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">💧 ห้องที่ใช้น้ำสูงสุด 3 อันดับแรก:</span>
            <div className="space-y-1.5">
              {topWaterRooms.map((inv, idx) => (
                <div key={inv.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-100 text-sky-700 text-[10px] font-bold flex items-center justify-center">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">ห้อง {inv.roomNumber}</span>
                    <span className="text-slate-500 truncate max-w-[110px] text-[11px]">{inv.tenantName}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-sky-800 mono-num">{inv.waterUnits} หน่วย</span>
                    <span className="text-[10px] text-slate-400 block mono-num">฿{formatBaht(inv.waterSatang)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 4. Actionable Overdue Receivables Watchlist */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>ห้องที่ยังค้างชำระ & สรุปยอดรอติดตาม ({overdueInvoices.length} ห้อง)</span>
            </h3>
            <p className="text-xs text-slate-500">
              กดปุ่มเพื่อดูบิล ส่งแจ้งเตือนผ่าน LINE หรือบันทึกแบ่งจ่ายได้ทันที
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('payments')}
            className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1"
          >
            <span>ดูตารางรับเงินทั้งหมด</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        {overdueInvoices.length === 0 ? (
          <div className="py-8 text-center text-xs text-emerald-700 bg-emerald-50/50 rounded-xl border border-emerald-100 flex flex-col items-center justify-center gap-1.5">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
            <span className="font-bold text-sm">ยอดเยี่ยม! ทุกห้องชำระเงินครบถ้วนแล้ว</span>
            <span className="text-slate-500">ไม่มีห้องค้างชำระในรอบบิลปัจจุบัน</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">ห้อง</th>
                  <th className="py-2.5 px-3">ผู้เช่า / แพ็กเกจ</th>
                  <th className="py-2.5 px-3 text-right">ยอดบิลตั้งต้น</th>
                  <th className="py-2.5 px-3 text-right">ค่าปรับเกินกำหนด</th>
                  <th className="py-2.5 px-3 text-right">จ่ายแล้ว</th>
                  <th className="py-2.5 px-3 text-right">ยอดคงเหลือสุทธิ</th>
                  <th className="py-2.5 px-3 text-center">สถานะ</th>
                  <th className="py-2.5 px-3 text-right">การจัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {overdueInvoices.map(({ inv, lateSatang, netDueSatang }) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition">
                    <td className="py-2.5 px-3 font-extrabold text-slate-900 mono-num text-sm">
                      ห้อง {inv.roomNumber}
                    </td>
                    <td className="py-2.5 px-3">
                      <div className="font-bold text-slate-800">{inv.tenantName}</div>
                      <div className="text-[11px] text-slate-500">{inv.tier} • กำหนดชำระ {inv.dueDate}</div>
                    </td>
                    <td className="py-2.5 px-3 text-right mono-num">
                      ฿{formatBaht(inv.totalSatang)}
                    </td>
                    <td className={`py-2.5 px-3 text-right mono-num ${lateSatang > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                      ฿{formatBaht(lateSatang)}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold mono-num">
                      ฿{formatBaht(inv.paidSatang)}
                    </td>
                    <td className="py-2.5 px-3 text-right font-black mono-num text-rose-600 text-sm">
                      ฿{formatBaht(netDueSatang)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {lateSatang > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          เลยกำหนดวันที่ 5
                        </span>
                      ) : inv.paidSatang > 0 ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          แบ่งจ่าย ({inv.payments.length} งวด)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                          รอชำระ
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-right space-x-1.5 whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => onViewInvoice(inv.roomNumber)}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition text-[11px]"
                      >
                        บิล LINE
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(inv.id)}
                        className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition text-[11px]"
                      >
                        รับเงิน
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 5. Billing Cycle Roadmap & Automated Timeline */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-sm space-y-3">
        <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>วงจรรอบบิลหอพักประจำเดือน (Billing & Automation Timeline)</span>
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs pt-1">
          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-emerald-400 font-bold block">1. วันที่ 25 ของเดือน</span>
            <span className="text-slate-300 font-medium block mt-0.5">ตัดรอบบิล & จดมิเตอร์</span>
            <p className="text-[11px] text-slate-400 mt-1">
              คีย์เลขมิเตอร์น้ำไฟใหม่ ระบบจำเลขเก่าให้อัตโนมัติและออกบิล 15 ห้อง
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-sky-400 font-bold block">2. วันที่ 26 – วันที่ 4</span>
            <span className="text-slate-300 font-medium block mt-0.5">ส่งบิล & ผู้เช่าโอนเงิน</span>
            <p className="text-[11px] text-slate-400 mt-1">
              ส่งการ์ด LINE พร้อมสแกน QR PromptPay หรือพิมพ์สลิปสอดใต้ประตู
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-amber-400 font-bold block">3. วันที่ 5 ของเดือนถัดไป</span>
            <span className="text-slate-300 font-medium block mt-0.5">วันครบกำหนดชำระ (Due Date)</span>
            <p className="text-[11px] text-slate-400 mt-1">
              วันสุดท้ายของการชำระเงินตามปกติโดยไม่มีค่าปรับล่าช้า
            </p>
          </div>

          <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/80">
            <span className="text-rose-400 font-bold block">4. วันที่ 6 เป็นต้นไป</span>
            <span className="text-slate-300 font-medium block mt-0.5">คิดค่าปรับ 50 บาท/วัน</span>
            <p className="text-[11px] text-slate-400 mt-1">
              ระบบคำนวณค่าปรับรายวันอัตโนมัติ และยกยอดค้างไปทบรอบถัดไป
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
