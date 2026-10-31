import React, { useState, useEffect } from 'react';
import { AppState, Invoice } from '../../types';
import { calcMeterUnits, formatBaht, fromSatang, toSatang } from '../../lib/finance';
import { X, Check, Edit3, DollarSign, Tag, AlertCircle, Droplets, Zap, Car } from 'lucide-react';

interface EditInvoiceModalProps {
  invoice: Invoice | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

export const EditInvoiceModal: React.FC<EditInvoiceModalProps> = ({
  invoice,
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { settings } = state;

  const [rentBaht, setRentBaht] = useState<number>(0);
  const [parkingFeeBaht, setParkingFeeBaht] = useState<number>(0);
  
  // Water
  const [prevWater, setPrevWater] = useState<number>(0);
  const [currWater, setCurrWater] = useState<number>(0);
  const [waterRoll, setWaterRoll] = useState<boolean>(false);
  const [waterBaht, setWaterBaht] = useState<number>(0);
  const [customWaterMoney, setCustomWaterMoney] = useState<boolean>(false);

  // Electric
  const [prevElec, setPrevElec] = useState<number>(0);
  const [currElec, setCurrElec] = useState<number>(0);
  const [elecRoll, setElecRoll] = useState<boolean>(false);
  const [elecBaht, setElecBaht] = useState<number>(0);
  const [customElecMoney, setCustomElecMoney] = useState<boolean>(false);

  // Arrears & Late
  const [arrearsBaht, setArrearsBaht] = useState<number>(0);
  const [lateFeeBaht, setLateFeeBaht] = useState<number>(0);

  // Discount / Adjustment
  const [discountBaht, setDiscountBaht] = useState<number>(0);
  const [adjustmentNote, setAdjustmentNote] = useState<string>('');

  useEffect(() => {
    if (!invoice) return;
    setRentBaht(fromSatang(invoice.rentSatang));
    setParkingFeeBaht(fromSatang(invoice.parkingFeeSatang || 0));
    setPrevWater(invoice.prevWater);
    setCurrWater(invoice.currWater);
    setWaterRoll(Boolean(invoice.waterRoll));
    setWaterBaht(fromSatang(invoice.waterSatang));
    setPrevElec(invoice.prevElec);
    setCurrElec(invoice.currElec);
    setElecRoll(Boolean(invoice.elecRoll));
    setElecBaht(fromSatang(invoice.elecSatang));
    setArrearsBaht(fromSatang(invoice.arrearsSatang || 0));
    setLateFeeBaht(fromSatang(invoice.lateFeeSatang || 0));
    setDiscountBaht(fromSatang(invoice.discountSatang || 0));
    setAdjustmentNote(invoice.adjustmentNote || '');
    setCustomWaterMoney(false);
    setCustomElecMoney(false);
  }, [invoice, isOpen]);

  if (!isOpen || !invoice) return null;

  const waterUnits = Math.max(0, calcMeterUnits(prevWater, currWater, waterRoll));
  const elecUnits = Math.max(0, calcMeterUnits(prevElec, currElec, elecRoll));

  // Recalculate water when readings change unless custom
  const handleWaterMeterChange = (newPrev: number, newCurr: number, newRoll: boolean) => {
    setPrevWater(newPrev);
    setCurrWater(newCurr);
    setWaterRoll(newRoll);
    if (!customWaterMoney) {
      const units = Math.max(0, calcMeterUnits(newPrev, newCurr, newRoll));
      setWaterBaht(fromSatang(units * settings.waterRateSatang));
    }
  };

  // Recalculate electric when readings change unless custom
  const handleElecMeterChange = (newPrev: number, newCurr: number, newRoll: boolean) => {
    setPrevElec(newPrev);
    setCurrElec(newCurr);
    setElecRoll(newRoll);
    if (!customElecMoney) {
      const units = Math.max(0, calcMeterUnits(newPrev, newCurr, newRoll));
      setElecBaht(fromSatang(units * settings.electricityRateSatang));
    }
  };

  const rentSatang = toSatang(rentBaht);
  const parkingSatang = toSatang(parkingFeeBaht);
  const waterSatang = toSatang(waterBaht);
  const elecSatang = toSatang(elecBaht);
  const arrearsSatang = toSatang(arrearsBaht);
  const lateFeeSatang = toSatang(lateFeeBaht);
  const discountSatang = toSatang(discountBaht);

  const subtotalSatang = rentSatang + parkingSatang + waterSatang + elecSatang + arrearsSatang + lateFeeSatang;
  const newTotalSatang = Math.max(0, subtotalSatang - discountSatang);
  const newBalanceDueSatang = Math.max(0, newTotalSatang - invoice.paidSatang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      invoiceId: invoice.id,
      rentSatang,
      parkingFeeSatang: parkingSatang,
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
      adjustmentNote: adjustmentNote.trim()
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-indigo-950 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Edit3 className="w-4 h-4 text-indigo-400" />
              <span>แก้ไขยอดเงินในบิล — ห้อง {invoice.roomNumber} ({invoice.tenantName})</span>
            </h3>
            <p className="text-[11px] text-indigo-200">
              เลขที่บิล {invoice.id} • รอบบิล {invoice.billingPeriod}
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-indigo-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 text-xs overflow-y-auto flex-1">
          {/* Rent and Parking */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ค่าเช่าห้องพัก (บาท)</label>
              <input
                type="number"
                step="50"
                value={rentBaht}
                onChange={(e) => setRentBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold text-indigo-950"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ค่าจอดรถ ({invoice.parkingType === 'CAR' ? '🚗 รถยนต์' : invoice.parkingType === 'BIKE' ? '🛵 มอเตอร์ไซค์' : 'ไม่มีรถ'})
              </label>
              <input
                type="number"
                step="50"
                value={parkingFeeBaht}
                onChange={(e) => setParkingFeeBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Water Meter & Charge */}
          <div className="bg-sky-50/50 p-3 rounded-xl border border-sky-100 space-y-2">
            <div className="flex items-center justify-between font-bold text-sky-950">
              <span className="flex items-center gap-1">
                <Droplets className="w-3.5 h-3.5 text-sky-600" />
                <span>ค่าน้ำประปา</span>
              </span>
              <span className="text-[11px] font-normal text-sky-800">
                {waterUnits} หน่วย × {formatBaht(settings.waterRateSatang)} บ.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">มิเตอร์น้ำเก่า (ก่อน)</label>
                <input
                  type="number"
                  value={prevWater}
                  onChange={(e) => handleWaterMeterChange(parseInt(e.target.value, 10) || 0, currWater, waterRoll)}
                  className="w-full border border-sky-300 bg-amber-50/60 rounded-lg px-2 py-1.5 mono-num font-bold text-amber-900"
                  title="แก้ไขเลขมิเตอร์รอบก่อนหน้า"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">มิเตอร์น้ำใหม่</label>
                  <label className="flex items-center gap-1 text-[10px] text-sky-800 cursor-pointer mb-0.5">
                    <input
                      type="checkbox"
                      checked={waterRoll}
                      onChange={(e) => handleWaterMeterChange(prevWater, currWater, e.target.checked)}
                      className="accent-sky-600"
                    />
                    <span>วนรอบ</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={currWater}
                  onChange={(e) => handleWaterMeterChange(prevWater, parseInt(e.target.value, 10) || 0, waterRoll)}
                  className="w-full border border-sky-200 bg-white rounded-lg px-2 py-1.5 mono-num font-bold text-sky-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 flex justify-between">
                  <span>ยอดเงิน (บาท)</span>
                  <span className="text-[10px] text-sky-600 cursor-pointer" onClick={() => setCustomWaterMoney(!customWaterMoney)}>
                    {customWaterMoney ? '🔒 ล็อก' : '✏️ กำหนดเอง'}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={waterBaht}
                  onChange={(e) => {
                    setCustomWaterMoney(true);
                    setWaterBaht(parseFloat(e.target.value) || 0);
                  }}
                  className="w-full border border-sky-200 bg-white rounded-lg px-2 py-1.5 mono-num font-bold text-sky-900"
                />
              </div>
            </div>
          </div>

          {/* Electric Meter & Charge */}
          <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-100 space-y-2">
            <div className="flex items-center justify-between font-bold text-amber-950">
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5 text-amber-600" />
                <span>ค่าไฟฟ้า</span>
              </span>
              <span className="text-[11px] font-normal text-amber-800">
                {elecUnits} หน่วย × {formatBaht(settings.electricityRateSatang)} บ.
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">มิเตอร์ไฟเก่า (ก่อน)</label>
                <input
                  type="number"
                  value={prevElec}
                  onChange={(e) => handleElecMeterChange(parseInt(e.target.value, 10) || 0, currElec, elecRoll)}
                  className="w-full border border-amber-300 bg-amber-50/60 rounded-lg px-2 py-1.5 mono-num font-bold text-amber-900"
                  title="แก้ไขเลขมิเตอร์รอบก่อนหน้า"
                />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-0.5">มิเตอร์ไฟใหม่</label>
                  <label className="flex items-center gap-1 text-[10px] text-amber-800 cursor-pointer mb-0.5">
                    <input
                      type="checkbox"
                      checked={elecRoll}
                      onChange={(e) => handleElecMeterChange(prevElec, currElec, e.target.checked)}
                      className="accent-amber-600"
                    />
                    <span>วนรอบ</span>
                  </label>
                </div>
                <input
                  type="number"
                  value={currElec}
                  onChange={(e) => handleElecMeterChange(prevElec, parseInt(e.target.value, 10) || 0, elecRoll)}
                  className="w-full border border-amber-200 bg-white rounded-lg px-2 py-1.5 mono-num font-bold text-amber-950"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-0.5 flex justify-between">
                  <span>ยอดเงิน (บาท)</span>
                  <span className="text-[10px] text-amber-700 cursor-pointer" onClick={() => setCustomElecMoney(!customElecMoney)}>
                    {customElecMoney ? '🔒 ล็อก' : '✏️ กำหนดเอง'}
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={elecBaht}
                  onChange={(e) => {
                    setCustomElecMoney(true);
                    setElecBaht(parseFloat(e.target.value) || 0);
                  }}
                  className="w-full border border-amber-200 bg-white rounded-lg px-2 py-1.5 mono-num font-bold text-amber-900"
                />
              </div>
            </div>
          </div>

          {/* Arrears & Late Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ยอดค้างยกมาจากเดือนก่อน (บาท)</label>
              <input
                type="number"
                step="0.01"
                value={arrearsBaht}
                onChange={(e) => setArrearsBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num text-rose-700 font-bold"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                ค่าปรับล่าช้า (บาท) {lateFeeBaht > 0 && <span className="text-[10px] text-rose-500 font-normal">(ปรับลดหรือยกเว้นได้)</span>}
              </label>
              <input
                type="number"
                step="10"
                value={lateFeeBaht}
                onChange={(e) => setLateFeeBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num text-rose-700 font-bold"
              />
            </div>
          </div>

          {/* Discounts / Adjustments */}
          <div className="bg-emerald-50/60 p-3 rounded-xl border border-emerald-200 space-y-2">
            <div className="font-bold text-emerald-950 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-emerald-600" />
              <span>ส่วนลดพิเศษ หรือ รายการปรับลด</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="col-span-1">
                <label className="block text-[11px] text-slate-600 mb-0.5">ส่วนลด (บาท)</label>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={discountBaht}
                  onChange={(e) => setDiscountBaht(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 mono-num font-bold text-emerald-800"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[11px] text-slate-600 mb-0.5">หมายเหตุการปรับยอดเงิน</label>
                <input
                  type="text"
                  value={adjustmentNote}
                  onChange={(e) => setAdjustmentNote(e.target.value)}
                  placeholder="เช่น ส่วนลดแนะนำเพื่อน 500 บาท หรือ ยกเว้นค่าปรับ"
                  className="w-full border border-emerald-300 bg-white rounded-lg px-2.5 py-1.5 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Live Calculation Box */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>รวมยอดค่าใช้จ่าย (ห้อง + จอด + น้ำ + ไฟ + ค้าง + ปรับ):</span>
              <span className="font-bold mono-num">฿{formatBaht(subtotalSatang)}</span>
            </div>
            {discountSatang > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span>หัก ส่วนลดพิเศษ:</span>
                <span className="font-bold mono-num">-฿{formatBaht(discountSatang)}</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-1 flex justify-between items-baseline font-bold text-slate-200">
              <span>ยอดบิลสุทธิใหม่ (New Total):</span>
              <span className="text-base font-extrabold text-emerald-400 mono-num">
                ฿{formatBaht(newTotalSatang)}
              </span>
            </div>
            {invoice.paidSatang > 0 && (
              <div className="flex justify-between text-slate-300 pt-0.5">
                <span>หัก ชำระแล้วก่อนหน้า:</span>
                <span className="font-semibold text-emerald-400 mono-num">-฿{formatBaht(invoice.paidSatang)}</span>
              </div>
            )}
            <div className="border-t border-slate-800 pt-1 flex justify-between items-baseline font-bold">
              <span className="text-rose-300">ยอดคงเหลือที่ต้องจ่ายจริง:</span>
              <span className="text-sm font-black text-rose-400 mono-num">
                ฿{formatBaht(newBalanceDueSatang)}
              </span>
            </div>
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
              className="px-5 py-2 rounded-lg bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกการแก้ไขยอดบิล</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
