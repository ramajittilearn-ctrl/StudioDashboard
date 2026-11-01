import React, { useState, useEffect } from 'react';
import {
  AppState,
  FormSubmission,
  MoveOutArchive,
  ParkingType,
  Room,
  TenantLookupTarget,
  TenantRegistration
} from '../../types';
import { calcLateFeeSatang, formatBaht, fromSatang, toSatang } from '../../lib/finance';
import {
  X,
  User,
  Phone,
  Mail,
  MessageSquare,
  IdCard,
  ShieldCheck,
  Car,
  Bike,
  Calendar,
  FileText,
  CreditCard,
  Edit3,
  Save,
  Copy,
  Check,
  ExternalLink,
  Building2,
  Droplets,
  Zap,
  AlertTriangle,
  CheckCircle2,
  Archive,
  DollarSign,
  Smartphone
} from 'lucide-react';

interface TenantDetailModalProps {
  target: TenantLookupTarget | null;
  state: AppState;
  isOpen: boolean;
  onClose: () => void;
  onOpenRoomDetail: (roomNumber: string) => void;
  onSaveTenantDetails: (payload: {
    roomNumber: string;
    tenantName: string;
    phone: string;
    email: string;
    lineId: string;
    idCardNumber: string;
    licensePlate: string;
    emergencyContact: string;
    startDate: string;
    contractEndDate: string;
    depositSatang: number;
    parkingType: ParkingType;
    parkingFeeSatang: number;
    notes: string;
  }) => Promise<void>;
  onOpenPayment?: (invoiceId: string) => void;
  onViewLineBill?: (roomNumber: string) => void;
}

function normalizeTenantName(raw?: string): string {
  return String(raw || '')
    .replace(/\s*\(จองแล้ว\)\s*/g, '')
    .replace(/\s*\(ย้ายออก.*\)\s*/g, '')
    .trim()
    .toLowerCase();
}

