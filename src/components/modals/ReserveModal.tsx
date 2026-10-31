import React, { useState } from 'react';
import { AppState, PackageTier, ParkingType, Room } from '../../types';
import { formatBaht, fromSatang, toSatang } from '../../lib/finance';
import { X, BookmarkCheck } from 'lucide-react';

interface ReserveModalProps {
  room: Room | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

export const ReserveModal: React.FC<ReserveModalProps> = ({
  room,
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen || !room) return null;

  const { settings, simulatedDate } = state;

  const [tenantName, setTenantName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [lineId, setLineId] = useState<string>('');
  const [expectedDate, setExpectedDate] = useState<string>(simulatedDate);
  const [tier, setTier] = useState<PackageTier>(room.tier || 'SILVER');
  const [parkingType, setParkingType] = useState<ParkingType>('NONE');
  const [depositBaht, setDepositBaht] = useState<number>(1000);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      roomNumber: room.roomNumber,
      tenantName,
      phone,
      lineId,
      expectedDate,
      tier,
      parkingType,
      depositSatang: toSatang(depositBaht)
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-amber-600 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">รับจองห้องพักล่วงหน้า — ห้อง {room.roomNumber}</h3>
            <p className="text-[11px] text-amber-100">
              ยอดเงินมัดจำจองจะถูกนำไปหักออกจากยอดจ่ายวันทำสัญญาเข้าอยู่อัตโนมัติ
            </p>
          </div>
          <button type="button" onClick={onClose} className="text-amber-100 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">ชื่อผู้จอง</label>
            <input
              type="text"
              value={tenantName}
              onChange={(e) => setTenantName(e.target.value)}
              placeholder="เช่น คุณกานดา รักสงบ"
              className="w-full border border-slate-300 rounded-lg px-3 py-2"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08x-xxx-xxxx"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">LINE ID</label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="line-id"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">วันที่นัดย้ายเข้า</label>
              <input
                type="date"
                value={expectedDate}
                onChange={(e) => setExpectedDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">แพ็กเกจที่จอง</label>
              <select
                value={tier}
                onChange={(e) => setTier(e.target.value as PackageTier)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="STANDARD">Standard ({formatBaht(settings.tierStandardSatang)} บ.)</option>
                <option value="SILVER">Silver ({formatBaht(settings.tierSilverSatang)} บ.)</option>
                <option value="GOLD">Gold ({formatBaht(settings.tierGoldSatang)} บ.)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ที่จอดรถ</label>
              <select
                value={parkingType}
                onChange={(e) => setParkingType(e.target.value as ParkingType)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value="NONE">ไม่มีพาหนะ</option>
                <option value="BIKE">มอเตอร์ไซค์ (+฿{formatBaht(settings.bikeParkingRateSatang)})</option>
                <option value="CAR">รถยนต์ (+฿{formatBaht(settings.carParkingRateSatang)})</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เงินมัดจำจอง (บาท)</label>
              <input
                type="number"
                value={depositBaht}
                onChange={(e) => setDepositBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold text-amber-700"
                required
              />
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
              className="px-5 py-2 rounded-lg bg-amber-600 text-white font-bold hover:bg-amber-700 transition flex items-center gap-1.5"
            >
              <BookmarkCheck className="w-4 h-4" />
              <span>ยืนยันการจองห้อง</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
