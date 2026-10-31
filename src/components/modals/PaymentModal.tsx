import React, { useState, useEffect } from 'react';
import { AppState, Invoice, PaymentMethod } from '../../types';
import { calcLateFeeSatang, formatBaht, fromSatang, toSatang } from '../../lib/finance';
import { X, Check, DollarSign } from 'lucide-react';

interface PaymentModalProps {
  invoice: Invoice | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: { invoiceId: string; amountSatang: number; method: string; slipNote: string }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  invoice,
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { settings, simulatedDate } = state;
  const lateSatang = invoice ? calcLateFeeSatang(invoice, simulatedDate, settings) : 0;
  const totalRemainingSatang = invoice ? invoice.balanceDueSatang + lateSatang : 0;

  const [amountBaht, setAmountBaht] = useState<number>(0);
  const [method, setMethod] = useState<PaymentMethod>('PromptPay QR');
  const [slipNote, setSlipNote] = useState<string>('สลิปโอนเงิน PromptPay (ตรวจสอบแล้ว)');

  useEffect(() => {
    if (!invoice) return;
    setAmountBaht(fromSatang(totalRemainingSatang));
    setMethod('PromptPay QR');
    setSlipNote('สลิปโอนเงิน PromptPay (ตรวจสอบแล้ว)');
  }, [invoice, isOpen, simulatedDate, totalRemainingSatang]);

  if (!isOpen || !invoice) return null;

  const handlePreset = (fraction: number) => {
    setAmountBaht(fromSatang(Math.round(totalRemainingSatang * fraction)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amountBaht <= 0) return;
    onSubmit({
      invoiceId: invoice.id,
      amountSatang: toSatang(amountBaht),
      method,
      slipNote: slipNote.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-indigo-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">บันทึกรับชำระเงิน / แบ่งจ่าย — ห้อง {invoice.roomNumber}</h3>
            <p className="text-[11px] text-indigo-200">
              {invoice.tenantName} • บิลรอบ {invoice.billingPeriod}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-indigo-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          {/* Summary Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5">
            <div className="flex justify-between text-slate-600">
              <span>ยอดบิลตั้งต้น:</span>
              <span className="font-semibold mono-num">฿{formatBaht(invoice.totalSatang)}</span>
            </div>
            {lateSatang > 0 && (
              <div className="flex justify-between text-rose-600 font-semibold">
                <span>บวก ค่าปรับเกินกำหนดวันที่ {settings.dueDayNextMonth}:</span>
                <span className="mono-num">+฿{formatBaht(lateSatang)}</span>
              </div>
            )}
            {invoice.paidSatang > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>หัก ชำระแล้วก่อนหน้า ({invoice.payments.length} งวด):</span>
                <span className="font-semibold mono-num">-฿{formatBaht(invoice.paidSatang)}</span>
              </div>
            )}
            <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900 text-sm">
              <span>ยอดคงเหลือค้างชำระสุทธิ:</span>
              <span className="text-rose-600 mono-num">฿{formatBaht(totalRemainingSatang)}</span>
            </div>
          </div>

          {/* Presets */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => handlePreset(1.0)}
              className="flex-1 py-2 rounded-lg border border-indigo-300 bg-indigo-50 text-indigo-800 font-bold hover:bg-indigo-100 transition"
            >
              จ่ายเต็มยอด (100%)
            </button>
            <button
              type="button"
              onClick={() => handlePreset(0.5)}
              className="flex-1 py-2 rounded-lg border border-slate-300 bg-white text-slate-700 font-semibold hover:bg-slate-100 transition"
            >
              แบ่งจ่ายครึ่งหนึ่ง (50%)
            </button>
          </div>

          {/* Amount & Method */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ยอดเงินที่รับชำระ (บาท)</label>
              <input
                type="number"
                step="0.01"
                min="1"
                max={fromSatang(totalRemainingSatang)}
                value={amountBaht}
                onChange={(e) => setAmountBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold text-emerald-700 text-base"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ช่องทางชำระเงิน</label>
              <select
                value={method}
                onChange={(e) => setMethod(e.target.value as PaymentMethod)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="PromptPay QR">สแกน PromptPay QR</option>
                <option value="โอนผ่านธนาคาร">โอนบัญชีธนาคาร</option>
                <option value="เงินสด">เงินสด</option>
              </select>
            </div>
          </div>

          {/* Slip Note */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">บันทึกสลิป / เลขอ้างอิง</label>
            <input
              type="text"
              value={slipNote}
              onChange={(e) => setSlipNote(e.target.value)}
              placeholder="เช่น สลิป KBank เวลา 14:22 น. (แนบแล้ว)"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>ยืนยันการรับชำระเงิน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
