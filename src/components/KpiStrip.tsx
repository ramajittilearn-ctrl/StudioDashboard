import React from 'react';
import { AppState } from '../types';
import { calcLateFeeSatang, formatBaht } from '../lib/finance';

interface KpiStripProps {
  state: AppState;
}

export const KpiStrip: React.FC<KpiStripProps> = ({ state }) => {
  const { rooms, invoices, expenses, settings, simulatedDate } = state;

  const occupied = rooms.filter(r => r.status === 'OCCUPIED').length;
  const available = rooms.filter(r => r.status === 'AVAILABLE').length;
  const reserved = rooms.filter(r => r.status === 'RESERVED').length;
  const maint = rooms.filter(r => r.status === 'MAINTENANCE').length;

  let totalBilledSatang = 0;
  let totalCollectedSatang = 0;
  let paidCount = 0;
  let totalOutstandingSatang = 0;
  let totalLateFeesSatang = 0;

  invoices.forEach(inv => {
    if (inv.status === 'ROLLED_OVER') return;
    const lateSatang = calcLateFeeSatang(inv, simulatedDate, settings);
    totalBilledSatang += inv.totalSatang;
    totalCollectedSatang += inv.paidSatang;
    if (inv.paidSatang > 0) paidCount++;
    if (inv.balanceDueSatang > 0) {
      totalOutstandingSatang += (inv.balanceDueSatang + lateSatang);
      totalLateFeesSatang += lateSatang;
    }
  });

  const totalExpenseSatang = expenses.reduce((acc, ex) => acc + ex.amountSatang, 0);
  const netProfitSatang = totalCollectedSatang - totalExpenseSatang;

  return (
    <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 no-print">
      {/* 1. Occupancy */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">สถานะห้องพัก (15 ห้อง)</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 mono-num">{occupied} / 15</span>
          <span className="text-[11px] text-emerald-600 font-medium">ว่าง {available} • จอง {reserved} • ซ่อม {maint}</span>
        </div>
      </div>

      {/* 2. Billed Total */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">ยอดออกบิลรอบวันที่ 25</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-slate-900 mono-num">฿{formatBaht(totalBilledSatang)}</span>
          <span className="text-[11px] text-slate-400">ไม่มีค่าส่วนกลาง</span>
        </div>
      </div>

      {/* 3. Collected Total */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">เก็บเงินได้แล้ว (Paid/Partial)</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-emerald-600 mono-num">฿{formatBaht(totalCollectedSatang)}</span>
          <span className="text-[11px] text-slate-500">รับแล้ว {paidCount} รายการ</span>
        </div>
      </div>

      {/* 4. Outstanding & Late Fee */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm">
        <div className="text-xs text-slate-500 font-medium">ยอดค้างชำระ + ค่าปรับสะสม</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className="text-xl font-bold text-rose-600 mono-num">฿{formatBaht(totalOutstandingSatang)}</span>
          <span className="text-[11px] text-rose-500 font-medium">ค่าปรับ ฿{formatBaht(totalLateFeesSatang)}</span>
        </div>
      </div>

      {/* 5. Net Profit */}
      <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-sm col-span-2 lg:col-span-1">
        <div className="text-xs text-slate-500 font-medium">กำไรสุทธิเดือนนี้ (Net P&L)</div>
        <div className="mt-1 flex items-baseline justify-between">
          <span className={`text-xl font-bold mono-num ${netProfitSatang >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
            ฿{formatBaht(netProfitSatang)}
          </span>
          <span className="text-[11px] text-slate-500">หักรายจ่าย ฿{formatBaht(totalExpenseSatang)}</span>
        </div>
      </div>
    </section>
  );
};
