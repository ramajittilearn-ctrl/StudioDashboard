import React, { useState, useEffect } from 'react';
import { AppState, Room } from '../types';
import { calcLateFeeSatang, calcMeterUnits, formatBaht } from '../lib/finance';
import { Zap, Droplets, Car, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react';

interface BulkMeterTableProps {
  state: AppState;
  onCommitInvoices: (readings: any[]) => void;
}

interface LocalReading {
  roomNumber: string;
  prevWater: number;
  currWater: number;
  waterRoll: boolean;
  prevElec: number;
  currElec: number;
  elecRoll: boolean;
}

export const BulkMeterTable: React.FC<BulkMeterTableProps> = ({ state, onCommitInvoices }) => {
  const { rooms, settings, invoices, simulatedDate } = state;
  const occupiedRooms = rooms.filter(r => r.status === 'OCCUPIED');

  const [readings, setReadings] = useState<Record<string, LocalReading>>({});
  const [allowEditPrev, setAllowEditPrev] = useState<boolean>(false);

  useEffect(() => {
    const map: Record<string, LocalReading> = {};
    occupiedRooms.forEach(rm => {
      map[rm.roomNumber] = {
        roomNumber: rm.roomNumber,
        prevWater: rm.prevWater,
        currWater: rm.currWater,
        waterRoll: rm.waterRoll,
        prevElec: rm.prevElec,
        currElec: rm.currElec,
        elecRoll: rm.elecRoll
      };
    });
    setReadings(map);
  }, [rooms]);

  const handleUpdate = (roomNumber: string, field: keyof LocalReading, val: any) => {
    setReadings(prev => ({
      ...prev,
      [roomNumber]: {
        ...prev[roomNumber],
        [field]: val
      }
    }));
  };

  const handleAutoFillSample = () => {
    setReadings(prev => {
      const next = { ...prev };
      occupiedRooms.forEach(rm => {
        if (next[rm.roomNumber]) {
          const currentPrevW = next[rm.roomNumber].prevWater;
          const currentPrevE = next[rm.roomNumber].prevElec;
          next[rm.roomNumber].currWater = currentPrevW + 8;
          if (!next[rm.roomNumber].elecRoll) {
            next[rm.roomNumber].currElec = currentPrevE + 130;
          }
        }
      });
      return next;
    });
  };

  const handleCommit = () => {
    // Validate that no readings are negative without rollover
    for (const rm of occupiedRooms) {
      const rd = readings[rm.roomNumber];
      if (!rd) continue;
      const effectivePrevW = allowEditPrev ? rd.prevWater : rm.prevWater;
      const effectivePrevE = allowEditPrev ? rd.prevElec : rm.prevElec;
      const wUnits = calcMeterUnits(effectivePrevW, rd.currWater, rd.waterRoll);
      const eUnits = calcMeterUnits(effectivePrevE, rd.currElec, rd.elecRoll);
      if (wUnits < 0 || eUnits < 0) {
        alert(`ห้อง ${rm.roomNumber} มีเลขมิเตอร์ใหม่น้อยกว่าเลขเก่า กรุณาตรวจสอบหรือติ๊กวนรอบ (9999->0000)`);
        return;
      }
    }

    const payload = Object.values(readings);
    onCommitInvoices(payload);
  };

  // Calculations for Footer Summary
  let sumRent = 0;
  let sumWater = 0;
  let sumElec = 0;
  let sumParking = 0;
  let sumArrears = 0;
  let sumTotal = 0;

  return (
    <div className="space-y-4 no-print">
      {/* Top Banner & Control Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <span>ตารางจดมิเตอร์น้ำ-ไฟ และออกบิลประจำวันที่ 25 (15 ห้องในหน้าเดียว)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            ระบบจดจำและใส่ <strong className="text-slate-800">เลขมิเตอร์เก่าของเดือนที่แล้ว</strong> ให้อัตโนมัติทุกห้อง เจ้าของหอกรอกเฉพาะ <strong className="text-slate-800">เลขมิเตอร์ใหม่</strong> ระบบจะคำนวณหน่วยใช้ ค่าจอดรถ และทบยอดค้างชำระให้อัตโนมัติ
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold border cursor-pointer transition select-none ${
            allowEditPrev 
              ? 'bg-amber-100 text-amber-900 border-amber-400 shadow-xs ring-1 ring-amber-400' 
              : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-300'
          }`}>
            <input
              type="checkbox"
              checked={allowEditPrev}
              onChange={(e) => setAllowEditPrev(e.target.checked)}
              className="accent-amber-600 rounded w-4 h-4 cursor-pointer"
            />
            <span>{allowEditPrev ? '🔓 กำลังปลดล็อกแก้ไขเลขรอบก่อน' : '✏️ ปลดล็อกแก้ไขเลขรอบก่อน (น้ำ/ไฟ)'}</span>
          </label>
          <button
            type="button"
            onClick={handleAutoFillSample}
            className="px-3 py-2 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 transition flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>เติมเลขตัวอย่างอัตโนมัติ</span>
          </button>
          <button
            type="button"
            onClick={handleCommit}
            className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5 text-white" />
            <span>ยืนยันและออกบิลวันที่ 25 ทั้งหมด</span>
          </button>
        </div>
      </div>

      {/* Main Meter Grid Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-x-auto">
        <table className="w-full text-xs text-left">
          <thead className="bg-slate-900 text-slate-200 uppercase text-[11px]">
            <tr>
              <th className="py-3 px-3">ห้อง</th>
              <th className="py-3 px-3">ผู้เช่า / แพ็กเกจ</th>
              <th className="py-3 px-3 text-right">ค่าห้อง</th>
              <th className="py-3 px-3 text-center">ค่าจอดรถ</th>
              <th className="py-3 px-3 text-center bg-sky-950/70 border-x border-sky-900">
                <span className="flex items-center justify-center gap-1">
                  <Droplets className="w-3 h-3 text-sky-400" />
                  <span>มิเตอร์น้ำ (เก่า → ใหม่)</span>
                </span>
              </th>
              <th className="py-3 px-3 text-right bg-sky-950/70">ค่าน้ำ (บาท)</th>
              <th className="py-3 px-3 text-center bg-amber-950/70 border-x border-amber-900">
                <span className="flex items-center justify-center gap-1">
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>มิเตอร์ไฟ (เก่า → ใหม่)</span>
                </span>
              </th>
              <th className="py-3 px-3 text-right bg-amber-950/70">ค่าไฟ (บาท)</th>
              <th className="py-3 px-3 text-right">ยอดค้างยกมา + ปรับ</th>
              <th className="py-3 px-3 text-right">ยอดสุทธิรอบ 25 ต.ค.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {occupiedRooms.map(rm => {
              const rd = readings[rm.roomNumber] || {
                roomNumber: rm.roomNumber,
                prevWater: rm.prevWater,
                currWater: rm.currWater,
                waterRoll: rm.waterRoll,
                prevElec: rm.prevElec,
                currElec: rm.currElec,
                elecRoll: rm.elecRoll
              };

              const effectivePrevW = allowEditPrev ? rd.prevWater : rm.prevWater;
              const effectivePrevE = allowEditPrev ? rd.prevElec : rm.prevElec;
              const wUnits = calcMeterUnits(effectivePrevW, rd.currWater, rd.waterRoll);
              const eUnits = calcMeterUnits(effectivePrevE, rd.currElec, rd.elecRoll);
              const wInvalid = wUnits < 0;
              const eInvalid = eUnits < 0;

              const wSatang = Math.max(0, wUnits) * settings.waterRateSatang;
              const eSatang = Math.max(0, eUnits) * settings.electricityRateSatang;
              const parkingSatang = rm.parkingFeeSatang || 0;

              const inv = invoices.find(i => i.roomNumber === rm.roomNumber && i.status !== 'ROLLED_OVER');
              const lateSatang = inv ? calcLateFeeSatang(inv, simulatedDate, settings) : 0;
              const arrearsAndLate = (rm.arrearsSatang || 0) + lateSatang;
              const rowTotal = rm.rentSatang + wSatang + eSatang + parkingSatang + arrearsAndLate;

              sumRent += rm.rentSatang;
              sumWater += wSatang;
              sumElec += eSatang;
              sumParking += parkingSatang;
              sumArrears += arrearsAndLate;
              sumTotal += rowTotal;

              return (
                <tr key={rm.roomNumber} className="hover:bg-slate-50 transition-colors">
                  {/* Room Number */}
                  <td className="py-2.5 px-3 font-extrabold text-slate-900 mono-num text-sm">
                    {rm.roomNumber}
                  </td>

                  {/* Tenant */}
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-slate-800">{rm.tenantName}</div>
                    <div className="text-[11px] text-slate-500">{rm.tier} • {rm.phone}</div>
                  </td>

                  {/* Rent */}
                  <td className="py-2.5 px-3 text-right font-semibold mono-num">
                    ฿{formatBaht(rm.rentSatang)}
                  </td>

                  {/* Parking */}
                  <td className="py-2.5 px-3 text-center">
                    {rm.parkingType === 'CAR' ? (
                      <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium text-[11px]">
                        🚗 รถยนต์ ฿{formatBaht(rm.parkingFeeSatang)}
                      </span>
                    ) : rm.parkingType === 'BIKE' ? (
                      <span className="px-2 py-0.5 rounded bg-sky-50 text-sky-700 font-medium text-[11px]">
                        🛵 มอเตอร์ไซค์ ฿{formatBaht(rm.parkingFeeSatang)}
                      </span>
                    ) : (
                      <span className="text-slate-400 text-[11px]">-</span>
                    )}
                  </td>

                  {/* Water Reading Inputs */}
                  <td className="py-2.5 px-3 bg-sky-50/50 border-x border-sky-100">
                    <div className="flex items-center justify-center gap-1.5">
                      {allowEditPrev ? (
                        <input
                          type="number"
                          value={rd.prevWater}
                          onChange={(e) => handleUpdate(rm.roomNumber, 'prevWater', parseInt(e.target.value, 10) || 0)}
                          className="w-16 border border-amber-400 bg-amber-50 rounded px-1.5 py-1 text-right font-bold mono-num text-amber-900 focus:ring-1 focus:ring-amber-500"
                          title="แก้ไขเลขมิเตอร์รอบก่อนหน้า"
                        />
                      ) : (
                        <span
                          onClick={() => setAllowEditPrev(true)}
                          className="text-slate-600 hover:text-amber-800 hover:bg-amber-100/80 px-1 py-0.5 rounded cursor-pointer mono-num w-12 text-right font-bold transition"
                          title="เลขมิเตอร์ดึงมาจากบิลรอบก่อนหน้าอัตโนมัติ (คลิกเพื่อปลดล็อกแก้ไข)"
                        >
                          {rd.prevWater}
                        </span>
                      )}
                      <span className="text-slate-400">→</span>
                      <input
                        type="number"
                        value={rd.currWater}
                        onChange={(e) => handleUpdate(rm.roomNumber, 'currWater', parseInt(e.target.value, 10) || 0)}
                        className={`w-20 border ${wInvalid ? 'border-rose-500 bg-rose-50' : 'border-sky-300 bg-white'} rounded px-2 py-1 text-right font-bold mono-num focus:ring-1 focus:ring-sky-500`}
                      />
                      <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer ml-1" title="ติ๊กกรณีมิเตอร์ 4 หลักวนรอบ 9999 -> 0000">
                        <input
                          type="checkbox"
                          checked={rd.waterRoll}
                          onChange={(e) => handleUpdate(rm.roomNumber, 'waterRoll', e.target.checked)}
                          className="accent-sky-600"
                        />
                        <span>วนรอบ</span>
                      </label>
                    </div>
                    <div className={`text-center text-[10px] mt-0.5 ${wInvalid ? 'text-rose-600 font-bold' : 'text-sky-700 font-medium'}`}>
                      {wInvalid ? '⚠️ เลขใหม่น้อยกว่าเลขเก่า' : `ใช้ ${wUnits} หน่วย × ${formatBaht(settings.waterRateSatang)} บ.`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-sky-900 bg-sky-50/50 mono-num">
                    ฿{formatBaht(wSatang)}
                  </td>

                  {/* Electric Reading Inputs */}
                  <td className="py-2.5 px-3 bg-amber-50/50 border-x border-amber-100">
                    <div className="flex items-center justify-center gap-1.5">
                      {allowEditPrev ? (
                        <input
                          type="number"
                          value={rd.prevElec}
                          onChange={(e) => handleUpdate(rm.roomNumber, 'prevElec', parseInt(e.target.value, 10) || 0)}
                          className="w-16 border border-amber-400 bg-amber-50 rounded px-1.5 py-1 text-right font-bold mono-num text-amber-900 focus:ring-1 focus:ring-amber-500"
                          title="แก้ไขเลขมิเตอร์รอบก่อนหน้า"
                        />
                      ) : (
                        <span
                          onClick={() => setAllowEditPrev(true)}
                          className="text-slate-600 hover:text-amber-800 hover:bg-amber-100/80 px-1 py-0.5 rounded cursor-pointer mono-num w-12 text-right font-bold transition"
                          title="เลขมิเตอร์ดึงมาจากบิลรอบก่อนหน้าอัตโนมัติ (คลิกเพื่อปลดล็อกแก้ไข)"
                        >
                          {rd.prevElec}
                        </span>
                      )}
                      <span className="text-slate-400">→</span>
                      <input
                        type="number"
                        value={rd.currElec}
                        onChange={(e) => handleUpdate(rm.roomNumber, 'currElec', parseInt(e.target.value, 10) || 0)}
                        className={`w-20 border ${eInvalid ? 'border-rose-500 bg-rose-50' : 'border-amber-300 bg-white'} rounded px-2 py-1 text-right font-bold mono-num focus:ring-1 focus:ring-amber-500`}
                      />
                      <label className="flex items-center gap-1 text-[10px] text-slate-600 cursor-pointer ml-1" title="ติ๊กกรณีมิเตอร์ 4 หลักวนรอบ 9999 -> 0000">
                        <input
                          type="checkbox"
                          checked={rd.elecRoll}
                          onChange={(e) => handleUpdate(rm.roomNumber, 'elecRoll', e.target.checked)}
                          className="accent-amber-600"
                        />
                        <span>วนรอบ</span>
                      </label>
                    </div>
                    <div className={`text-center text-[10px] mt-0.5 ${eInvalid ? 'text-rose-600 font-bold' : 'text-amber-800 font-medium'}`}>
                      {eInvalid ? '⚠️ เลขใหม่น้อยกว่าเลขเก่า' : `ใช้ ${eUnits} หน่วย × ${formatBaht(settings.electricityRateSatang)} บ.`}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-semibold text-amber-900 bg-amber-50/50 mono-num">
                    ฿{formatBaht(eSatang)}
                  </td>

                  {/* Arrears + Late */}
                  <td className={`py-2.5 px-3 text-right mono-num ${arrearsAndLate > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}`}>
                    ฿{formatBaht(arrearsAndLate)}
                  </td>

                  {/* Net Total Due */}
                  <td className="py-2.5 px-3 text-right font-extrabold text-slate-900 mono-num text-sm">
                    ฿{formatBaht(rowTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-300 text-xs">
            <tr>
              <td colSpan={2} className="py-3 px-3">
                รวมทั้งสิ้น ({occupiedRooms.length} ห้องที่มีผู้เช่า)
              </td>
              <td className="py-3 px-3 text-right mono-num">฿{formatBaht(sumRent)}</td>
              <td className="py-3 px-3 text-center mono-num text-indigo-700">฿{formatBaht(sumParking)}</td>
              <td className="py-3 px-3 text-center text-slate-500">รวมค่าน้ำ</td>
              <td className="py-3 px-3 text-right text-sky-800 mono-num">฿{formatBaht(sumWater)}</td>
              <td className="py-3 px-3 text-center text-slate-500">รวมค่าไฟ</td>
              <td className="py-3 px-3 text-right text-amber-800 mono-num">฿{formatBaht(sumElec)}</td>
              <td className="py-3 px-3 text-right text-rose-600 mono-num">฿{formatBaht(sumArrears)}</td>
              <td className="py-3 px-3 text-right text-emerald-700 text-base mono-num font-black">
                ฿{formatBaht(sumTotal)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
};
