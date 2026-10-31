import React, { useState } from 'react';
import { AppState, PackageTier, ParkingType, Room, RoomStatus } from '../../types';
import { fromSatang, toSatang } from '../../lib/finance';
import { X, Check, Trash2, Rocket } from 'lucide-react';

interface GoLiveSetupModalProps {
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (rooms: Room[]) => void;
}

export const GoLiveSetupModal: React.FC<GoLiveSetupModalProps> = ({
  state,
  isOpen,
  onClose,
  onSubmit
}) => {
  if (!isOpen) return null;

  const [rooms, setRooms] = useState<Room[]>(() => JSON.parse(JSON.stringify(state.rooms)));

  const handleFieldChange = (roomNumber: string, field: keyof Room, val: any) => {
    setRooms(prev => prev.map(rm => {
      if (rm.roomNumber === roomNumber) {
        return { ...rm, [field]: val };
      }
      return rm;
    }));
  };

  const handleTierChange = (roomNumber: string, tier: PackageTier) => {
    const s = state.settings;
    let rentSatang = s.tierGoldSatang;
    if (tier === 'STANDARD') rentSatang = s.tierStandardSatang;
    else if (tier === 'SILVER') rentSatang = s.tierSilverSatang;
    else if (tier === 'GOLD') rentSatang = s.tierGoldSatang;

    setRooms(prev => prev.map(rm => {
      if (rm.roomNumber === roomNumber) {
        return {
          ...rm,
          tier,
          rentSatang,
          depositSatang: rm.status === 'OCCUPIED' ? rentSatang * s.defaultDepositMonths : 0
        };
      }
      return rm;
    }));
  };

  const handleParkingChange = (roomNumber: string, pType: ParkingType) => {
    const s = state.settings;
    const parkingFeeSatang = pType === 'CAR' ? s.carParkingRateSatang : pType === 'BIKE' ? s.bikeParkingRateSatang : 0;
    setRooms(prev => prev.map(rm => {
      if (rm.roomNumber === roomNumber) {
        return { ...rm, parkingType: pType, parkingFeeSatang };
      }
      return rm;
    }));
  };

  const handleClearAllToEmpty = () => {
    setRooms(prev => prev.map(rm => ({
      ...rm,
      status: 'AVAILABLE',
      tenantName: '',
      phone: '',
      lineId: '',
      depositSatang: 0,
      parkingType: 'NONE',
      parkingFeeSatang: 0,
      bookingDepositSatang: 0,
      arrearsSatang: 0
    })));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(rooms);
  };

  return (
    <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 no-print animate-fade-in">
      <div className="bg-white rounded-2xl max-w-6xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        <div className="bg-indigo-950 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-1.5">
              <Rocket className="w-4 h-4 text-indigo-400" />
              <span>ตารางตั้งค่าผู้เช่าและเลขมิเตอร์ตั้งต้นจริงทั้ง 15 ห้อง (Go-Live Initial Setup)</span>
            </h3>
            <p className="text-[11px] text-indigo-200">
              กรอกชื่อผู้เช่าจริง แพ็กเกจ ที่จอดรถ และเลขมิเตอร์น้ำ-ไฟตั้งต้นของห้อง 101–305 ในหน้าเดียว
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleClearAllToEmpty}
              className="px-3 py-1.5 rounded-lg bg-rose-600 text-white text-xs font-bold hover:bg-rose-700 transition flex items-center gap-1"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>ล้างชื่อตัวอย่างทั้งหมด</span>
            </button>
            <button type="button" onClick={onClose} className="text-indigo-200 hover:text-white px-2">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 flex flex-col justify-between">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-900 text-white sticky top-0 z-10 text-[11px]">
              <tr>
                <th className="py-2.5 px-2">ห้อง</th>
                <th className="py-2.5 px-2">สถานะห้อง</th>
                <th className="py-2.5 px-2">ชื่อผู้เช่า</th>
                <th className="py-2.5 px-2">เบอร์โทร</th>
                <th className="py-2.5 px-2">แพ็กเกจ</th>
                <th className="py-2.5 px-2 text-right">ค่าห้อง (บาท)</th>
                <th className="py-2.5 px-2">ที่จอดรถ</th>
                <th className="py-2.5 px-2 text-right">มิเตอร์น้ำ</th>
                <th className="py-2.5 px-2 text-right">มิเตอร์ไฟ</th>
                <th className="py-2.5 px-2 text-right">ค้างยกมา (บาท)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rooms.map(rm => (
                <tr key={rm.roomNumber} className="hover:bg-slate-50 transition">
                  <td className="py-2 px-2 font-black mono-num text-slate-900 text-sm">
                    {rm.roomNumber}
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={rm.status}
                      onChange={(e) => handleFieldChange(rm.roomNumber, 'status', e.target.value as RoomStatus)}
                      className="border border-slate-300 rounded px-2 py-1 text-xs font-semibold"
                    >
                      <option value="OCCUPIED">มีผู้เช่า (OCCUPIED)</option>
                      <option value="AVAILABLE">ห้องว่าง (AVAILABLE)</option>
                      <option value="RESERVED">จองแล้ว (RESERVED)</option>
                      <option value="MAINTENANCE">ซ่อมบำรุง (MAINTENANCE)</option>
                    </select>
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={rm.tenantName}
                      onChange={(e) => handleFieldChange(rm.roomNumber, 'tenantName', e.target.value)}
                      placeholder="ชื่อผู้เช่า..."
                      className="w-32 border border-slate-300 rounded px-2 py-1"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <input
                      type="text"
                      value={rm.phone}
                      onChange={(e) => handleFieldChange(rm.roomNumber, 'phone', e.target.value)}
                      placeholder="08x-xxx-xxxx"
                      className="w-28 border border-slate-300 rounded px-2 py-1 mono-num"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={rm.tier}
                      onChange={(e) => handleTierChange(rm.roomNumber, e.target.value as PackageTier)}
                      className="border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="STANDARD">Standard (2,500)</option>
                      <option value="SILVER">Silver (3,000)</option>
                      <option value="GOLD">Gold (3,500)</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={fromSatang(rm.rentSatang)}
                      onChange={(e) => handleFieldChange(rm.roomNumber, 'rentSatang', toSatang(parseFloat(e.target.value) || 0))}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-right font-bold mono-num"
                    />
                  </td>
                  <td className="py-2 px-2">
                    <select
                      value={rm.parkingType}
                      onChange={(e) => handleParkingChange(rm.roomNumber, e.target.value as ParkingType)}
                      className="border border-slate-300 rounded px-2 py-1"
                    >
                      <option value="NONE">ไม่ใช้</option>
                      <option value="BIKE">🛵 มอเตอร์ไซค์</option>
                      <option value="CAR">🚗 รถยนต์</option>
                    </select>
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={rm.currWater}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        handleFieldChange(rm.roomNumber, 'currWater', val);
                        handleFieldChange(rm.roomNumber, 'prevWater', val);
                      }}
                      className="w-20 border border-sky-300 bg-sky-50/50 rounded px-2 py-1 text-right font-bold mono-num"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={rm.currElec}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 0;
                        handleFieldChange(rm.roomNumber, 'currElec', val);
                        handleFieldChange(rm.roomNumber, 'prevElec', val);
                      }}
                      className="w-20 border border-amber-300 bg-amber-50/50 rounded px-2 py-1 text-right font-bold mono-num"
                    />
                  </td>
                  <td className="py-2 px-2 text-right">
                    <input
                      type="number"
                      value={fromSatang(rm.arrearsSatang || 0)}
                      onChange={(e) => handleFieldChange(rm.roomNumber, 'arrearsSatang', toSatang(parseFloat(e.target.value) || 0))}
                      className="w-20 border border-slate-300 rounded px-2 py-1 text-right mono-num"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 mt-4 shrink-0 -mx-4 -mb-4">
            <span className="text-xs text-slate-500">
              เมื่อกดบันทึก ระบบจะใช้เลขมิเตอร์ชุดนี้เป็นเลขตั้งต้นสำหรับตัดรอบบิลวันที่ {state.settings.billingDay} ทันที
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 transition text-xs"
              >
                ยกเลิก
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-emerald-600 text-white font-bold hover:bg-emerald-700 transition shadow-sm flex items-center gap-1.5 text-xs"
              >
                <Check className="w-4 h-4" />
                <span>บันทึกข้อมูลจริงทั้ง 15 ห้อง (Go-Live)</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
