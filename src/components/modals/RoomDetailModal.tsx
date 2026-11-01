import React, { useEffect } from 'react';
import { AppState, FormSubmission, Room, TenantLookupTarget } from '../../types';
import { calcLateFeeSatang, formatBaht, getLatestRoomInvoice } from '../../lib/finance';
import {
  X,
  User,
  Phone,
  Mail,
  MessageSquare,
  Car,
  Bike,
  Droplets,
  Zap,
  Calendar,
  ShieldCheck,
  FileText,
  DollarSign,
  Smartphone,
  LogOut,
  Wrench,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  CreditCard,
  AlertTriangle,
  CheckCircle2,
  Clock,
  IdCard,
  Bell,
  Copy,
  Check
} from 'lucide-react';

interface RoomDetailModalProps {
  roomNumber: string | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onSelectRoom: (roomNumber: string) => void;
  onOpenTenantDetail: (target: TenantLookupTarget) => void;
  onOpenMoveIn: (roomNumber: string) => void;
  onOpenReserve: (roomNumber: string) => void;
  onCancelReserve: (roomNumber: string) => void;
  onMarkMaintenanceDone: (roomNumber: string) => void;
  onOpenPayment: (invoiceId: string) => void;
  onOpenMoveOut: (roomNumber: string) => void;
  onViewLineBill: (roomNumber: string) => void;
  onOpenRegistrationModal?: () => void;
  onOpenReconcileModal?: () => void;
}

function normalizeName(name?: string): string {
  return String(name || '')
    .replace(/\s*\(จองแล้ว\)\s*/g, '')
    .replace(/\s*\(ย้ายออก.*\)\s*/g, '')
    .trim()
    .toLowerCase();
}

