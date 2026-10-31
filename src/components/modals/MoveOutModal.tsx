import React, { useState, useEffect } from 'react';
import { AppState, Room } from '../../types';
import { calcMeterUnits, formatBaht, toSatang } from '../../lib/finance';
import { X, LogOut } from 'lucide-react';

interface MoveOutModalProps {
  room: Room | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

export const MoveOutModal: React.FC<MoveOutModalProps> = ({
  room,
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { settings } = state;

  const [currWater, setCurrWater] = useState<number>(0);
  const [waterRoll, setWaterRoll] = useState<boolean>(false);
  const [currElec, setCurrElec] = useState<number>(0);
  const [elecRoll, setElecRoll] = useState<boolean>(false);
  const [cleaningFeeBaht, setCleaningFeeBaht] = useState<number>(300);
  const [damageFeeBaht, setDamageFeeBaht] = useState<number>(0);

  useEffect(() => {
    if (!room) return;
    setCurrWater(room.currWater);
    setWaterRoll(false);
    setCurrElec(room.currElec);
    setElecRoll(false);
    setCleaningFeeBaht(300);
    setDamageFeeBaht(0);
  }, [room, isOpen]);

  if (!isOpen || !room) return null;

  const unpaidInvoices = state.invoices.filter(
    i => i.roomNumber === room.roomNumber && i.status !== 'ROLLED_OVER' && i.balanceDueSatang > 0
  );
  const totalInvoiceArrears = unpaidInvoices.reduce((sum, inv) => sum + inv.balanceDueSatang, 0);

  const wUnits = Math.max(0, calcMeterUnits(room.currWater, currWater, waterRoll));
  const eUnits = Math.max(0, calcMeterUnits(room.currElec, currElec, elecRoll));
  const finalWaterSatang = wUnits * settings.waterRateSatang;
  const finalElectricSatang = eUnits * settings.electricityRateSatang;
  const cleaningSatang = toSatang(cleaningFeeBaht);
  const damageSatang = toSatang(damageFeeBaht);
  const unpaidArrearsSatang = unpaidInvoices.length > 0 ? totalInvoiceArrears : (room.arrearsSatang || 0);
  const depositHeldSatang = room.depositSatang || 0;

  const totalDeductions = finalWaterSatang + finalElectricSatang + cleaningSatang + damageSatang + unpaidArrearsSatang;
  const netRefundSatang = depositHeldSatang - totalDeductions;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      roomNumber: room.roomNumber,
      currWater,
      currElec,
      waterRoll,
      elecRoll,
      cleaningFeeSatang: cleaningSatang,
      damageFeeSatang: damageSatang
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-rose-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">แจ้งย้ายออก & คืนเงินประกัน — ห้อง {room.roomNumber}</h3>
            <p className="text-[11px] text-rose-200">
              {room.tenantName} • คำนวณหักค่าน้ำ-ไฟวันย้ายออก และออกใบสรุปเงินประกัน
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-rose-200 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
          {/* Meter Readings */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  มิเตอร์น้ำ ({room.currWater} → ย้ายออก)
                </label>
                <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={waterRoll}
                    onChange={(e) => setWaterRoll(e.target.checked)}
                    className="accent-sky-600"
                  />
                  <span>วนรอบ</span>
                </label>
              </div>
              <input
                type="number"
                value={currWater}
                onChange={(e) => setCurrWater(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold"
                required
              />
              <span className="text-[10px] text-slate-500">ใช้ {wUnits} หน่วย = ฿{formatBaht(finalWaterSatang)}</span>
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block font-semibold text-slate-700">
                  มิเตอร์ไฟ ({room.currElec} → ย้ายออก)
                </label>
                <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={elecRoll}
                    onChange={(e) => setElecRoll(e.target.checked)}
                    className="accent-amber-600"
                  />
                  <span>วนรอบ</span>
                </label>
              </div>
              <input
                type="number"
                value={currElec}
                onChange={(e) => setCurrElec(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold"
                required
              />
              <span className="text-[10px] text-slate-500">ใช้ {eUnits} หน่วย = ฿{formatBaht(finalElectricSatang)}</span>
            </div>
          </div>

          {/* Cleaning & Damage Fees */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ค่าทำความสะอาดห้อง (บาท)</label>
              <input
                type="number"
                value={cleaningFeeBaht}
                onChange={(e) => setCleaningFeeBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ค่าซ่อมแซมความเสียหาย (บาท)</label>
              <input
                type="number"
                value={damageFeeBaht}
                onChange={(e) => setDamageFeeBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* Settlement Preview Box */}
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>เงินประกันห้องที่ถือไว้:</span>
              <span className="font-bold text-emerald-400 mono-num">฿{formatBaht(depositHeldSatang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>หัก ค่าน้ำวันย้ายออก ({wUnits} หน่วย):</span>
              <span className="mono-num">-฿{formatBaht(finalWaterSatang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>หัก ค่าไฟวันย้ายออก ({eUnits} หน่วย × ฿{formatBaht(settings.electricityRateSatang)}):</span>
              <span className="mono-num">-฿{formatBaht(finalElectricSatang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>หัก ค่าทำความสะอาด + ค่าเสียหาย:</span>
              <span className="mono-num">-฿{formatBaht(cleaningSatang + damageSatang)}</span>
            </div>
            {unpaidArrearsSatang > 0 && (
              <div className="flex justify-between text-rose-300">
                <span>หัก ยอดบิลค้างชำระ:</span>
                <span className="mono-num">-฿{formatBaht(unpaidArrearsSatang)}</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline font-bold text-sm">
              <span>{netRefundSatang >= 0 ? 'ยอดเงินประกันคืนผู้เช่าสุทธิ:' : 'ยอดที่ผู้เช่าต้องชำระเพิ่ม:'}</span>
              <span className={`text-base font-black mono-num ${netRefundSatang >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                ฿{formatBaht(Math.abs(netRefundSatang))}
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
              className="px-5 py-2 rounded-lg bg-rose-600 text-white font-bold hover:bg-rose-700 transition flex items-center gap-1.5 shadow-sm"
            >
              <LogOut className="w-4 h-4" />
              <span>ยืนยันย้ายออก & ออกใบสรุปคืนเงินประกัน</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
