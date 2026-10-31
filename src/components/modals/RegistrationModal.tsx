import React, { useState, useEffect } from 'react';
import { PackageTier, ParkingType, PropertySettings, Room, TenantRegistration } from '../../types';
import { formatBaht } from '../../lib/finance';
import {
  X,
  CheckCircle2,
  XCircle,
  UserPlus,
  Phone,
  Mail,
  MessageSquare,
  Car,
  Key,
  Copy,
  Check,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  FileText
} from 'lucide-react';
import {
  approveRegistration,
  rejectRegistration,
  submitRegistration,
  syncGoogleFormsFromBridge
} from '../../api/client';
import { DASHBOARD_BRIDGE_GS, LIVE_REGISTRATION_FORM_URL } from '../../lib/bridgeScript';

interface RegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
  registrations: TenantRegistration[];
  rooms: Room[];
  settings: PropertySettings;
  onRefreshState: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  isOpen,
  onClose,
  registrations,
  rooms,
  settings,
  onRefreshState
}) => {
  const [selectedRegId, setSelectedRegId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'simulate' | 'script'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Approval form state
  const [assignedRoom, setAssignedRoom] = useState('');
  const [assignedTier, setAssignedTier] = useState<PackageTier>('STANDARD');
  const [assignedRent, setAssignedRent] = useState(2500);
  const [depositMonths, setDepositMonths] = useState(1);
  const [parkingType, setParkingType] = useState<ParkingType>('NONE');
  const [lineId, setLineId] = useState('');
  const [moveInDate, setMoveInDate] = useState('');
  const [tenantNotes, setTenantNotes] = useState('');
  const [initWater, setInitWater] = useState(0);
  const [initElec, setInitElec] = useState(0);
  const [issueInitialInvoice, setIssueInitialInvoice] = useState(false);

  // Google Bridge config state
  const [bridgeUrl, setBridgeUrl] = useState(settings.googleAppsScriptUrl || '');
  const [bridgeToken, setBridgeToken] = useState(settings.googleAppsScriptToken || '');
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Simulation form state
  const [simName, setSimName] = useState('คุณวชิรวิทย์ ศิริชัย');
  const [simPhone, setSimPhone] = useState('089-123-4567');
  const [simEmail, setSimEmail] = useState('wachirawit@example.com');
  const [simLineId, setSimLineId] = useState('wachirawit.s');
  const [simRoom, setSimRoom] = useState('105');
  const [simDate, setSimDate] = useState('2026-11-01');
  const [simVehicle, setSimVehicle] = useState<ParkingType>('CAR');
  const [simNotes, setSimNotes] = useState('รถยนต์ 1 คัน ทะเบียน 5กข 1234 กทม');

  const pendingRegs = registrations.filter(r => r.status === 'PENDING');
  const historyRegs = registrations.filter(r => r.status !== 'PENDING');
  const currentReg = pendingRegs.find(r => r.id === selectedRegId) || pendingRegs[0] || null;
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE' || r.status === 'RESERVED');

  useEffect(() => {
    setBridgeUrl(settings.googleAppsScriptUrl || '');
    setBridgeToken(settings.googleAppsScriptToken || '');
  }, [settings.googleAppsScriptUrl, settings.googleAppsScriptToken]);

  useEffect(() => {
    if (!isOpen || !currentReg) return;
    if (selectedRegId !== currentReg.id) {
      setSelectedRegId(currentReg.id);
    }
    const reqRm = rooms.find(r => r.roomNumber === currentReg.requestedRoomNumber);
    const canUseReq = reqRm && (reqRm.status === 'AVAILABLE' || reqRm.status === 'RESERVED');
    const roomToAssign = canUseReq
      ? currentReg.requestedRoomNumber
      : (availableRooms[0]?.roomNumber || currentReg.requestedRoomNumber);
    setAssignedRoom(roomToAssign);

    const targetRoomObj = rooms.find(r => r.roomNumber === roomToAssign);
    const tier = targetRoomObj?.tier || 'STANDARD';
    setAssignedTier(tier);
    setAssignedRent(
      tier === 'GOLD'
        ? settings.tierGoldSatang / 100
        : tier === 'SILVER'
        ? settings.tierSilverSatang / 100
        : settings.tierStandardSatang / 100
    );
    setDepositMonths(settings.defaultDepositMonths || 1);
    setParkingType(currentReg.vehicleType || targetRoomObj?.parkingType || 'NONE');
    setLineId(currentReg.lineId || targetRoomObj?.lineId || '');
    setMoveInDate(currentReg.plannedMoveInDate || '');
    setTenantNotes(currentReg.notes || '');
    setInitWater(targetRoomObj?.currWater || 0);
    setInitElec(targetRoomObj?.currElec || 0);
    setIssueInitialInvoice(false);
  }, [isOpen, currentReg?.id]);

  if (!isOpen) return null;

  const requestedRoomObj = currentReg ? rooms.find(r => r.roomNumber === currentReg.requestedRoomNumber) : null;
  const isRequestedRoomAssignable =
    requestedRoomObj?.status === 'AVAILABLE' || requestedRoomObj?.status === 'RESERVED';

  const handleSelectReg = (reg: TenantRegistration) => {
    setSelectedRegId(reg.id);
  };

  const handleSyncNow = async (overrideU?: string, overrideT?: string) => {
    const u = (overrideU !== undefined ? overrideU : bridgeUrl).trim();
    const t = (overrideT !== undefined ? overrideT : bridgeToken).trim();
    if (!u || !t) {
      setActiveTab('script');
      setSyncStatusMsg({
        ok: false,
        text: 'กรุณาวาง Apps Script Web App URL และ Secret Token ด้านล่างก่อนกดดึงข้อมูล'
      });
      return;
    }
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await syncGoogleFormsFromBridge(u, t);
      onRefreshState();
      setSyncStatusMsg({
        ok: true,
        text: `เชื่อมต่อสำเร็จ! พบคำขอลงทะเบียนรออนุมัติ ${res.pendingRegistrationsCount} รายการ (มาใหม่ ${res.newRegistrationsCount}) • สลิปรอตรวจ ${res.pendingPaymentsCount} รายการ`
      });
      if (res.pendingRegistrationsCount > 0 && overrideU === undefined) {
        setActiveTab('pending');
      }
    } catch (err: any) {
      setSyncStatusMsg({
        ok: false,
        text: err.message || 'ไม่สามารถดึงข้อมูลจาก Google Form ได้'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleApprove = async () => {
    if (!currentReg) return;
    const roomToUse = assignedRoom || currentReg.requestedRoomNumber;
    const rm = rooms.find(r => r.roomNumber === roomToUse);
    if (!rm) {
      alert('กรุณาเลือกห้องพักที่ต้องการบรรจุผู้เช่า');
      return;
    }
    if (rm.status === 'OCCUPIED') {
      alert(`ห้อง ${roomToUse} มีผู้เช่าอยู่แล้ว กรุณาเลือกห้องที่ว่างอยู่`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await approveRegistration({
        registrationId: currentReg.id,
        roomNumber: roomToUse,
        tier: assignedTier,
        rentSatang: Math.round(Number(assignedRent) * 100),
        depositMonths,
        parkingType,
        lineId,
        startDate: moveInDate,
        notes: tenantNotes,
        initWater,
        initElec,
        issueInitialInvoice
      });
      onRefreshState();
      const remaining = pendingRegs.filter(r => r.id !== currentReg.id);
      setSelectedRegId(remaining[0]?.id || null);
      if (res.sheetWarning) {
        alert(`อนุมัติผู้เช่า "${currentReg.tenantName}" เข้าห้อง ${roomToUse} เรียบร้อยแล้ว!\n\nหมายเหตุ: ${res.sheetWarning}`);
      } else {
        alert(
          `อนุมัติผู้เช่า "${currentReg.tenantName}" เข้าห้อง ${roomToUse} เรียบร้อยแล้ว!${
            res.sheetSynced ? ' (บันทึก Approved = Yes ลง Google Sheet แล้ว)' : ''
          }`
        );
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถอนุมัติได้'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentReg) return;
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธ (เช่น ห้องไม่ว่าง, ผู้สมัครยกเลิก):', 'ผู้สมัครยกเลิกคำขอ');
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await rejectRegistration(currentReg.id, reason);
      onRefreshState();
      const remaining = pendingRegs.filter(r => r.id !== currentReg.id);
      setSelectedRegId(remaining[0]?.id || null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSimulateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await submitRegistration({
        requestedRoomNumber: simRoom,
        tenantName: simName,
        phone: simPhone,
        email: simEmail,
        lineId: simLineId,
        vehicleType: simVehicle,
        plannedMoveInDate: simDate,
        notes: simNotes,
        depositPaidSatang: 0
      });
      setActiveTab('pending');
      onRefreshState();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const liveRegFormUrl = settings.registrationFormUrl || LIVE_REGISTRATION_FORM_URL;
  const isBridgeConfigured = Boolean(settings.googleAppsScriptUrl && settings.googleAppsScriptToken);

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>จัดการคำขอลงทะเบียนผู้เช่าใหม่ (Google Form)</span>
                {pendingRegs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    รออนุมัติ {pendingRegs.length} รายการ
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                ดึงข้อมูลผู้เช่าจาก Google Form อัตโนมัติ ตรวจสอบห้องว่าง และกดอนุมัติเพื่อบันทึกผู้เช่าเข้าห้องทันที
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSyncNow()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงข้อมูล...' : 'ดึงข้อมูลจาก Google Form'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 border-b border-slate-800 bg-slate-900/90 flex overflow-x-auto gap-2 pt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'pending'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📥 คำขอรออนุมัติ ({pendingRegs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 ประวัติที่ดำเนินการแล้ว ({historyRegs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚙️ เชื่อมต่อ Google Form</span>
            {isBridgeConfigured && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulate')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'simulate'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ➕ ทดสอบสร้างคำขอจำลอง
          </button>
        </div>

        {syncStatusMsg && (
          <div
            className={`mx-5 mt-3 px-3.5 py-2 rounded-xl border text-xs flex items-center justify-between gap-2 ${
              syncStatusMsg.ok
                ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
            }`}
          >
            <span>{syncStatusMsg.text}</span>
            <button
              type="button"
              onClick={() => setSyncStatusMsg(null)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'pending' && (
            pendingRegs.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                <h3 className="text-base font-semibold text-slate-200">ไม่มีคำขอลงทะเบียนค้างรอ</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isBridgeConfigured
                    ? 'เชื่อมต่อ Google Form เรียบร้อยแล้ว ระบบจะซิงก์คำขอลงทะเบียนใหม่อัตโนมัติทุก 45 วินาที หรือกดปุ่มดึงข้อมูลทันทีด้านล่าง'
                    : 'ยังไม่ได้ผูก URL ของ Google Apps Script — กดปุ่ม "ตั้งค่าเชื่อมต่อ Google Form" เพื่อดึงรายการลงทะเบียนจริงจากฟอร์มของหอพัก'}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  {isBridgeConfigured ? (
                    <button
                      type="button"
                      onClick={() => handleSyncNow()}
                      disabled={isSyncing}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>ดึงคำขอใหม่จาก Google Form ทันที</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('script')}
                      className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold transition"
                    >
                      ⚙️ ตั้งค่าเชื่อมต่อ Google Form
                    </button>
                  )}
                  <a
                    href={liveRegFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-sky-400" />
                    <span>เปิดดูฟอร์มลงทะเบียนผู้เช่า</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left List of Registrations */}
                <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-slate-950/40 p-2 space-y-1.5 max-h-[540px] overflow-y-auto">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">รายการคำขอลงทะเบียน:</div>
                  {pendingRegs.map(reg => {
                    const reqRoom = rooms.find(r => r.roomNumber === reg.requestedRoomNumber);
                    const isAvail = reqRoom?.status === 'AVAILABLE';
                    const isReserved = reqRoom?.status === 'RESERVED';
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleSelectReg(reg)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                          currentReg?.id === reg.id
                            ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="font-bold text-sm text-white truncate">{reg.tenantName}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                            ห้อง <strong className="text-sky-300">{reg.requestedRoomNumber}</strong> • {reg.phone || reg.email || '-'}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                              isAvail
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : isReserved
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {isAvail ? 'ห้องว่าง' : isReserved ? 'จองไว้' : 'มีผู้เช่า'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Right Approval Panel */}
                {currentReg && (
                  <div className="lg:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Tenant Information Card */}
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3">
                        <div className="text-xs text-slate-400 font-semibold flex items-center justify-between">
                          <span>ข้อมูลจากฟอร์มลงทะเบียน:</span>
                          <span className="text-[11px] text-slate-400">
                            {currentReg.submittedAt.substring(0, 16).replace('T', ' ')}
                          </span>
                        </div>
                        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2.5 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">ชื่อ-นามสกุล (Name):</span>
                            <span className="text-white font-bold text-sm">{currentReg.tenantName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                              <span className="text-slate-200 flex items-center gap-1 font-medium">
                                <Phone className="w-3 h-3 text-emerald-400 shrink-0" />
                                <span>{currentReg.phone || '-'}</span>
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">อีเมล (Email):</span>
                              <span className="text-slate-200 flex items-center gap-1 break-all">
                                <Mail className="w-3 h-3 text-sky-400 shrink-0" />
                                <span>{currentReg.email || '-'}</span>
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800">
                            <div>
                              <span className="text-slate-400 block text-[11px]">หมายเลขห้องที่เลือก:</span>
                              <span className="text-sky-300 font-bold text-sm">ห้อง {currentReg.requestedRoomNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">วันที่ต้องการย้ายเข้า:</span>
                              <span className="text-slate-200">{currentReg.plannedMoveInDate || '-'}</span>
                            </div>
                          </div>
                          {currentReg.notes && (
                            <div className="pt-1.5 border-t border-slate-800">
                              <span className="text-slate-400 block text-[11px] flex items-center gap-1">
                                <FileText className="w-3 h-3 text-amber-400" /> หมายเหตุจากผู้เช่า (Notes):
                              </span>
                              <p className="text-amber-200/90 mt-0.5 bg-slate-950/70 p-2 rounded border border-slate-800 whitespace-pre-wrap">
                                {currentReg.notes}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Room Status Indicator */}
                        <div
                          className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                            isRequestedRoomAssignable
                              ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          {isRequestedRoomAssignable ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>
                                ห้อง {currentReg.requestedRoomNumber}{' '}
                                {requestedRoomObj?.status === 'RESERVED' ? 'ติดสถานะจองไว้' : 'ว่างอยู่'} พร้อมกดอนุมัติเพื่อบันทึกผู้เช่าเข้าห้องได้ทันที
                              </div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <div>
                                ห้อง {currentReg.requestedRoomNumber} มีผู้เช่าอยู่แล้ว กรุณาเลือกห้องอื่นที่ว่างในช่อง "บรรจุเข้าห้อง" ด้านขวา
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Approval Setup Form */}
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3 flex flex-col justify-between">
                        <div className="space-y-2.5">
                          <div className="text-xs text-slate-400 font-semibold">ตรวจสอบสัญญา &amp; บันทึกผู้เช่าเข้าห้อง:</div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">บรรจุเข้าห้อง</label>
                              <select
                                value={assignedRoom}
                                onChange={(e) => {
                                  const rNum = e.target.value;
                                  setAssignedRoom(rNum);
                                  const rm = rooms.find(r => r.roomNumber === rNum);
                                  if (rm) {
                                    setAssignedTier(rm.tier);
                                    setAssignedRent(
                                      rm.tier === 'GOLD'
                                        ? settings.tierGoldSatang / 100
                                        : rm.tier === 'SILVER'
                                        ? settings.tierSilverSatang / 100
                                        : settings.tierStandardSatang / 100
                                    );
                                    setInitWater(rm.currWater);
                                    setInitElec(rm.currElec);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                {rooms.map(r => (
                                  <option key={r.roomNumber} value={r.roomNumber} disabled={r.status === 'OCCUPIED'}>
                                    ห้อง {r.roomNumber} (
                                    {r.status === 'AVAILABLE' ? 'ว่าง' : r.status === 'RESERVED' ? 'จองไว้' : 'มีผู้เช่า'})
                                  </option>
                                ))}
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">แพ็กเกจห้อง</label>
                              <select
                                value={assignedTier}
                                onChange={(e) => {
                                  const t = e.target.value as PackageTier;
                                  setAssignedTier(t);
                                  setAssignedRent(
                                    t === 'GOLD'
                                      ? settings.tierGoldSatang / 100
                                      : t === 'SILVER'
                                      ? settings.tierSilverSatang / 100
                                      : settings.tierStandardSatang / 100
                                  );
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                <option value="STANDARD">
                                  Standard ({formatBaht(settings.tierStandardSatang)} บ.)
                                </option>
                                <option value="SILVER">
                                  Silver ({formatBaht(settings.tierSilverSatang)} บ.)
                                </option>
                                <option value="GOLD">
                                  Gold ({formatBaht(settings.tierGoldSatang)} บ.)
                                </option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">ค่าเช่าห้อง (บาท/เดือน)</label>
                              <input
                                type="number"
                                value={assignedRent}
                                onChange={(e) => setAssignedRent(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-emerald-400 font-bold"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">เงินประกัน (เดือน)</label>
                              <select
                                value={depositMonths}
                                onChange={(e) => setDepositMonths(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                <option value={0}>ไม่เก็บเงินประกัน (0 บ.)</option>
                                <option value={1}>1 เดือน ({formatBaht(assignedRent * 100)} บ.)</option>
                                <option value={2}>2 เดือน ({formatBaht(assignedRent * 200)} บ.)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1 flex items-center gap-1">
                                <Car className="w-3 h-3 text-indigo-400" /> ที่จอดรถ
                              </label>
                              <select
                                value={parkingType}
                                onChange={(e) => setParkingType(e.target.value as ParkingType)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                <option value="NONE">ไม่ใช้ที่จอดรถ (0 บ.)</option>
                                <option value="CAR">
                                  รถยนต์ (+{formatBaht(settings.carParkingRateSatang)} บ.)
                                </option>
                                <option value="BIKE">
                                  มอเตอร์ไซค์ (+{formatBaht(settings.bikeParkingRateSatang)} บ.)
                                </option>
                              </select>
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">วันที่เริ่มสัญญา/ย้ายเข้า</label>
                              <input
                                type="date"
                                value={moveInDate}
                                onChange={(e) => setMoveInDate(e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              />
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-sky-400" /> LINE ID
                              </label>
                              <input
                                type="text"
                                value={lineId}
                                onChange={(e) => setLineId(e.target.value)}
                                placeholder="เช่น U123..."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">มิเตอร์น้ำตั้งต้น</label>
                              <input
                                type="number"
                                value={initWater}
                                onChange={(e) => setInitWater(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">มิเตอร์ไฟตั้งต้น</label>
                              <input
                                type="number"
                                value={initElec}
                                onChange={(e) => setInitElec(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                              />
                            </div>
                          </div>

                          <label className="flex items-center gap-2 text-[11px] text-slate-300 pt-1 cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={issueInitialInvoice}
                              onChange={(e) => setIssueInitialInvoice(e.target.checked)}
                              className="rounded border-slate-700 bg-slate-900 text-sky-500"
                            />
                            <span>ออกใบแจ้งหนี้แรกเข้าทันที (ครบกำหนดวันที่ {settings.dueDayNextMonth || 5} ของเดือนถัดไป)</span>
                          </label>
                        </div>

                        {/* Action buttons */}
                        <div className="flex gap-2 pt-3 border-t border-slate-800">
                          <button
                            type="button"
                            onClick={handleReject}
                            disabled={isSubmitting}
                            className="flex-1 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                          >
                            <XCircle className="w-4 h-4" />
                            <span>ปฏิเสธ</span>
                          </button>
                          <button
                            type="button"
                            onClick={handleApprove}
                            disabled={isSubmitting}
                            className="flex-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs shadow-lg shadow-sky-900/30 transition flex items-center justify-center gap-1.5"
                          >
                            <Key className="w-4 h-4" />
                            <span>{isSubmitting ? 'กำลังบันทึก...' : '✓ อนุมัติ & บันทึกเข้าห้อง'}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          )}

          {activeTab === 'history' && (
            historyRegs.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีประวัติการอนุมัติ</div>
            ) : (
              <div className="space-y-2">
                {historyRegs.map(reg => (
                  <div
                    key={reg.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          reg.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {reg.status === 'APPROVED' ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{reg.tenantName}</span>
                          <span className="text-sky-300">ห้อง {reg.requestedRoomNumber}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          โทร: {reg.phone || '-'} • อีเมล: {reg.email || '-'} • หมายเหตุ: {reg.adminNote || reg.notes || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`text-[11px] font-semibold ${
                          reg.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {reg.status === 'APPROVED' ? 'อนุมัติเข้าห้องแล้ว' : 'ปฏิเสธ'}
                      </span>
                      <div className="text-[10px] text-slate-400">{reg.submittedAt.substring(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'script' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/70 border border-sky-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      🔗 เชื่อมต่อ Google Form จริงของหอพัก (ลงทะเบียนผู้เช่า + แจ้งชำระเงิน)
                    </h3>
                    <p className="text-slate-400 mt-0.5">
                      ใส่ Web App URL และ Secret Token เพียงครั้งเดียว ระบบจะดึงข้อมูลทั้ง 2 ฟอร์มและเขียนสถานะอนุมัติกลับลง Google Sheet ให้อัตโนมัติ
                    </p>
                  </div>
                  <a
                    href={liveRegFormUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 font-semibold flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>เปิดฟอร์มลงทะเบียนจริง</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      1. Apps Script Web App URL
                    </label>
                    <input
                      type="url"
                      value={bridgeUrl}
                      onChange={(e) => setBridgeUrl(e.target.value)}
                      placeholder="https://script.google.com/macros/s/.../exec"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">
                      2. Bridge Secret Token (จาก Execution Log)
                    </label>
                    <input
                      type="password"
                      value={bridgeToken}
                      onChange={(e) => setBridgeToken(e.target.value)}
                      placeholder="taky_..."
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-[11px]"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => handleSyncNow(bridgeUrl, bridgeToken)}
                    disabled={isSyncing}
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'กำลังทดสอบ & ซิงก์ข้อมูล...' : '💾 บันทึก & ดึงข้อมูลจาก Google Form ทันที'}</span>
                  </button>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm">วิธีติดตั้งไฟล์ DashboardBridge.gs ใน Google Sheet (ทำครั้งเดียว 1 นาที)</div>
                    <ol className="list-decimal list-inside text-slate-300 space-y-1 mt-1.5 leading-relaxed">
                      <li>
                        เปิดไฟล์ Google Sheet <strong>Taky Apartment — Payments</strong> &rarr; เมนู{' '}
                        <strong>Extensions &gt; Apps Script</strong>
                      </li>
                      <li>
                        กดปุ่ม <strong>+ (Add a file) &gt; Script</strong> ตั้งชื่อ <code className="text-sky-300">DashboardBridge</code> แล้ววางโค้ดด้านล่างลงไป (และอัปเดต <code className="text-amber-300">DUE_DAY = 5</code> ใน <code className="text-amber-300">Code.gs</code>)
                      </li>
                      <li>
                        เลือกฟังก์ชัน <code className="text-emerald-300">setupDashboardBridge</code> ด้านบนแล้วกด <strong>Run</strong> &rarr; ระบบจะเปลี่ยนวันครบกำหนดในฟอร์มเป็นวันที่ 5 และแสดง <strong>SECRET TOKEN</strong> ใน Execution Log
                      </li>
                      <li>
                        กดปุ่ม <strong>Deploy &gt; New deployment</strong> &rarr; เลือกชนิด <strong>Web app</strong> &rarr; ตั้งค่า{' '}
                        <strong>Execute as: Me</strong> และ <strong>Who has access: Anyone</strong> &rarr; คัดลอก Web App URL และ Token มาวางช่องด้านบน!
                      </li>
                    </ol>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(DASHBOARD_BRIDGE_GS);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 text-xs font-semibold transition shrink-0"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'คัดลอก DashboardBridge.gs แล้ว!' : 'คัดลอกโค้ด DashboardBridge.gs'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-sky-200/90 overflow-x-auto max-h-[220px]">
                  <pre>{DASHBOARD_BRIDGE_GS}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'simulate' && (
            <div className="max-w-xl mx-auto bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                จำลองคำขอลงทะเบียนผู้เช่าใหม่เพื่อทดสอบการกดอนุมัติเข้าห้อง
              </h3>
              <form onSubmit={handleSimulateSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">ชื่อ / Name</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">เบอร์โทร / Phone number</label>
                    <input
                      type="text"
                      value={simPhone}
                      onChange={(e) => setSimPhone(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">อีเมล / Email</label>
                    <input
                      type="email"
                      value={simEmail}
                      onChange={(e) => setSimEmail(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">หมายเลขห้อง / Unit number</label>
                    <select
                      value={simRoom}
                      onChange={(e) => setSimRoom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      {rooms.map(r => (
                        <option key={r.roomNumber} value={r.roomNumber}>
                          ห้อง {r.roomNumber} ({r.status === 'AVAILABLE' ? 'ว่าง' : r.status === 'RESERVED' ? 'จองไว้' : 'มีผู้เช่า'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">วันที่ย้ายเข้า</label>
                    <input
                      type="date"
                      value={simDate}
                      onChange={(e) => setSimDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ยานพาหนะ</label>
                    <select
                      value={simVehicle}
                      onChange={(e) => setSimVehicle(e.target.value as ParkingType)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      <option value="NONE">ไม่ใช้ที่จอดรถ</option>
                      <option value="CAR">รถยนต์ (+500 บ.)</option>
                      <option value="BIKE">มอเตอร์ไซค์ (+100 บ.)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">LINE ID (ถ้ามี)</label>
                    <input
                      type="text"
                      value={simLineId}
                      onChange={(e) => setSimLineId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">หมายเหตุ / Notes</label>
                  <input
                    type="text"
                    value={simNotes}
                    onChange={(e) => setSimNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold transition flex items-center justify-center gap-2"
                  >
                    <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งคำขอลงทะเบียนเข้าคิว Dashboard'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
