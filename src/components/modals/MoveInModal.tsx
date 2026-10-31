import React, { useState, useEffect } from 'react';
import { AppState, PackageTier, ParkingType, Room } from '../../types';
import { calcProratedRentSatang, formatBaht, fromSatang, toSatang } from '../../lib/finance';
import { X, Check, Car, Bike, Calculator } from 'lucide-react';

interface MoveInModalProps {
  room: Room | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: any) => void;
}

export const MoveInModal: React.FC<MoveInModalProps> = ({
  room,
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  const { settings, simulatedDate } = state;

  const [tenantName, setTenantName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [lineId, setLineId] = useState<string>('');
  const [tier, setTier] = useState<PackageTier>('GOLD');
  const [rentBaht, setRentBaht] = useState<number>(fromSatang(settings.tierGoldSatang));
  const [depositMonths, setDepositMonths] = useState<number>(settings.defaultDepositMonths || 1);
  const [startDate, setStartDate] = useState<string>(simulatedDate);
  const [parkingType, setParkingType] = useState<ParkingType>('NONE');
  const [parkingFeeBaht, setParkingFeeBaht] = useState<number>(0);
  const [bookingCreditBaht, setBookingCreditBaht] = useState<number>(0);
  const [useProrate, setUseProrate] = useState<boolean>(true);
  const [initWater, setInitWater] = useState<number>(0);
  const [initElec, setInitElec] = useState<number>(0);

  useEffect(() => {
    if (!room) return;
    setTenantName(room.status === 'RESERVED' ? room.tenantName.replace(' (จองแล้ว)', '') : '');
    setPhone(room.phone || '');
    setLineId(room.lineId || '');
    setTier(room.tier || 'GOLD');
    setRentBaht(fromSatang(room.rentSatang || settings.tierGoldSatang));
    setDepositMonths(settings.defaultDepositMonths || 1);
    setStartDate(simulatedDate);
    setParkingType(room.parkingType || 'NONE');
    setParkingFeeBaht(fromSatang(room.parkingFeeSatang || 0));
    setBookingCreditBaht(room.status === 'RESERVED' ? fromSatang(room.bookingDepositSatang || 0) : 0);
    setUseProrate(true);
    setInitWater(room.currWater || 0);
    setInitElec(room.currElec || 0);
  }, [room, isOpen, simulatedDate, settings]);

  if (!isOpen || !room) return null;

  // Update rent when tier changes
  const handleTierChange = (newTier: PackageTier) => {
    setTier(newTier);
    if (newTier === 'STANDARD') setRentBaht(fromSatang(settings.tierStandardSatang));
    else if (newTier === 'SILVER') setRentBaht(fromSatang(settings.tierSilverSatang));
    else if (newTier === 'GOLD') setRentBaht(fromSatang(settings.tierGoldSatang));
  };

  const handleParkingChange = (pType: ParkingType) => {
    setParkingType(pType);
    if (pType === 'CAR') setParkingFeeBaht(fromSatang(settings.carParkingRateSatang));
    else if (pType === 'BIKE') setParkingFeeBaht(fromSatang(settings.bikeParkingRateSatang));
    else setParkingFeeBaht(0);
  };

  const monthlyRentSatang = toSatang(rentBaht);
  const depositSatang = monthlyRentSatang * depositMonths;
  const pro = calcProratedRentSatang(monthlyRentSatang, startDate, settings.billingDay);
  const firstRentSatang = useProrate ? pro.proratedAmountSatang : monthlyRentSatang;
  const bookingCreditSatang = toSatang(bookingCreditBaht);
  const parkingSatang = toSatang(parkingFeeBaht);
  const netMoveInSatang = Math.max(0, firstRentSatang + depositSatang + parkingSatang - bookingCreditSatang);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      roomNumber: room.roomNumber,
      tenantName,
      phone,
      lineId,
      tier,
      rentSatang: monthlyRentSatang,
      depositMonths,
      startDate,
      parkingType,
      parkingFeeSatang: parkingSatang,
      bookingCreditSatang,
      initWater,
      initElec,
      useProrate
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden">
        <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm">ทำสัญญาเข้าอยู่ใหม่ — ห้อง {room.roomNumber}</h3>
            <p className="text-[11px] text-slate-400">เลือกแพ็กเกจห้องพัก ที่จอดรถ เงินประกัน และหารค่าเช่ารายวันชนวันที่ {settings.billingDay}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-white text-lg font-bold">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-3.5 text-xs max-h-[82vh] overflow-y-auto">
          {/* Tenant Names */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้เช่า</label>
              <input
                type="text"
                value={tenantName}
                onChange={(e) => setTenantName(e.target.value)}
                placeholder="เช่น คุณสมชาย ใจดี"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                required
              />
            </div>
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
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">LINE ID</label>
              <input
                type="text"
                value={lineId}
                onChange={(e) => setLineId(e.target.value)}
                placeholder="เช่น somchai.line"
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">วันย้ายเข้าอยู่</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* Package Tier & Rent */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">แพ็กเกจห้องพัก</label>
              <select
                value={tier}
                onChange={(e) => handleTierChange(e.target.value as PackageTier)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
              >
                <option value="STANDARD">Standard — 2,500 บาท/เดือน</option>
                <option value="SILVER">Silver — 3,000 บาท/เดือน</option>
                <option value="GOLD">Gold — 3,500 บาท/เดือน</option>
                <option value="CUSTOM">กำหนดราคาพิเศษเอง (Custom)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ค่าเช่ารายเดือน (บาท)</label>
              <input
                type="number"
                value={rentBaht}
                onChange={(e) => setRentBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold"
                required
              />
            </div>
          </div>

          {/* Parking Option */}
          <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-2.5 rounded-xl border border-indigo-100">
            <div>
              <label className="block font-semibold text-indigo-950 mb-1">ที่จอดรถประจำห้อง</label>
              <select
                value={parkingType}
                onChange={(e) => handleParkingChange(e.target.value as ParkingType)}
                className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-1.5"
              >
                <option value="NONE">ไม่มีพาหนะ (฿0)</option>
                <option value="BIKE">🛵 มอเตอร์ไซค์ (+฿{formatBaht(settings.bikeParkingRateSatang)})</option>
                <option value="CAR">🚗 รถยนต์ (+฿{formatBaht(settings.carParkingRateSatang)})</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-indigo-950 mb-1">ค่าจอดรถ (บาท/เดือน)</label>
              <input
                type="number"
                value={parkingFeeBaht}
                onChange={(e) => setParkingFeeBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-indigo-200 bg-white rounded-lg px-3 py-1.5 mono-num font-bold"
              />
            </div>
          </div>

          {/* Security Deposit & Booking Deduction */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เงินประกันห้อง</label>
              <select
                value={depositMonths}
                onChange={(e) => setDepositMonths(parseInt(e.target.value, 10) || 1)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
              >
                <option value={1}>ประกัน 1 เดือน (1x ค่าห้อง)</option>
                <option value={2}>ประกัน 2 เดือน (2x ค่าห้อง)</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">หักเงินจองที่จ่ายไว้ (บาท)</label>
              <input
                type="number"
                value={bookingCreditBaht}
                onChange={(e) => setBookingCreditBaht(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num text-emerald-700 font-bold"
              />
            </div>
          </div>

          {/* Proration Toggle */}
          <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <input
              type="checkbox"
              id="prorate-check"
              checked={useProrate}
              onChange={(e) => setUseProrate(e.target.checked)}
              className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
            />
            <label htmlFor="prorate-check" className="text-emerald-950 font-medium cursor-pointer">
              หารค่าเช่ารายวัน (Prorate หาร 30 วันคงที่) นับจากวันเข้าอยู่จนถึงวันที่ {settings.billingDay}
            </label>
          </div>

          {/* Initial Meters */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลขมิเตอร์น้ำตั้งต้น</label>
              <input
                type="number"
                value={initWater}
                onChange={(e) => setInitWater(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลขมิเตอร์ไฟตั้งต้น</label>
              <input
                type="number"
                value={initElec}
                onChange={(e) => setInitElec(parseInt(e.target.value, 10) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* Live Calculation Preview Box */}
          <div className="bg-slate-900 text-white rounded-xl p-3.5 space-y-1.5">
            <div className="flex justify-between text-slate-300">
              <span>{useProrate ? `ค่าเช่าเฉลี่ยถึงวันที่ ${settings.billingDay} (${pro.proratedDays} วัน × ฿${formatBaht(pro.dailyRateSatang)}/วัน):` : 'ค่าเช่าเดือนแรกเต็มเดือน:'}</span>
              <span className="font-bold mono-num">฿{formatBaht(firstRentSatang)}</span>
            </div>
            <div className="flex justify-between text-slate-300">
              <span>บวก เงินประกันห้อง ({depositMonths} เท่าของค่าห้อง):</span>
              <span className="font-bold mono-num">+฿{formatBaht(depositSatang)}</span>
            </div>
            {parkingSatang > 0 && (
              <div className="flex justify-between text-indigo-300">
                <span>บวก ค่าจอดรถเดือนแรก:</span>
                <span className="font-bold mono-num">+฿{formatBaht(parkingSatang)}</span>
              </div>
            )}
            {bookingCreditSatang > 0 && (
              <div className="flex justify-between text-emerald-300">
                <span>หัก เงินมัดจำจองห้องที่รับไว้แล้ว:</span>
                <span className="font-bold mono-num">-฿{formatBaht(bookingCreditSatang)}</span>
              </div>
            )}
            <div className="border-t border-slate-700 pt-1.5 flex justify-between items-baseline">
              <span className="font-bold text-slate-100">ยอดชำระวันทำสัญญาเข้าอยู่สุทธิ:</span>
              <span className="text-base font-black text-emerald-400 mono-num">
                ฿{formatBaht(netMoveInSatang)}
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50 transition"
            >
              ยกเลิก
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>บันทึกสัญญา & รับเงินแรกเข้า</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
