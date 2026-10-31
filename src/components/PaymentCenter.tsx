import React, { useState } from 'react';
import { AppState, Invoice } from '../types';
import { calcLateFeeSatang, formatBaht } from '../lib/finance';
import { DollarSign, CheckCircle2, Clock, AlertTriangle, FileText, Paperclip, Edit3 } from 'lucide-react';

interface PaymentCenterProps {
  state: AppState;
  onOpenPaymentModal: (invoiceId: string) => void;
  onViewInvoice: (roomNumber: string) => void;
  onOpenEditInvoice: (invoiceId: string) => void;
}

export const PaymentCenter: React.FC<PaymentCenterProps> = ({
  state,
  onOpenPaymentModal,
  onViewInvoice,
  onOpenEditInvoice
}) => {
  const { invoices, settings, simulatedDate, settlements } = state;
  const [filter, setFilter] = useState<'UNPAID' | 'PAID' | 'ALL'>('UNPAID');

  const filteredInvoices = invoices.filter(inv => {
    if (inv.status === 'ROLLED_OVER') return false;
    if (filter === 'UNPAID') return inv.balanceDueSatang > 0;
    if (filter === 'PAID') return inv.balanceDueSatang === 0;
    return true;
  });

  return (
    <div className="space-y-5 no-print">
      {/* Top Banner */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ระบบรับชำระเงิน แบ่งจ่าย (Partial Payment) แนบสลิป และติดตามยอดค้างชำระ
          </h2>
          <p className="text-xs text-slate-500">
            รองรับการทยอยจ่ายหลายงวดในบิลเดียว หากเลยวันที่ {settings.dueDayNextMonth} ของเดือนถัดไปและยังมียอดคงเหลือ ระบบคำนวณค่าปรับรายวันอัตโนมัติ และยกยอดไปทบบิลวันที่ {settings.billingDay} เดือนถัดไป
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('UNPAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'UNPAID' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            รอชำระ / จ่ายบางส่วน
          </button>
          <button
            type="button"
            onClick={() => setFilter('PAID')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'PAID' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ชำระครบแล้ว
          </button>
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด
          </button>
        </div>
      </div>

      {/* Main Invoices Payments Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-200">
            <tr>
              <th className="py-3 px-3">เลขบิล / รอบ</th>
              <th className="py-3 px-3">ห้อง / ผู้เช่า</th>
              <th className="py-3 px-3 text-right">ยอดบิลตั้งต้น</th>
              <th className="py-3 px-3 text-right">ค่าปรับเกินวันที่ 5</th>
              <th className="py-3 px-3 text-right">ยอดรวมสุทธิ</th>
              <th className="py-3 px-3 text-right">จ่ายแล้ว</th>
              <th className="py-3 px-3 text-right">คงเหลือค้างจ่าย</th>
              <th className="py-3 px-3 text-center">สถานะ / ประวัติการจ่าย</th>
              <th className="py-3 px-3 text-right">จัดการ</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filteredInvoices.map(inv => {
              const lateSatang = calcLateFeeSatang(inv, simulatedDate, settings);
              const totalWithLate = inv.totalSatang + lateSatang;
              const remainingWithLate = inv.balanceDueSatang + lateSatang;

              let badge = null;
              if (inv.balanceDueSatang === 0) {
                badge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                    <CheckCircle2 className="w-3 h-3" /> ชำระครบแล้ว
                  </span>
                );
              } else if (inv.paidSatang > 0) {
                badge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                    <Clock className="w-3 h-3" /> แบ่งจ่ายแล้ว ({inv.payments.length} งวด)
                  </span>
                );
              } else if (lateSatang > 0) {
                badge = (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700">
                    <AlertTriangle className="w-3 h-3" /> ค้างชำระเกินกำหนด
                  </span>
                );
              } else {
                badge = (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-slate-100 text-slate-700">
                    รอชำระเงิน
                  </span>
                );
              }

              return (
                <tr key={inv.id} className="hover:bg-slate-50 transition">
                  <td className="py-3 px-3 font-semibold mono-num">{inv.id}</td>
                  <td className="py-3 px-3">
                    <div className="font-bold text-slate-900">
                      ห้อง {inv.roomNumber} — {inv.tenantName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      กำหนดชำระ {inv.dueDate} {inv.parkingFeeSatang > 0 ? `• จอดรถ ${formatBaht(inv.parkingFeeSatang)} บ.` : ''}
                    </div>
                  </td>
                  <td className="py-3 px-3 text-right mono-num">฿{formatBaht(inv.totalSatang)}</td>
                  <td className={`py-3 px-3 text-right mono-num ${lateSatang > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    ฿{formatBaht(lateSatang)}
                  </td>
                  <td className="py-3 px-3 text-right font-bold mono-num">฿{formatBaht(totalWithLate)}</td>
                  <td className="py-3 px-3 text-right text-emerald-700 font-semibold mono-num">
                    ฿{formatBaht(inv.paidSatang)}
                  </td>
                  <td className={`py-3 px-3 text-right font-extrabold mono-num text-sm ${remainingWithLate > 0 ? 'text-rose-600' : 'text-slate-400'}`}>
                    ฿{formatBaht(remainingWithLate)}
                  </td>
                  <td className="py-3 px-3 text-center">
                    <div>{badge}</div>
                    {inv.payments.length > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1 max-w-xs mx-auto truncate" title={inv.payments[inv.payments.length - 1].slipNote}>
                        <Paperclip className="w-2.5 h-2.5 inline mr-0.5 text-slate-400" />
                        <span>{inv.payments[inv.payments.length - 1].slipNote} ({inv.payments[inv.payments.length - 1].paidAt})</span>
                      </div>
                    )}
                  </td>
                  <td className="py-3 px-3 text-right space-x-1.5 whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenEditInvoice(inv.id)}
                      className="px-2.5 py-1.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-300 font-semibold hover:bg-amber-100 transition inline-flex items-center gap-1 text-[11px]"
                      title="แก้ไขยอดเงินในบิลนี้"
                    >
                      <Edit3 className="w-3 h-3 text-amber-700" />
                      <span>แก้ไข</span>
                    </button>
                    {remainingWithLate > 0 ? (
                      <button
                        type="button"
                        onClick={() => onOpenPaymentModal(inv.id)}
                        className="px-3 py-1.5 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-sm transition inline-flex items-center gap-1 text-[11px]"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>รับเงิน</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onViewInvoice(inv.roomNumber)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 text-slate-600 hover:bg-slate-200 transition text-[11px]"
                      >
                        ดูใบเสร็จ
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Move-Out Security Deposit Settlements History */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-rose-600" />
              <span>ประวัติใบสรุปคืนเงินประกันตอนย้ายออก (Move-Out Deposit Settlements)</span>
            </h3>
            <p className="text-xs text-slate-500">
              รายการคำนวณเงินประกันห้องหักค่าน้ำ-ไฟวันสุดท้าย ยอดค้างชำระ และค่าทำความสะอาด/ค่าเสียหาย
            </p>
          </div>
        </div>

        <div className="space-y-2">
          {settlements.length === 0 ? (
            <div className="text-xs text-slate-400 py-3 text-center">ยังไม่มีประวัติการย้ายออก</div>
          ) : (
            settlements.map(st => (
              <div
                key={st.id}
                className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-900">ห้อง {st.roomNumber} — {st.tenantName}</span>
                  <span className="text-slate-500 ml-2">วันย้ายออก: {st.moveOutDate}</span>
                  <div className="text-[11px] text-slate-600 mt-0.5">
                    เงินประกันที่ถือไว้ ฿{formatBaht(st.depositHeldSatang)} หัก (น้ำ ฿{formatBaht(st.finalWaterSatang)} + ไฟ ฿{formatBaht(st.finalElectricSatang)} + ทำความสะอาด/เสียหาย ฿{formatBaht(st.cleaningFeeSatang + st.damageFeeSatang)} + ค้างชำระ ฿{formatBaht(st.arrearsSatang)})
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">เงินประกันคืนสุทธิ</div>
                  <div className={`text-sm font-extrabold mono-num ${st.netRefundSatang >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>
                    ฿{formatBaht(st.netRefundSatang)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
