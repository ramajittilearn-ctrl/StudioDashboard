import React, { useState } from 'react';
import { AppState, TenantLookupTarget } from '../types';
import { calcLateFeeSatang, formatBaht, getLatestRoomInvoice } from '../lib/finance';
import { Search, Car, Bike, Wrench, Smartphone, DollarSign, LogOut, ExternalLink } from 'lucide-react';

interface RoomLiveBoardProps {
  state: AppState;
  onOpenRoomDetail: (roomNumber: string) => void;
  onOpenTenantDetail: (target: TenantLookupTarget) => void;
  onOpenMoveIn: (roomNumber: string) => void;
  onOpenReserve: (roomNumber: string) => void;
  onCancelReserve: (roomNumber: string) => void;
  onMarkMaintenanceDone: (roomNumber: string) => void;
  onOpenPayment: (roomNumber: string) => void;
  onOpenMoveOut: (roomNumber: string) => void;
  onViewLineBill: (roomNumber: string) => void;
  onOpenGoLive: () => void;
  onGoToBilling: () => void;
}

export const RoomLiveBoard: React.FC<RoomLiveBoardProps> = ({
  state,
  onOpenRoomDetail,
  onOpenTenantDetail,
  onOpenMoveIn,
  onOpenReserve,
  onCancelReserve,
  onMarkMaintenanceDone,
  onOpenPayment,
  onOpenMoveOut,
  onViewLineBill,
  onOpenGoLive,
  onGoToBilling
}) => {
  const [filter, setFilter] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');

  const getRoomInvoice = (roomNumber: string) => {
    return getLatestRoomInvoice(state.invoices, roomNumber);
  };

  const floors = [1, 2, 3];

  return (
    <div className="space-y-5 no-print">
      {/* Top Filter and Actions Toolbar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              filter === 'ALL' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            ทั้งหมด (15)
          </button>
          <button
            type="button"
            onClick={() => setFilter('OCCUPIED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'OCCUPIED' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            มีผู้เช่า ({state.rooms.filter(r => r.status === 'OCCUPIED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('AVAILABLE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'AVAILABLE' ? 'bg-emerald-600 text-white' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
            }`}
          >
            ห้องว่าง ({state.rooms.filter(r => r.status === 'AVAILABLE').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('RESERVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'RESERVED' ? 'bg-amber-600 text-white' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'
            }`}
          >
            จองแล้ว ({state.rooms.filter(r => r.status === 'RESERVED').length})
          </button>
          <button
            type="button"
            onClick={() => setFilter('OVERDUE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'OVERDUE' ? 'bg-rose-600 text-white' : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            มียอดค้างชำระ
          </button>
          <button
            type="button"
            onClick={() => setFilter('MAINTENANCE')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition ${
              filter === 'MAINTENANCE' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            ซ่อมบำรุง ({state.rooms.filter(r => r.status === 'MAINTENANCE').length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ค้นหาเลขห้อง หรือ ชื่อผู้เช่า..."
              className="text-xs border border-slate-300 rounded-lg pl-8 pr-3 py-1.5 w-48 sm:w-56 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
          <button
            type="button"
            onClick={onOpenGoLive}
            className="px-3 py-1.5 rounded-lg text-xs font-bold bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
          >
            🚀 ตั้งค่าข้อมูลจริง 15 ห้อง (Go-Live)
          </button>
          <button
            type="button"
            onClick={onGoToBilling}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm"
          >
            ⚡ จดมิเตอร์วันที่ 25
          </button>
        </div>
      </div>

      {/* Floors 1, 2, 3 Grid */}
      <div className="space-y-6">
        {floors.map(floorNum => {
          const floorRooms = state.rooms.filter(rm => {
            if (rm.floor !== floorNum) return false;
            const inv = getRoomInvoice(rm.roomNumber);
            const hasUnpaid = inv && inv.balanceDueSatang > 0;
            if (filter === 'OCCUPIED' && rm.status !== 'OCCUPIED') return false;
            if (filter === 'AVAILABLE' && rm.status !== 'AVAILABLE') return false;
            if (filter === 'RESERVED' && rm.status !== 'RESERVED') return false;
            if (filter === 'MAINTENANCE' && rm.status !== 'MAINTENANCE') return false;
            if (filter === 'OVERDUE' && !hasUnpaid) return false;
            if (search) {
              const text = `${rm.roomNumber} ${rm.tenantName} ${rm.tier} ${rm.phone}`.toLowerCase();
              if (!text.includes(search.toLowerCase())) return false;
            }
            return true;
          });

          if (floorRooms.length === 0) return null;

          return (
            <div key={floorNum} className="space-y-2.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-slate-900 text-white text-xs flex items-center justify-center font-bold">
                    {floorNum}
                  </span>
                  <span>ชั้นที่ {floorNum} (ห้อง {floorNum}01 – {floorNum}05 • ขนาด 21 ตร.ม.)</span>
                </h3>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {floorRooms.map(rm => {
                  const inv = getRoomInvoice(rm.roomNumber);
                  const lateSatang = inv ? calcLateFeeSatang(inv, state.simulatedDate, state.settings) : 0;
                  const totalDueSatang = inv ? (inv.balanceDueSatang + lateSatang) : 0;

                  let borderClass = 'border-slate-200';
                  let statusBadge = null;

                  if (rm.status === 'OCCUPIED') {
                    if (totalDueSatang > 0 && lateSatang > 0) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 border border-rose-300">
                          เลยกำหนด + ค่าปรับ
                        </span>
                      );
                      borderClass = 'border-rose-300 ring-1 ring-rose-200';
                    } else if (inv && inv.status === 'PARTIAL') {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          แบ่งจ่ายแล้วบางส่วน
                        </span>
                      );
                      borderClass = 'border-amber-300';
                    } else if (totalDueSatang > 0) {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sky-100 text-sky-800">
                          รอชำระบิล 25 ต.ค.
                        </span>
                      );
                    } else {
                      statusBadge = (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                          ชำระครบแล้ว
                        </span>
                      );
                    }
                  } else if (rm.status === 'AVAILABLE') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500 text-white">
                        ห้องว่างพร้อมเช่า
                      </span>
                    );
                    borderClass = 'border-emerald-400 ring-1 ring-emerald-100';
                  } else if (rm.status === 'RESERVED') {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                        วางเงินจองแล้ว
                      </span>
                    );
                    borderClass = 'border-amber-400';
                  } else {
                    statusBadge = (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-200 text-slate-700">
                        กำลังซ่อมบำรุง
                      </span>
                    );
                  }

                  const tierBadgeColor =
                    rm.tier === 'GOLD'
                      ? 'bg-amber-50 text-amber-800 border-amber-200'
                      : rm.tier === 'SILVER'
                      ? 'bg-slate-100 text-slate-700 border-slate-300'
                      : 'bg-sky-50 text-sky-800 border-sky-200';

                  return (
                    <div
                      key={rm.roomNumber}
                      className={`bg-white rounded-xl p-3.5 border ${borderClass} shadow-xs flex flex-col justify-between space-y-2.5 transition hover:shadow-md`}
                    >
                      <div className="space-y-2">
                        {/* Header: Room Number & Status */}
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => onOpenRoomDetail(rm.roomNumber)}
                            className="text-base font-extrabold text-slate-900 hover:text-emerald-700 hover:bg-emerald-50 px-1.5 py-0.5 -ml-1.5 rounded-lg mono-num inline-flex items-center gap-1 transition cursor-pointer group"
                            title={`คลิกเพื่อเปิดหน้าต่างรายละเอียดห้อง ${rm.roomNumber} และผู้เช่า`}
                          >
                            <span>ห้อง {rm.roomNumber}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover:text-emerald-600 transition" />
                          </button>
                          {statusBadge}
                        </div>

                        {/* Tier & Monthly Rent */}
                        <div className="flex items-center justify-between text-[11px]">
                          <span className={`px-2 py-0.5 rounded border font-semibold ${tierBadgeColor}`}>
                            {rm.tier}
                          </span>
                          <span className="font-bold text-slate-800 mono-num">
                            ฿{formatBaht(rm.rentSatang)}/ด.
                          </span>
                        </div>

                        {/* Parking Badge */}
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {rm.parkingType === 'CAR' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium">
                              <Car className="w-3 h-3" /> รถยนต์ (+฿{formatBaht(rm.parkingFeeSatang)})
                            </span>
                          ) : rm.parkingType === 'BIKE' ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200 font-medium">
                              <Bike className="w-3 h-3" /> มอเตอร์ไซค์ (+฿{formatBaht(rm.parkingFeeSatang)})
                            </span>
                          ) : (
                            <span className="text-slate-400 text-[10px]">ไม่มีที่จอดรถ</span>
                          )}
                        </div>

                        {/* Tenant Info */}
                        <div className="text-xs text-slate-700 truncate font-medium">
                          {rm.tenantName ? (
                            <div className="truncate">
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTenantDetail({
                                    tenantName: rm.tenantName,
                                    roomNumber: rm.roomNumber
                                  })
                                }
                                className="font-bold text-slate-800 hover:text-emerald-700 hover:underline truncate max-w-full block text-left cursor-pointer transition"
                                title={`คลิกเพื่อดูรายละเอียดทั้งหมดของ ${rm.tenantName}`}
                              >
                                👤 {rm.tenantName}
                              </button>
                              {rm.phone && <span className="text-[10px] text-slate-400 block truncate mono-num">📞 {rm.phone}</span>}
                              {rm.email && <span className="text-[10px] text-slate-400 block truncate">✉️ {rm.email}</span>}
                            </div>
                          ) : (
                            <span className="text-slate-400">ยังไม่มีผู้เช่า</span>
                          )}
                        </div>

                        {/* Meter & Financial Summary Sub-box */}
                        <div className="bg-slate-50 rounded-lg p-2 text-[11px] space-y-1 border border-slate-100">
                          <div className="flex justify-between text-slate-500">
                            <span>💧 น้ำ: <strong className="text-slate-800 mono-num">{rm.currWater}</strong></span>
                            <span>⚡ ไฟ: <strong className="text-slate-800 mono-num">{rm.currElec}</strong></span>
                          </div>

                          {rm.status === 'OCCUPIED' && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                              <span className="text-slate-500">ค้างชำระสุทธิ:</span>
                              <span className={`font-bold mono-num ${totalDueSatang > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                                ฿{formatBaht(totalDueSatang)}
                              </span>
                            </div>
                          )}

                          {rm.status === 'RESERVED' && (
                            <div className="flex justify-between items-center pt-1 border-t border-slate-200/70">
                              <span className="text-amber-700">เงินมัดจำจอง:</span>
                              <span className="font-bold mono-num text-amber-700">
                                ฿{formatBaht(rm.bookingDepositSatang || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Card Action Handlers */}
                      <div>
                        {rm.status === 'AVAILABLE' && (
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onOpenMoveIn(rm.roomNumber)}
                              className="py-1.5 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                            >
                              + เข้าอยู่
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenReserve(rm.roomNumber)}
                              className="py-1.5 px-2 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-semibold hover:bg-amber-100 transition"
                            >
                              📌 รับจอง
                            </button>
                          </div>
                        )}

                        {rm.status === 'RESERVED' && (
                          <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onOpenMoveIn(rm.roomNumber)}
                              className="py-1.5 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition"
                            >
                              ✅ หักเงินจองเข้าอยู่
                            </button>
                            <button
                              type="button"
                              onClick={() => onCancelReserve(rm.roomNumber)}
                              className="py-1.5 px-2 rounded-lg bg-slate-100 text-slate-600 text-[11px] font-medium hover:bg-slate-200 transition"
                            >
                              ยกเลิกจอง
                            </button>
                          </div>
                        )}

                        {rm.status === 'OCCUPIED' && (
                          <div className="grid grid-cols-3 gap-1 pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onViewLineBill(rm.roomNumber)}
                              className="py-1.5 px-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 transition flex items-center justify-center gap-1"
                            >
                              <Smartphone className="w-3 h-3" />
                              <span>บิล LINE</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenPayment(rm.roomNumber)}
                              className="py-1.5 px-1 rounded-lg bg-indigo-50 text-indigo-700 border border-indigo-200 text-[11px] font-bold hover:bg-indigo-100 transition flex items-center justify-center gap-1"
                            >
                              <DollarSign className="w-3 h-3" />
                              <span>รับเงิน</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onOpenMoveOut(rm.roomNumber)}
                              className="py-1.5 px-1 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-[11px] font-semibold hover:bg-rose-100 transition flex items-center justify-center gap-1"
                            >
                              <LogOut className="w-3 h-3" />
                              <span>ย้ายออก</span>
                            </button>
                          </div>
                        )}

                        {rm.status === 'MAINTENANCE' && (
                          <div className="pt-2 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={() => onMarkMaintenanceDone(rm.roomNumber)}
                              className="w-full py-1.5 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-1"
                            >
                              <Wrench className="w-3 h-3" />
                              <span>ซ่อมเสร็จ (เปิดเป็นห้องว่าง)</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