function formatDurationSince(startDate?: string, refDate?: string): string {
  if (!startDate) return '-';
  const start = new Date(startDate);
  const end = refDate ? new Date(refDate) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return startDate;
  const diffDays = Math.floor((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `เข้าพักในอีก ${Math.abs(diffDays)} วัน`;
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (months > 0 && days > 0) return `${months} เดือน ${days} วัน`;
  if (months > 0) return `${months} เดือน`;
  return `${diffDays} วัน`;
}

function extractDriveSlipPreview(sub: FormSubmission): { thumb: string; full: string } | null {
  const driveId =
    sub.driveFileId ||
    (String(sub.slipUrl || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) ||
      String(sub.slipUrl || '').match(/\/d\/([A-Za-z0-9_-]{10,})/))?.[1] ||
    '';
  if (driveId) {
    return {
      thumb: `https://drive.google.com/thumbnail?id=${driveId}&sz=w400`,
      full: `https://drive.google.com/file/d/${driveId}/view`
    };
  }
  if (sub.slipUrl) {
    return { thumb: sub.slipUrl, full: sub.slipUrl };
  }
  return null;
}

export const RoomDetailModal: React.FC<RoomDetailModalProps> = ({
  roomNumber,
  state,
  isOpen,
  onClose,
  onSelectRoom,
  onOpenTenantDetail,
  onOpenMoveIn,
  onOpenReserve,
  onCancelReserve,
  onMarkMaintenanceDone,
  onOpenPayment,
  onOpenMoveOut,
  onViewLineBill,
  onOpenRegistrationModal,
  onOpenReconcileModal
}) => {
  const [copiedField, setCopiedField] = React.useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !roomNumber) return null;

  const sortedRooms = [...state.rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  const currentIdx = sortedRooms.findIndex(r => r.roomNumber === roomNumber);
  const room: Room | undefined = currentIdx >= 0 ? sortedRooms[currentIdx] : undefined;
  if (!room) return null;

  const prevRoom = currentIdx > 0 ? sortedRooms[currentIdx - 1] : null;
  const nextRoom = currentIdx < sortedRooms.length - 1 ? sortedRooms[currentIdx + 1] : null;

  const copyText = (key: string, val?: string) => {
    if (!val || !navigator.clipboard) return;
    navigator.clipboard.writeText(val);
    setCopiedField(key);
    setTimeout(() => setCopiedField(prev => (prev === key ? null : prev)), 1800);
  };

  // Match Google Form registration for active/reserved tenant or pending room requests
  const cleanTenantName = normalizeName(room.tenantName);
  const matchedRegistration = (state.registrations || []).find(reg => {
    if (room.tenantName && normalizeName(reg.tenantName) === cleanTenantName) return true;
    if (room.phone && reg.phone && reg.phone === room.phone) return true;
    return false;
  });

  const pendingRoomRegistrations = (state.registrations || []).filter(
    reg => reg.status === 'PENDING' && reg.requestedRoomNumber === room.roomNumber
  );

  // Room invoices & submissions
  const roomInvoices = [...state.invoices]
    .filter(inv => inv.roomNumber === room.roomNumber && inv.status !== 'ROLLED_OVER')
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));

  const latestInvoice = getLatestRoomInvoice(state.invoices, room.roomNumber);
  const lateFeeSatang = latestInvoice
    ? calcLateFeeSatang(latestInvoice, state.simulatedDate, state.settings)
    : 0;
  const netDueSatang = latestInvoice ? latestInvoice.balanceDueSatang + lateFeeSatang : 0;

  const roomSubmissions = [...(state.formSubmissions || [])]
    .filter(sub => sub.roomNumber === room.roomNumber)
    .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));

  const pastArchives = (state.moveOutArchives || []).filter(a => a.roomNumber === room.roomNumber);

  // Merged display fields for active tenant
  const displayPhone = room.phone || matchedRegistration?.phone || '';
  const displayEmail = room.email || matchedRegistration?.email || '';
  const displayLineId = room.lineId || matchedRegistration?.lineId || '';
  const displayIdCard = room.idCardNumber || matchedRegistration?.idCardNumber || '';
  const displayPlate = room.licensePlate || matchedRegistration?.licensePlate || '';
  const displayNotes = room.notes || matchedRegistration?.notes || '';

  const statusConfig =
    room.status === 'OCCUPIED'
      ? {
          label: 'มีผู้เช่าพักอยู่ (Occupied)',
          badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40'
        }
      : room.status === 'RESERVED'
      ? {
          label: 'วางเงินจองแล้ว (Reserved)',
          badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-400/40'
        }
      : room.status === 'AVAILABLE'
      ? {
          label: 'ห้องว่างพร้อมเช่า (Available)',
          badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-400/40'
        }
      : {
          label: 'กำลังซ่อมบำรุง (Maintenance)',
          badgeClass: 'bg-slate-500/20 text-slate-300 border-slate-400/40'
        };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[60] flex items-center justify-center p-2 sm:p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-5xl w-full max-h-[92vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Large Executive Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-3.5 py-2 rounded-xl bg-emerald-500 text-slate-950 font-black text-xl mono-num shadow-md">
              ห้อง {room.roomNumber}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm sm:text-base font-extrabold text-white">
                  ชั้นที่ {room.floor} • ขนาด 21 ตร.ม.
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusConfig.badgeClass}`}>
                  {statusConfig.label}
                </span>
                <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/10 text-amber-300 border border-white/15">
                  แพ็กเกจ {room.tier} • ฿{formatBaht(room.rentSatang)}/ด.
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ข้อมูลห้องพัก สัญญาเช่า รายละเอียดผู้เช่า มิเตอร์น้ำ-ไฟ และประวัติบิลครบวงจร
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={!prevRoom}
              onClick={() => prevRoom && onSelectRoom(prevRoom.roomNumber)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1 transition"
              title={prevRoom ? `ไปห้อง ${prevRoom.roomNumber}` : 'ห้องแรกสุด'}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{prevRoom ? `ห้อง ${prevRoom.roomNumber}` : 'ก่อนหน้า'}</span>
            </button>
            <button
              type="button"
              disabled={!nextRoom}
              onClick={() => nextRoom && onSelectRoom(nextRoom.roomNumber)}
              className="px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-30 disabled:pointer-events-none text-xs font-semibold flex items-center gap-1 transition"
              title={nextRoom ? `ไปห้อง ${nextRoom.roomNumber}` : 'ห้องสุดท้าย'}
            >
              <span className="hidden sm:inline">{nextRoom ? `ห้อง ${nextRoom.roomNumber}` : 'ถัดไป'}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="ml-2 p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-slate-200 hover:text-white transition"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Pending Google Form Registration Alert for this Room */}
        {pendingRoomRegistrations.length > 0 && (
          <div className="bg-sky-50 border-b border-sky-200 px-5 py-3 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
            <div className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-sky-500 text-white flex items-center justify-center shrink-0">
                <Bell className="w-4 h-4" />
              </span>
              <div>
                <span className="font-bold text-sky-950">
                  มีคำขอลงทะเบียนขอเช่าห้อง {room.roomNumber} จาก Google Form ({pendingRoomRegistrations.length} รายการ):
                </span>{' '}
                {pendingRoomRegistrations.map((reg, i) => (
                  <button
                    key={reg.id}
                    type="button"
                    onClick={() =>
                      onOpenTenantDetail({
                        tenantName: reg.tenantName,
                        roomNumber: room.roomNumber,
                        registrationId: reg.id
                      })
                    }
                    className="font-bold text-sky-700 underline hover:text-sky-900 ml-1"
                  >
                    {reg.tenantName} ({reg.phone || 'ไม่ระบุเบอร์'}){i < pendingRoomRegistrations.length - 1 ? ',' : ''}
                  </button>
                ))}
              </div>
            </div>
            {onOpenRegistrationModal && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRegistrationModal();
                }}
                className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold transition"
              >
                เปิดอนุมัติเข้าห้องพัก
              </button>
            )}
          </div>
        )}

        {/* Scrollable 2-Column Body */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LEFT COLUMN: Tenant Details & Contract */}
            <div className="lg:col-span-6 space-y-4">
              {room.tenantName ? (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
                  <div className="bg-slate-900 text-white px-4 py-3 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs font-bold">
                      <User className="w-4 h-4 text-emerald-400" />
                      <span>รายละเอียดผู้เช่าประจำห้อง {room.roomNumber}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onOpenTenantDetail({
                          tenantName: room.tenantName,
                          roomNumber: room.roomNumber,
                          registrationId: matchedRegistration?.id
                        })
                      }
                      className="px-2.5 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-[11px] font-bold transition flex items-center gap-1"
                    >
                      <span>ดู/แก้ไขข้อมูลผู้เช่าทั้งหมด</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  </div>

                  <div className="p-4 space-y-4 text-xs">
                    {/* Tenant Primary Identity */}
                    <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-black text-lg flex items-center justify-center shadow-sm shrink-0">
                          {room.tenantName.trim().charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTenantDetail({
                                tenantName: room.tenantName,
                                roomNumber: room.roomNumber,
                                registrationId: matchedRegistration?.id
                              })
                            }
                            className="text-base font-extrabold text-slate-900 hover:text-emerald-700 hover:underline text-left flex items-center gap-1.5 group"
                            title="คลิกที่ชื่อผู้เช่าเพื่อดูรายละเอียดของผู้เช่าทั้งหมด"
                          >
                            <span>{room.tenantName}</span>
                            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600" />
                          </button>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex flex-wrap items-center gap-2">
                            <span>เข้าอยู่เมื่อ: <strong className="text-slate-700 mono-num">{room.startDate || '-'}</strong></span>
                            {room.startDate && (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold">
                                ระยะเวลา {formatDurationSince(room.startDate, state.simulatedDate)}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Phone className="w-3 h-3 text-emerald-600" /> เบอร์โทรศัพท์
                        </span>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          {displayPhone ? (
                            <>
                              <a
                                href={`tel:${displayPhone}`}
                                className="font-bold text-sm text-slate-900 hover:text-emerald-700 mono-num"
                              >
                                {displayPhone}
                              </a>
                              <button
                                type="button"
                                onClick={() => copyText('phone', displayPhone)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                title="คัดลอกเบอร์โทร"
                              >
                                {copiedField === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400">ยังไม่ได้ระบุ</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MessageSquare className="w-3 h-3 text-[#00B900]" /> LINE ID
                        </span>
                        <div className="mt-1 flex items-center justify-between gap-1">
                          {displayLineId ? (
                            <>
                              <span className="font-bold text-sm text-slate-900 truncate">{displayLineId}</span>
                              <button
                                type="button"
                                onClick={() => copyText('line', displayLineId)}
                                className="p-1 rounded hover:bg-slate-200 text-slate-500"
                                title="คัดลอก LINE ID"
                              >
                                {copiedField === 'line' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </>
                          ) : (
                            <span className="text-slate-400">ยังไม่ได้ระบุ</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Mail className="w-3 h-3 text-indigo-600" /> อีเมล (Email)
                        </span>
                        <div className="mt-1 font-semibold text-slate-900 truncate">
                          {displayEmail ? (
                            <a href={`mailto:${displayEmail}`} className="hover:text-indigo-700 underline">
                              {displayEmail}
                            </a>
                          ) : (
                            <span className="text-slate-400 font-normal">ยังไม่ได้ระบุ</span>
                          )}
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-xl p-3 border border-slate-100">
                        <span className="text-[11px] text-slate-500 flex items-center gap-1">
                          <IdCard className="w-3 h-3 text-amber-600" /> เลขบัตรประชาชน / เอกสาร
                        </span>
                        <div className="mt-1 font-semibold text-slate-900 mono-num">
                          {displayIdCard || <span className="text-slate-400 font-normal">ยังไม่ได้ระบุ</span>}
                        </div>
                      </div>
                    </div>

                    {/* Contract, Deposit & Vehicle Summary */}
                    <div className="bg-indigo-50/50 rounded-xl p-3.5 border border-indigo-100 space-y-2">
                      <div className="font-bold text-indigo-950 flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-indigo-600" />
                        <span>รายละเอียดสัญญาเช่า เงินประกัน และที่จอดรถ</span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[11px] text-slate-500 block">แพ็กเกจ / ค่าเช่าห้อง:</span>
                          <strong className="text-slate-900 mono-num">
                            {room.tier} • ฿{formatBaht(room.rentSatang)}/เดือน
                          </strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">
                            {room.status === 'RESERVED' ? 'เงินมัดจำจองห้อง:' : 'เงินประกันสัญญาเช่าที่ถือไว้:'}
                          </span>
                          <strong className="text-emerald-700 mono-num">
                            ฿{formatBaht(room.status === 'RESERVED' ? (room.bookingDepositSatang || 0) : room.depositSatang)}
                          </strong>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">ยานพาหนะ / ที่จอดรถ:</span>
                          <span className="font-semibold text-slate-900 inline-flex items-center gap-1">
                            {room.parkingType === 'CAR' ? (
                              <>
                                <Car className="w-3.5 h-3.5 text-indigo-600" /> รถยนต์ (+฿{formatBaht(room.parkingFeeSatang)})
                              </>
                            ) : room.parkingType === 'BIKE' ? (
                              <>
                                <Bike className="w-3.5 h-3.5 text-sky-600" /> มอเตอร์ไซค์ (+฿{formatBaht(room.parkingFeeSatang)})
                              </>
                            ) : (
                              <span className="text-slate-500">ไม่มีที่จอดรถ (฿0)</span>
                            )}
                          </span>
                        </div>
                        <div>
                          <span className="text-[11px] text-slate-500 block">ทะเบียนรถ / ผู้ติดต่อฉุกเฉิน:</span>
                          <strong className="text-slate-800">
                            {displayPlate || room.emergencyContact || '-'}
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Notes & Registration Origin */}
                    {(displayNotes || matchedRegistration) && (
                      <div className="bg-amber-50/60 border border-amber-200/80 rounded-xl p-3 space-y-1">
                        {displayNotes && (
                          <div>
                            <span className="text-[11px] font-bold text-amber-900 block">📝 หมายเหตุผู้เช่า / ห้องพัก:</span>
                            <p className="text-slate-700 mt-0.5 whitespace-pre-line">{displayNotes}</p>
                          </div>
                        )}
                        {matchedRegistration && (
                          <div className="text-[11px] text-amber-800 pt-1 border-t border-amber-200/60 flex items-center justify-between">
                            <span>📋 มีประวัติใบลงทะเบียนจาก Google Form ({matchedRegistration.submittedAt.substring(0, 10)})</span>
                            <button
                              type="button"
                              onClick={() =>
                                onOpenTenantDetail({
                                  tenantName: room.tenantName,
                                  roomNumber: room.roomNumber,
                                  registrationId: matchedRegistration.id
                                })
                              }
                              className="font-bold underline hover:text-amber-950"
                            >
                              ดูใบสมัครเต็ม
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center space-y-3 shadow-xs">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm text-slate-900">
                      ห้อง {room.roomNumber} ขณะนี้ยังไม่มีผู้เช่าพักอาศัย
                    </h4>
                    <p className="text-xs text-slate-500 mt-1">
                      ค่าเช่าเริ่มต้น ฿{formatBaht(room.rentSatang)}/เดือน (แพ็กเกจ {room.tier}) • มิเตอร์น้ำตั้งต้น {room.currWater} • มิเตอร์ไฟตั้งต้น {room.currElec}
                    </p>
                  </div>
                  {room.status === 'AVAILABLE' && (
                    <div className="flex items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenMoveIn(room.roomNumber);
                        }}
                        className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
                      >
                        + ทำสัญญาผู้เช่าเข้าอยู่ใหม่
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenReserve(room.roomNumber);
                        }}
                        className="px-4 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition"
                      >
                        📌 รับจองห้องพัก
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Past Move-Out Tenants of This Room (if any) */}
              {pastArchives.length > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 text-xs shadow-xs">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>ประวัติผู้เช่าเดิมที่เคยพักห้อง {room.roomNumber} ({pastArchives.length} ราย)</span>
                  </div>
                  <div className="space-y-1.5">
                    {pastArchives.slice(0, 3).map(arc => (
                      <div
                        key={arc.id}
                        className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-100"
                      >
                        <div>
                          <button
                            type="button"
                            onClick={() =>
                              onOpenTenantDetail({
                                tenantName: arc.tenantName,
                                roomNumber: arc.roomNumber,
                                archiveId: arc.id
                              })
                            }
                            className="font-bold text-slate-900 hover:text-emerald-700 underline text-left"
                          >
                            {arc.tenantName}
                          </button>
                          <div className="text-[11px] text-slate-500">
                            เข้าพัก {arc.moveInDate} → ย้ายออก {arc.moveOutDate}
                          </div>
                        </div>
                        <span className="text-[11px] font-semibold text-emerald-700 mono-num">
                          คืนประกัน ฿{formatBaht(Math.max(0, arc.netRefundSatang))}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: Meters, Financial Balance, Invoices & Payment Slips */}
            <div className="lg:col-span-6 space-y-4">
              {/* Live Utility Meters & Balance Summary */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-white rounded-2xl p-3.5 border border-sky-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-sky-900">
                    <Droplets className="w-4 h-4 text-sky-500" />
                    <span>มิเตอร์น้ำประปา</span>
                  </div>
                  <div className="mt-1.5 text-lg font-black text-slate-900 mono-num">
                    {room.prevWater} → <span className="text-sky-600">{room.currWater}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    เรท ฿{formatBaht(state.settings.waterRateSatang)}/หน่วย
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-3.5 border border-amber-200/80 shadow-xs">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>มิเตอร์ไฟฟ้า</span>
                  </div>
                  <div className="mt-1.5 text-lg font-black text-slate-900 mono-num">
                    {room.prevElec} → <span className="text-amber-600">{room.currElec}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    เรท ฿{formatBaht(state.settings.electricityRateSatang)}/หน่วย
                  </div>
                </div>

                <div
                  className={`rounded-2xl p-3.5 border shadow-xs ${
                    netDueSatang > 0
                      ? 'bg-rose-50 border-rose-200'
                      : 'bg-emerald-50 border-emerald-200'
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    {netDueSatang > 0 ? (
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    )}
                    <span>ยอดค้างชำระสุทธิ</span>
                  </div>
                  <div
                    className={`mt-1.5 text-lg font-black mono-num ${
                      netDueSatang > 0 ? 'text-rose-600' : 'text-emerald-700'
                    }`}
                  >
                    ฿{formatBaht(netDueSatang)}
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {lateFeeSatang > 0
                      ? `รวมค่าปรับล่าช้า ฿${formatBaht(lateFeeSatang)}`
                      : netDueSatang > 0
                      ? `ครบกำหนด ${latestInvoice?.dueDate || '-'}`
                      : 'ไม่มียอดค้างชำระ'}
                  </div>
                </div>
              </div>

              {/* Invoices History for this Room */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-indigo-600" />
                    <span>ประวัติใบแจ้งหนี้ &amp; การรับชำระเงินของห้อง {room.roomNumber} ({roomInvoices.length} บิล)</span>
                  </div>
                </div>

                {roomInvoices.length === 0 ? (
                  <div className="py-5 text-center text-slate-400">
                    ยังไม่มีประวัติใบแจ้งหนี้ของห้อง {room.roomNumber}
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
                    {roomInvoices.map(inv => {
                      const invLate = calcLateFeeSatang(inv, state.simulatedDate, state.settings);
                      const invDue = inv.balanceDueSatang + invLate;
                      return (
                        <div
                          key={inv.id}
                          className="rounded-xl border border-slate-200 p-3 bg-slate-50/70 space-y-1.5"
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <span className="font-bold text-slate-900 mono-num">{inv.id}</span>
                              <span className="text-slate-500 ml-2">รอบ {inv.billingPeriod}</span>
                              {inv.tenantName && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onOpenTenantDetail({
                                      tenantName: inv.tenantName,
                                      roomNumber: inv.roomNumber
                                    })
                                  }
                                  className="ml-2 text-indigo-700 hover:underline font-semibold"
                                >
                                  ({inv.tenantName})
                                </button>
                              )}
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                invDue === 0
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : inv.paidSatang > 0
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-700'
                              }`}
                            >
                              {invDue === 0 ? 'ชำระครบแล้ว' : `ค้าง ฿${formatBaht(invDue)}`}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-600 flex flex-wrap gap-x-3 gap-y-0.5">
                            <span>ค่าห้อง ฿{formatBaht(inv.rentSatang)}</span>
                            <span>น้ำ {inv.waterUnits} หน่วย (฿{formatBaht(inv.waterSatang)})</span>
                            <span>ไฟ {inv.elecUnits} หน่วย (฿{formatBaht(inv.elecSatang)})</span>
                            {inv.parkingFeeSatang > 0 && <span>จอดรถ ฿{formatBaht(inv.parkingFeeSatang)}</span>}
                          </div>
                          {inv.payments.length > 0 && (
                            <div className="pt-1 border-t border-slate-200/70 space-y-0.5 text-[11px] text-emerald-800">
                              {inv.payments.map(p => (
                                <div key={p.id} className="flex justify-between">
                                  <span>✔ {p.paidAt} ({p.method}) — {p.slipNote}</span>
                                  <strong className="mono-num">฿{formatBaht(p.amountSatang)}</strong>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Google Form Payment Slips for this Room */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-3 shadow-xs text-xs">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>สลิปแจ้งโอนผ่าน Google Form ของห้อง {room.roomNumber} ({roomSubmissions.length})</span>
                  </div>
                  {roomSubmissions.some(s => s.status === 'PENDING') && onOpenReconcileModal && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenReconcileModal();
                      }}
                      className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px]"
                    >
                      ไปหน้าตรวจสลิป
                    </button>
                  )}
                </div>

                {roomSubmissions.length === 0 ? (
                  <div className="py-4 text-center text-slate-400">
                    ยังไม่มีรายการส่งสลิปผ่าน Google Form ของห้องนี้
                  </div>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {roomSubmissions.map(sub => {
                      const slip = extractDriveSlipPreview(sub);
                      return (
                        <div
                          key={sub.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200"
                        >
                          <div className="min-w-0">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5">
                              <span className="mono-num text-emerald-700">฿{formatBaht(sub.amountSatang)}</span>
                              <span>•</span>
                              <button
                                type="button"
                                onClick={() =>
                                  onOpenTenantDetail({
                                    tenantName: sub.tenantName,
                                    roomNumber: sub.roomNumber
                                  })
                                }
                                className="hover:underline truncate text-left"
                              >
                                {sub.tenantName}
                              </button>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              โอน {sub.transferDate} {sub.transferTime}
                              {sub.paymentCategories ? ` • ${sub.paymentCategories}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                sub.status === 'RECONCILED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : sub.status === 'REJECTED'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {sub.status === 'RECONCILED' ? 'อนุมัติแล้ว' : sub.status === 'REJECTED' ? 'ปฏิเสธ' : 'รอตรวจ'}
                            </span>
                            {slip && (
                              <a
                                href={slip.full}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800 inline-flex items-center gap-1"
                              >
                                <span>ดูสลิป</span>
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Action Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-xs text-slate-500">
            💡 คลิกที่ <strong className="text-slate-800">ชื่อผู้เช่า</strong> เพื่อเปิดหน้าต่างข้อมูลผู้เช่าเชิงลึกทั้งหมดและแก้ไขข้อมูลได้ทันที
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {room.status === 'OCCUPIED' && (
              <>
                <button
                  type="button"
                  onClick={() =>
                    onOpenTenantDetail({
                      tenantName: room.tenantName,
                      roomNumber: room.roomNumber,
                      registrationId: matchedRegistration?.id
                    })
                  }
                  className="px-3.5 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-bold hover:bg-emerald-100 transition flex items-center gap-1.5"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>ข้อมูลผู้เช่าทั้งหมด</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onViewLineBill(room.roomNumber);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>บิล LINE &amp; QR</span>
                </button>
                {latestInvoice && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenPayment(latestInvoice.id);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 transition flex items-center gap-1.5"
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>บันทึกรับเงิน</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMoveOut(room.roomNumber);
                  }}
                  className="px-3.5 py-2 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold hover:bg-rose-100 transition flex items-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>ย้ายออก</span>
                </button>
              </>
            )}

            {room.status === 'RESERVED' && (
              <>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenMoveIn(room.roomNumber);
                  }}
                  className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition"
                >
                  ✅ หักเงินจองเข้าอยู่
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onCancelReserve(room.roomNumber);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-semibold hover:bg-slate-200 transition"
                >
                  ยกเลิกการจอง
                </button>
              </>
            )}

            {room.status === 'MAINTENANCE' && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onMarkMaintenanceDone(room.roomNumber);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition flex items-center gap-1.5"
              >
                <Wrench className="w-3.5 h-3.5" />
                <span>ซ่อมเสร็จ (เปิดเป็นห้องว่าง)</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition"
            >
              ปิดหน้าต่าง
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