function formatStayDuration(startDate?: string, endDate?: string): string {
  if (!startDate) return '-';
  const s = new Date(startDate);
  const e = endDate ? new Date(endDate) : new Date();
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return startDate;
  const diffDays = Math.floor((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return `เข้าพักในอีก ${Math.abs(diffDays)} วัน`;
  const months = Math.floor(diffDays / 30);
  const days = diffDays % 30;
  if (months > 0 && days > 0) return `${months} เดือน ${days} วัน`;
  if (months > 0) return `${months} เดือน`;
  return `${diffDays} วัน`;
}

function getSlipLinks(sub: FormSubmission): { thumb: string; full: string } | null {
  const driveId =
    sub.driveFileId ||
    (String(sub.slipUrl || '').match(/[?&]id=([A-Za-z0-9_-]{10,})/) ||
      String(sub.slipUrl || '').match(/\/d\/([A-Za-z0-9_-]{10,})/))?.[1] ||
    '';
  if (driveId) {
    return {
      thumb: `https://drive.google.com/thumbnail?id=${driveId}&sz=w300`,
      full: `https://drive.google.com/file/d/${driveId}/view`
    };
  }
  if (sub.slipUrl) {
    return { thumb: sub.slipUrl, full: sub.slipUrl };
  }
  return null;
}

export const TenantDetailModal: React.FC<TenantDetailModalProps> = ({
  target,
  state,
  isOpen,
  onClose,
  onOpenRoomDetail,
  onSaveTenantDetails,
  onOpenPayment,
  onViewLineBill
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Editable form state
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editLineId, setEditLineId] = useState('');
  const [editIdCard, setEditIdCard] = useState('');
  const [editLicensePlate, setEditLicensePlate] = useState('');
  const [editEmergencyContact, setEditEmergencyContact] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [editContractEndDate, setEditContractEndDate] = useState('');
  const [editDepositBaht, setEditDepositBaht] = useState<number>(0);
  const [editParkingType, setEditParkingType] = useState<ParkingType>('NONE');
  const [editParkingFeeBaht, setEditParkingFeeBaht] = useState<number>(0);
  const [editNotes, setEditNotes] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  // Resolve all tenant data across rooms, registrations, invoices, formSubmissions, archives, settlements
  const targetNormName = normalizeTenantName(target?.tenantName);

  const matchedRoom: Room | null = React.useMemo(() => {
    if (!target) return null;
    if (target.roomNumber) {
      const exactRoom = state.rooms.find(r => r.roomNumber === target.roomNumber);
      if (
        exactRoom &&
        exactRoom.tenantName &&
        (!targetNormName || normalizeTenantName(exactRoom.tenantName) === targetNormName)
      ) {
        return exactRoom;
      }
    }
    if (targetNormName) {
      return state.rooms.find(r => r.tenantName && normalizeTenantName(r.tenantName) === targetNormName) || null;
    }
    return null;
  }, [target, state.rooms, targetNormName]);

  const matchedRegistrations: TenantRegistration[] = React.useMemo(() => {
    if (!target) return [];
    const regs = state.registrations || [];
    return regs.filter(reg => {
      if (target.registrationId && reg.id === target.registrationId) return true;
      if (targetNormName && normalizeTenantName(reg.tenantName) === targetNormName) return true;
      if (matchedRoom?.phone && reg.phone && reg.phone === matchedRoom.phone) return true;
      if (matchedRoom?.email && reg.email && reg.email.toLowerCase() === matchedRoom.email.toLowerCase()) return true;
      return false;
    });
  }, [target, state.registrations, targetNormName, matchedRoom]);

  const primaryReg = matchedRegistrations[0] || null;

  const matchedArchives: MoveOutArchive[] = React.useMemo(() => {
    if (!target) return [];
    const arcs = state.moveOutArchives || [];
    return arcs.filter(a => {
      if (target.archiveId && a.id === target.archiveId) return true;
      if (targetNormName && normalizeTenantName(a.tenantName) === targetNormName) return true;
      return false;
    });
  }, [target, state.moveOutArchives, targetNormName]);

  const primaryArchive = matchedArchives[0] || null;

  const matchedSettlements = React.useMemo(() => {
    if (!target) return [];
    return (state.settlements || []).filter(st => {
      if (targetNormName && normalizeTenantName(st.tenantName) === targetNormName) return true;
      return false;
    });
  }, [target, state.settlements, targetNormName]);

  const effectiveRoomNumber =
    matchedRoom?.roomNumber ||
    target?.roomNumber ||
    primaryReg?.requestedRoomNumber ||
    primaryArchive?.roomNumber ||
    matchedSettlements[0]?.roomNumber ||
    '';

  const tenantInvoices = React.useMemo(() => {
    if (!target) return [];
    return [...state.invoices]
      .filter(inv => {
        if (inv.status === 'ROLLED_OVER') return false;
        if (targetNormName && normalizeTenantName(inv.tenantName) === targetNormName) return true;
        if (matchedRoom && inv.roomNumber === matchedRoom.roomNumber && !inv.tenantName) return true;
        return false;
      })
      .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
  }, [target, state.invoices, targetNormName, matchedRoom]);

  const tenantSubmissions = React.useMemo(() => {
    if (!target) return [];
    return [...(state.formSubmissions || [])]
      .filter(sub => {
        if (targetNormName && normalizeTenantName(sub.tenantName) === targetNormName) return true;
        if (matchedRoom && sub.roomNumber === matchedRoom.roomNumber) return true;
        return false;
      })
      .sort((a, b) => String(b.submittedAt || '').localeCompare(String(a.submittedAt || '')));
  }, [target, state.formSubmissions, targetNormName, matchedRoom]);

  // Unified merged display values
  const fullName =
    matchedRoom?.tenantName ||
    primaryReg?.tenantName ||
    primaryArchive?.tenantName ||
    target?.tenantName ||
    '-';
  const phone = matchedRoom?.phone || primaryReg?.phone || primaryArchive?.phone || '';
  const email = matchedRoom?.email || primaryReg?.email || primaryArchive?.email || '';
  const lineId = matchedRoom?.lineId || primaryReg?.lineId || primaryArchive?.lineId || '';
  const idCardNumber =
    matchedRoom?.idCardNumber || primaryReg?.idCardNumber || primaryArchive?.idCardNumber || '';
  const licensePlate =
    matchedRoom?.licensePlate || primaryReg?.licensePlate || primaryArchive?.licensePlate || '';
  const emergencyContact =
    matchedRoom?.emergencyContact || primaryArchive?.emergencyContact || '';
  const startDate =
    matchedRoom?.startDate || primaryReg?.plannedMoveInDate || primaryArchive?.moveInDate || '';
  const contractEndDate = matchedRoom?.contractEndDate || primaryArchive?.moveOutDate || '';
  const notes =
    matchedRoom?.notes || primaryReg?.notes || primaryArchive?.notes || primaryArchive?.deductionNote || '';

  useEffect(() => {
    if (!isOpen) {
      setIsEditing(false);
      return;
    }
    setIsEditing(false);
    setEditName(fullName);
    setEditPhone(phone);
    setEditEmail(email);
    setEditLineId(lineId);
    setEditIdCard(idCardNumber);
    setEditLicensePlate(licensePlate);
    setEditEmergencyContact(emergencyContact);
    setEditStartDate(startDate);
    setEditContractEndDate(matchedRoom?.contractEndDate || '');
    setEditDepositBaht(fromSatang(matchedRoom?.depositSatang || 0));
    setEditParkingType(matchedRoom?.parkingType || primaryReg?.vehicleType || 'NONE');
    setEditParkingFeeBaht(fromSatang(matchedRoom?.parkingFeeSatang || 0));
    setEditNotes(matchedRoom?.notes || primaryReg?.notes || '');
  }, [isOpen, target?.tenantName, target?.roomNumber, target?.registrationId, target?.archiveId, matchedRoom?.roomNumber]);

  if (!isOpen || !target) return null;

  const copyField = (key: string, val?: string) => {
    if (!val || !navigator.clipboard) return;
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(prev => (prev === key ? null : prev)), 1800);
  };

  // Financial aggregates for this tenant
  let totalBilledSatang = 0;
  let totalPaidSatang = 0;
  let totalCurrentDueSatang = 0;
  let paidInvoicesCount = 0;

  tenantInvoices.forEach(inv => {
    const late = calcLateFeeSatang(inv, state.simulatedDate, state.settings);
    totalBilledSatang += inv.totalSatang;
    totalPaidSatang += inv.paidSatang;
    totalCurrentDueSatang += inv.balanceDueSatang + late;
    if (inv.balanceDueSatang === 0) paidInvoicesCount += 1;
  });

  const handleParkingTypeEdit = (pType: ParkingType) => {
    setEditParkingType(pType);
    if (pType === 'CAR') setEditParkingFeeBaht(fromSatang(state.settings.carParkingRateSatang));
    else if (pType === 'BIKE') setEditParkingFeeBaht(fromSatang(state.settings.bikeParkingRateSatang));
    else setEditParkingFeeBaht(0);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedRoom) return;
    setIsSaving(true);
    try {
      await onSaveTenantDetails({
        roomNumber: matchedRoom.roomNumber,
        tenantName: editName,
        phone: editPhone,
        email: editEmail,
        lineId: editLineId,
        idCardNumber: editIdCard,
        licensePlate: editLicensePlate,
        emergencyContact: editEmergencyContact,
        startDate: editStartDate,
        contractEndDate: editContractEndDate,
        depositSatang: toSatang(editDepositBaht),
        parkingType: editParkingType,
        parkingFeeSatang: toSatang(editParkingFeeBaht),
        notes: editNotes
      });
      setIsEditing(false);
    } finally {
      setIsSaving(false);
    }
  };

  const statusBadge = matchedRoom
    ? matchedRoom.status === 'RESERVED'
      ? { label: `วางเงินจองห้อง ${matchedRoom.roomNumber}`, cls: 'bg-amber-500/20 text-amber-300 border-amber-400/40' }
      : { label: `ผู้เช่าปัจจุบัน • ห้อง ${matchedRoom.roomNumber}`, cls: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/40' }
    : primaryArchive || matchedSettlements.length > 0
    ? { label: 'ผู้เช่าเดิม (ย้ายออกแล้ว)', cls: 'bg-slate-500/30 text-slate-200 border-slate-400/40' }
    : primaryReg?.status === 'PENDING'
    ? { label: `ผู้สมัครรออนุมัติ • ขอห้อง ${primaryReg.requestedRoomNumber}`, cls: 'bg-sky-500/20 text-sky-300 border-sky-400/40' }
    : { label: 'ข้อมูลประวัติผู้เช่า', cls: 'bg-indigo-500/20 text-indigo-200 border-indigo-400/40' };

  return (
    <div
      className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[60] flex items-center justify-center p-2 sm:p-4 no-print"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[92vh] border border-slate-200 shadow-2xl overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Profile Header */}
        <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white px-5 py-4 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 font-black text-xl flex items-center justify-center shadow-lg shrink-0">
              {fullName.trim().charAt(0).toUpperCase()}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  {fullName}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusBadge.cls}`}>
                  {statusBadge.label}
                </span>
                {effectiveRoomNumber && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenRoomDetail(effectiveRoomNumber);
                    }}
                    className="px-2.5 py-0.5 rounded-lg bg-white/10 hover:bg-white/20 text-white border border-white/20 text-xs font-bold mono-num flex items-center gap-1 transition"
                    title={`เปิดหน้าต่างรายละเอียดห้อง ${effectiveRoomNumber}`}
                  >
                    <Building2 className="w-3 h-3 text-emerald-300" />
                    <span>ดูห้อง {effectiveRoomNumber}</span>
                  </button>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                ทะเบียนประวัติผู้เช่าแบบครบวงจร: ข้อมูลส่วนตัว สัญญาเช่า ใบสมัคร Google Form ประวัติบิล และสลิปโอนเงินทั้งหมด
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {matchedRoom && !isEditing && (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5 shadow-sm"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>แก้ไขข้อมูลผู้เช่า</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl bg-white/10 hover:bg-rose-500/80 text-slate-200 hover:text-white transition"
              title="ปิดหน้าต่าง"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="p-5 overflow-y-auto flex-1 bg-slate-50/70 space-y-5 text-xs">
          {/* EDIT FORM MODE (if admin clicked Edit on an active/reserved room tenant) */}
          {isEditing && matchedRoom && (
            <form
              onSubmit={handleSave}
              className="bg-white rounded-2xl border-2 border-amber-400 p-4 sm:p-5 shadow-md space-y-4"
            >
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-amber-600" />
                  <span>แก้ไขรายละเอียดผู้เช่า — ห้อง {matchedRoom.roomNumber}</span>
                </div>
                <span className="text-[11px] text-slate-500">บันทึกตรงลง Cloud Firebase อัตโนมัติ</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ชื่อ-นามสกุล ผู้เช่า *</label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 font-semibold"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เบอร์โทรศัพท์</label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="08x-xxx-xxxx"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">LINE ID</label>
                  <input
                    type="text"
                    value={editLineId}
                    onChange={(e) => setEditLineId(e.target.value)}
                    placeholder="เช่น somchai.line"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">อีเมล (Email)</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="tenant@example.com"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เลขบัตรประชาชน / Passport</label>
                  <input
                    type="text"
                    value={editIdCard}
                    onChange={(e) => setEditIdCard(e.target.value)}
                    placeholder="x-xxxx-xxxxx-xx-x"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ผู้ติดต่อฉุกเฉิน &amp; เบอร์โทร</label>
                  <input
                    type="text"
                    value={editEmergencyContact}
                    onChange={(e) => setEditEmergencyContact(e.target.value)}
                    placeholder="เช่น มารดา 081-xxx-xxxx"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันเริ่มเข้าพัก</label>
                  <input
                    type="date"
                    value={editStartDate}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">วันสิ้นสุดสัญญาเช่า (ถ้ามี)</label>
                  <input
                    type="date"
                    value={editContractEndDate}
                    onChange={(e) => setEditContractEndDate(e.target.value)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">เงินประกันสัญญาเช่า (บาท)</label>
                  <input
                    type="number"
                    value={editDepositBaht}
                    onChange={(e) => setEditDepositBaht(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ประเภทยานพาหนะ</label>
                  <select
                    value={editParkingType}
                    onChange={(e) => handleParkingTypeEdit(e.target.value as ParkingType)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  >
                    <option value="NONE">ไม่มีที่จอดรถ (฿0)</option>
                    <option value="BIKE">🛵 มอเตอร์ไซค์</option>
                    <option value="CAR">🚗 รถยนต์</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ทะเบียนรถ</label>
                  <input
                    type="text"
                    value={editLicensePlate}
                    onChange={(e) => setEditLicensePlate(e.target.value)}
                    placeholder="เช่น 1กข 1234 กทม"
                    className="w-full border border-slate-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">ค่าที่จอดรถรายเดือน (บาท)</label>
                  <input
                    type="number"
                    value={editParkingFeeBaht}
                    onChange={(e) => setEditParkingFeeBaht(parseFloat(e.target.value) || 0)}
                    className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">หมายเหตุเพิ่มเติมของผู้เช่า</label>
                <textarea
                  rows={2}
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  placeholder="บันทึกเงื่อนไขพิเศษ รายละเอียดเพิ่มเติม..."
                  className="w-full border border-slate-300 rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'กำลังบันทึก...' : 'บันทึกข้อมูลผู้เช่า'}</span>
                </button>
              </div>
            </form>
          )}

          {/* 1. Financial Summary KPI Strip for This Tenant */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-2xl p-3.5 border border-slate-200 shadow-xs">
              <span className="text-[11px] text-slate-500 block">ยอดเรียกเก็บสะสมทั้งหมด</span>
              <span className="text-lg font-black text-slate-900 mono-num mt-0.5 block">
                ฿{formatBaht(totalBilledSatang)}
              </span>
              <span className="text-[10px] text-slate-400">จากทั้งหมด {tenantInvoices.length} งวดบิล</span>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-emerald-200 shadow-xs">
              <span className="text-[11px] text-emerald-700 font-semibold block">ชำระแล้วสะสมทั้งหมด</span>
              <span className="text-lg font-black text-emerald-600 mono-num mt-0.5 block">
                ฿{formatBaht(totalPaidSatang)}
              </span>
              <span className="text-[10px] text-emerald-700">ปิดบิลครบแล้ว {paidInvoicesCount} งวด</span>
            </div>

            <div
              className={`rounded-2xl p-3.5 border shadow-xs ${
                totalCurrentDueSatang > 0 ? 'bg-rose-50 border-rose-200' : 'bg-white border-slate-200'
              }`}
            >
              <span className="text-[11px] text-slate-600 font-semibold block">ยอดค้างชำระปัจจุบัน</span>
              <span
                className={`text-lg font-black mono-num mt-0.5 block ${
                  totalCurrentDueSatang > 0 ? 'text-rose-600' : 'text-emerald-600'
                }`}
              >
                ฿{formatBaht(totalCurrentDueSatang)}
              </span>
              <span className="text-[10px] text-slate-500">
                {totalCurrentDueSatang > 0 ? 'รวมค่าปรับเกินกำหนดแล้ว' : 'ไม่มีหนี้ค้างชำระ'}
              </span>
            </div>

            <div className="bg-white rounded-2xl p-3.5 border border-indigo-200 shadow-xs">
              <span className="text-[11px] text-indigo-700 font-semibold block">เงินประกันสัญญาเช่า</span>
              <span className="text-lg font-black text-indigo-700 mono-num mt-0.5 block">
                ฿{formatBaht(
                  matchedRoom
                    ? matchedRoom.status === 'RESERVED'
                      ? matchedRoom.bookingDepositSatang || 0
                      : matchedRoom.depositSatang
                    : primaryArchive?.depositSatang || primaryReg?.depositPaidSatang || 0
                )}
              </span>
              <span className="text-[10px] text-slate-500">
                {matchedRoom?.status === 'RESERVED' ? 'เงินมัดจำจองห้อง' : 'เงินประกันความเสียหาย'}
              </span>
            </div>
          </div>

          {/* 2. Personal & Contact Info + Contract & Vehicle Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Personal & Contact Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <User className="w-4 h-4 text-emerald-600" />
                <span>1. ข้อมูลส่วนตัวและช่องทางติดต่อทั้งหมด</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ชื่อ-นามสกุล:</span>
                  <strong className="text-slate-900 text-sm">{fullName}</strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-emerald-600" /> เบอร์โทรศัพท์:
                  </span>
                  {phone ? (
                    <div className="flex items-center gap-1.5">
                      <a href={`tel:${phone}`} className="font-bold text-slate-900 hover:text-emerald-700 mono-num">
                        {phone}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyField('phone', phone)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        title="คัดลอกเบอร์โทร"
                      >
                        {copiedKey === 'phone' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">ไม่ระบุ</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <MessageSquare className="w-3.5 h-3.5 text-[#00B900]" /> LINE ID:
                  </span>
                  {lineId ? (
                    <div className="flex items-center gap-1.5">
                      <strong className="text-slate-900">{lineId}</strong>
                      <button
                        type="button"
                        onClick={() => copyField('line', lineId)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        title="คัดลอก LINE ID"
                      >
                        {copiedKey === 'line' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">ไม่ระบุ</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Mail className="w-3.5 h-3.5 text-indigo-600" /> อีเมล (Email):
                  </span>
                  {email ? (
                    <div className="flex items-center gap-1.5">
                      <a href={`mailto:${email}`} className="font-semibold text-indigo-700 hover:underline">
                        {email}
                      </a>
                      <button
                        type="button"
                        onClick={() => copyField('email', email)}
                        className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-slate-700"
                        title="คัดลอกอีเมล"
                      >
                        {copiedKey === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  ) : (
                    <span className="text-slate-400">ไม่ระบุ</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <IdCard className="w-3.5 h-3.5 text-amber-600" /> เลขบัตรประชาชน / Passport:
                  </span>
                  <strong className="text-slate-900 mono-num">{idCardNumber || 'ไม่ระบุ'}</strong>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">ผู้ติดต่อฉุกเฉิน:</span>
                  <strong className="text-slate-900">{emergencyContact || 'ไม่ระบุ'}</strong>
                </div>
              </div>

              {notes && (
                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <span className="text-[11px] font-bold text-amber-900 block">📝 หมายเหตุผู้เช่า:</span>
                  <p className="text-slate-700 mt-0.5 whitespace-pre-line">{notes}</p>
                </div>
              )}
            </div>

            {/* Lease, Room & Vehicle Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>2. ข้อมูลสัญญาเช่า ห้องพัก มิเตอร์ &amp; ยานพาหนะ</span>
              </div>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">หมายเลขห้องพัก:</span>
                  {effectiveRoomNumber ? (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenRoomDetail(effectiveRoomNumber);
                      }}
                      className="px-2.5 py-0.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold mono-num flex items-center gap-1"
                    >
                      <span>ห้อง {effectiveRoomNumber}</span>
                      <ExternalLink className="w-3 h-3 text-emerald-400" />
                    </button>
                  ) : (
                    <span className="text-slate-400">-</span>
                  )}
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">แพ็กเกจ / อัตราค่าเช่า:</span>
                  <strong className="text-slate-900 mono-num">
                    {matchedRoom ? `${matchedRoom.tier} • ฿${formatBaht(matchedRoom.rentSatang)}/เดือน` : '-'}
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" /> วันที่เริ่มสัญญา / เข้าอยู่:
                  </span>
                  <span className="font-bold text-slate-900 mono-num">
                    {startDate || '-'}{' '}
                    {startDate && (
                      <span className="text-[11px] font-semibold text-emerald-700 ml-1">
                        ({formatStayDuration(startDate, primaryArchive?.moveOutDate || state.simulatedDate)})
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">วันสิ้นสุดสัญญา / วันย้ายออก:</span>
                  <strong className="text-slate-900 mono-num">
                    {contractEndDate || 'สัญญารายเดือนต่อเนื่อง'}
                  </strong>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ยานพาหนะ &amp; ที่จอดรถ:</span>
                  <span className="font-bold text-slate-900 inline-flex items-center gap-1">
                    {(matchedRoom?.parkingType || primaryReg?.vehicleType) === 'CAR' ? (
                      <>
                        <Car className="w-3.5 h-3.5 text-indigo-600" /> รถยนต์ (+฿{formatBaht(matchedRoom?.parkingFeeSatang || state.settings.carParkingRateSatang)}/ด.)
                      </>
                    ) : (matchedRoom?.parkingType || primaryReg?.vehicleType) === 'BIKE' ? (
                      <>
                        <Bike className="w-3.5 h-3.5 text-sky-600" /> มอเตอร์ไซค์ (+฿{formatBaht(matchedRoom?.parkingFeeSatang || state.settings.bikeParkingRateSatang)}/ด.)
                      </>
                    ) : (
                      <span className="text-slate-400 font-normal">ไม่มีที่จอดรถ</span>
                    )}
                  </span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-slate-100">
                  <span className="text-slate-500">ทะเบียนรถ:</span>
                  <strong className="text-slate-900">{licensePlate || 'ไม่ระบุ'}</strong>
                </div>

                {matchedRoom && (
                  <div className="flex items-center justify-between py-1">
                    <span className="text-slate-500">เลขมิเตอร์ปัจจุบัน (น้ำ / ไฟ):</span>
                    <span className="font-bold mono-num text-slate-900 flex items-center gap-3">
                      <span className="text-sky-700 flex items-center gap-1">
                        <Droplets className="w-3.5 h-3.5" /> {matchedRoom.currWater}
                      </span>
                      <span className="text-amber-700 flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> {matchedRoom.currElec}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 3. Google Form Registration Record (if submitted via Google Form) */}
          {matchedRegistrations.length > 0 && (
            <div className="bg-white rounded-2xl border border-sky-200 p-4 shadow-xs space-y-3">
              <div className="font-bold text-sm text-sky-950 flex items-center justify-between border-b border-sky-100 pb-2">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-sky-600" />
                  <span>3. ข้อมูลต้นฉบับจากใบลงทะเบียน Google Form ({matchedRegistrations.length} รายการ)</span>
                </span>
              </div>
              <div className="space-y-2">
                {matchedRegistrations.map(reg => (
                  <div
                    key={reg.id}
                    className="rounded-xl bg-sky-50/50 border border-sky-100 p-3 grid grid-cols-1 sm:grid-cols-3 gap-2"
                  >
                    <div>
                      <span className="text-[11px] text-slate-500 block">วัน-เวลาที่ส่งฟอร์ม:</span>
                      <strong className="text-slate-900 mono-num">{reg.submittedAt.replace('T', ' ').substring(0, 16)}</strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">ห้องที่แจ้งขอ / วันแจ้งเข้าอยู่:</span>
                      <strong className="text-slate-900 mono-num">
                        ห้อง {reg.requestedRoomNumber} • เข้า {reg.plannedMoveInDate}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-500 block">สถานะคำขอ:</span>
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          reg.status === 'APPROVED'
                            ? 'bg-emerald-100 text-emerald-800'
                            : reg.status === 'REJECTED'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {reg.status === 'APPROVED' ? 'อนุมัติเข้าพักแล้ว' : reg.status === 'REJECTED' ? 'ปฏิเสธคำขอ' : 'รออนุมัติ'}
                      </span>
                    </div>
                    {(reg.email || reg.phone || reg.notes) && (
                      <div className="sm:col-span-3 text-[11px] text-slate-600 pt-1 border-t border-sky-100 flex flex-wrap gap-x-4 gap-y-1">
                        {reg.phone && <span>📞 เบอร์ที่แจ้ง: <strong>{reg.phone}</strong></span>}
                        {reg.email && <span>✉️ อีเมลที่แจ้ง: <strong>{reg.email}</strong></span>}
                        {reg.notes && <span>📝 หมายเหตุที่กรอก: <strong>{reg.notes}</strong></span>}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 4. Full Billing & Payment History Table */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-3">
            <div className="font-bold text-sm text-slate-900 flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-indigo-600" />
                <span>
                  {matchedRegistrations.length > 0 ? '4.' : '3.'} ประวัติใบแจ้งหนี้และการชำระเงินทั้งหมด ({tenantInvoices.length} งวด)
                </span>
              </span>
            </div>

            {tenantInvoices.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                ยังไม่มีประวัติใบแจ้งหนี้ของผู้เช่ารายนี้
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 text-[11px]">
                    <tr>
                      <th className="py-2 px-3">เลขบิล / งวด</th>
                      <th className="py-2 px-3">ห้อง</th>
                      <th className="py-2 px-3 text-right">ค่าเช่า+จอดรถ</th>
                      <th className="py-2 px-3 text-right">น้ำ / ไฟ</th>
                      <th className="py-2 px-3 text-right">ยอดสุทธิ</th>
                      <th className="py-2 px-3 text-right">จ่ายแล้ว</th>
                      <th className="py-2 px-3 text-right">ค้างชำระ</th>
                      <th className="py-2 px-3 text-center">สถานะ</th>
                      <th className="py-2 px-3 text-right">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tenantInvoices.map(inv => {
                      const late = calcLateFeeSatang(inv, state.simulatedDate, state.settings);
                      const netDue = inv.balanceDueSatang + late;
                      return (
                        <React.Fragment key={inv.id}>
                          <tr className="hover:bg-slate-50">
                            <td className="py-2.5 px-3">
                              <div className="font-bold text-slate-900 mono-num">{inv.id}</div>
                              <div className="text-[10px] text-slate-500">ครบกำหนด {inv.dueDate}</div>
                            </td>
                            <td className="py-2.5 px-3 font-bold mono-num">ห้อง {inv.roomNumber}</td>
                            <td className="py-2.5 px-3 text-right mono-num">
                              ฿{formatBaht(inv.rentSatang + (inv.parkingFeeSatang || 0))}
                            </td>
                            <td className="py-2.5 px-3 text-right mono-num text-[11px]">
                              💧฿{formatBaht(inv.waterSatang)} • ⚡฿{formatBaht(inv.elecSatang)}
                            </td>
                            <td className="py-2.5 px-3 text-right font-bold mono-num">
                              ฿{formatBaht(inv.totalSatang + late)}
                            </td>
                            <td className="py-2.5 px-3 text-right text-emerald-700 font-semibold mono-num">
                              ฿{formatBaht(inv.paidSatang)}
                            </td>
                            <td
                              className={`py-2.5 px-3 text-right font-extrabold mono-num ${
                                netDue > 0 ? 'text-rose-600' : 'text-slate-400'
                              }`}
                            >
                              ฿{formatBaht(netDue)}
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              {netDue === 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3" /> ครบแล้ว
                                </span>
                              ) : inv.paidSatang > 0 ? (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                                  แบ่งจ่าย ({inv.payments.length})
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 inline-flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3" /> ค้างจ่าย
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 text-right space-x-1 whitespace-nowrap">
                              {onViewLineBill && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onViewLineBill(inv.roomNumber);
                                  }}
                                  className="px-2 py-1 rounded bg-slate-900 text-white text-[10px] font-semibold hover:bg-slate-800 inline-flex items-center gap-1"
                                >
                                  <Smartphone className="w-2.5 h-2.5" /> บิล
                                </button>
                              )}
                              {netDue > 0 && onOpenPayment && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    onClose();
                                    onOpenPayment(inv.id);
                                  }}
                                  className="px-2 py-1 rounded bg-indigo-600 text-white text-[10px] font-bold hover:bg-indigo-700 inline-flex items-center gap-1"
                                >
                                  <DollarSign className="w-2.5 h-2.5" /> รับเงิน
                                </button>
                              )}
                            </td>
                          </tr>
                          {inv.payments.length > 0 && (
                            <tr className="bg-emerald-50/40">
                              <td colSpan={9} className="px-4 py-1.5 text-[11px] text-emerald-900 space-y-0.5">
                                {inv.payments.map(p => (
                                  <div key={p.id} className="flex flex-wrap justify-between gap-2">
                                    <span>↳ รับชำระเมื่อ {p.paidAt} ({p.method}) — {p.slipNote}</span>
                                    <strong className="mono-num">฿{formatBaht(p.amountSatang)}</strong>
                                  </div>
                                ))}
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* 5. Google Form Payment Slips History */}
          {tenantSubmissions.length > 0 && (
            <div className="bg-white rounded-2xl border border-amber-200 p-4 shadow-xs space-y-3">
              <div className="font-bold text-sm text-slate-900 flex items-center gap-1.5 border-b border-slate-100 pb-2">
                <CreditCard className="w-4 h-4 text-amber-600" />
                <span>ประวัติการส่งสลิปโอนเงินผ่าน Google Form ({tenantSubmissions.length} รายการ)</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {tenantSubmissions.map(sub => {
                  const slip = getSlipLinks(sub);
                  return (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {slip && (
                          <a href={slip.full} target="_blank" rel="noreferrer" className="shrink-0">
                            <img
                              src={slip.thumb}
                              alt="Slip preview"
                              className="w-12 h-14 object-cover rounded-lg border border-slate-300 bg-white"
                              onError={(e) => {
                                (e.currentTarget as HTMLImageElement).style.display = 'none';
                              }}
                            />
                          </a>
                        )}
                        <div className="min-w-0">
                          <div className="font-black text-sm text-emerald-700 mono-num">
                            ฿{formatBaht(sub.amountSatang)}
                          </div>
                          <div className="text-[11px] text-slate-700 font-semibold truncate">
                            โอน {sub.transferDate} {sub.transferTime}
                          </div>
                          {sub.paymentCategories && (
                            <div className="text-[10px] text-slate-500 truncate">{sub.paymentCategories}</div>
                          )}
                        </div>
                      </div>
                      <div className="text-right shrink-0 space-y-1">
                        <span
                          className={`block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            sub.status === 'RECONCILED'
                              ? 'bg-emerald-100 text-emerald-800'
                              : sub.status === 'REJECTED'
                              ? 'bg-rose-100 text-rose-700'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {sub.status === 'RECONCILED' ? 'อนุมัติแล้ว' : sub.status === 'REJECTED' ? 'ปฏิเสธ' : 'รอตรวจสลิป'}
                        </span>
                        {slip && (
                          <a
                            href={slip.full}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-bold text-indigo-700 hover:underline"
                          >
                            <span>เปิดรูปสลิป</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 6. Move-Out Archive & Deposit Settlement Record (if tenant moved out) */}
          {(matchedArchives.length > 0 || matchedSettlements.length > 0) && (
            <div className="bg-slate-900 text-white rounded-2xl p-4 space-y-3">
              <div className="font-bold text-sm text-emerald-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
                <Archive className="w-4 h-4" />
                <span>ประวัติการย้ายออกและสรุปคืนเงินประกัน (Move-Out Settlement)</span>
              </div>
              {matchedArchives.map(arc => (
                <div key={arc.id} className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block">ระยะเวลาเข้าพัก:</span>
                    <strong className="mono-num">{arc.moveInDate} → {arc.moveOutDate}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">เงินประกันที่วางไว้:</span>
                    <strong className="mono-num">฿{formatBaht(arc.depositSatang)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">มิเตอร์สุดท้าย (น้ำ/ไฟ):</span>
                    <strong className="mono-num">น้ำ {arc.finalWaterReading} • ไฟ {arc.finalElecReading}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">คืนเงินประกันสุทธิ:</span>
                    <strong className="text-emerald-400 text-sm mono-num">฿{formatBaht(arc.netRefundSatang)}</strong>
                  </div>
                  {arc.deductionNote && (
                    <div className="col-span-2 sm:col-span-4 text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                      รายละเอียดการหักค่าใช้จ่าย: {arc.deductionNote}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t border-slate-200 px-5 py-3 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500">
            {effectiveRoomNumber ? (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenRoomDetail(effectiveRoomNumber);
                }}
                className="font-bold text-indigo-700 hover:underline flex items-center gap-1"
              >
                <Building2 className="w-3.5 h-3.5" />
                <span>สลับไปเปิดหน้าต่างภาพรวม ห้อง {effectiveRoomNumber}</span>
              </button>
            ) : (
              <span>ทะเบียนประวัติผู้เช่า {state.settings.apartmentName}</span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>
    </div>
  );
};
