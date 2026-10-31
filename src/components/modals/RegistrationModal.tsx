import React, { useState } from 'react';
import { PackageTier, ParkingType, PropertySettings, Room, TenantRegistration } from '../../types';
import { formatBaht } from '../../lib/finance';
import { X, CheckCircle2, XCircle, UserPlus, Phone, MessageSquare, Car, Key, Copy, Check, AlertCircle } from 'lucide-react';
import { approveRegistration, rejectRegistration, submitRegistration } from '../../api/client';

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
  const [selectedRegId, setSelectedRegId] = useState<string | null>(registrations[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'simulate' | 'script'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);

  // Approval form state
  const [assignedRoom, setAssignedRoom] = useState('');
  const [assignedTier, setAssignedTier] = useState<PackageTier>('STANDARD');
  const [assignedRent, setAssignedRent] = useState(2500);
  const [depositMonths, setDepositMonths] = useState(1);
  const [initWater, setInitWater] = useState(0);
  const [initElec, setInitElec] = useState(0);

  // Simulation form state
  const [simName, setSimName] = useState('คุณวชิรวิทย์ ศิริชัย');
  const [simPhone, setSimPhone] = useState('089-123-4567');
  const [simLineId, setSimLineId] = useState('wachirawit.s');
  const [simRoom, setSimRoom] = useState('101');
  const [simDate, setSimDate] = useState('2026-11-01');
  const [simVehicle, setSimVehicle] = useState<ParkingType>('CAR');
  const [simPlate, setSimPlate] = useState('5กข 1234 กทม');

  if (!isOpen) return null;

  const pendingRegs = registrations.filter(r => r.status === 'PENDING');
  const historyRegs = registrations.filter(r => r.status !== 'PENDING');
  const currentReg = registrations.find(r => r.id === selectedRegId) || pendingRegs[0];

  // Check if requested room is available
  const requestedRoomObj = currentReg ? rooms.find(r => r.roomNumber === currentReg.requestedRoomNumber) : null;
  const isRequestedRoomAvailable = requestedRoomObj?.status === 'AVAILABLE';

  // Available rooms for assignment
  const availableRooms = rooms.filter(r => r.status === 'AVAILABLE');

  const handleSelectReg = (reg: TenantRegistration) => {
    setSelectedRegId(reg.id);
    const rm = rooms.find(r => r.roomNumber === reg.requestedRoomNumber);
    const roomToAssign = rm?.status === 'AVAILABLE' ? reg.requestedRoomNumber : (availableRooms[0]?.roomNumber || reg.requestedRoomNumber);
    setAssignedRoom(roomToAssign);

    const targetRoomObj = rooms.find(r => r.roomNumber === roomToAssign);
    const tier = targetRoomObj?.tier || 'STANDARD';
    setAssignedTier(tier);
    setAssignedRent(
      tier === 'GOLD' ? settings.tierGoldSatang / 100 :
      tier === 'SILVER' ? settings.tierSilverSatang / 100 :
      settings.tierStandardSatang / 100
    );
    setInitWater(targetRoomObj?.currWater || 0);
    setInitElec(targetRoomObj?.currElec || 0);
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
      await approveRegistration({
        registrationId: currentReg.id,
        roomNumber: roomToUse,
        tier: assignedTier,
        rentSatang: assignedRent * 100,
        depositMonths: depositMonths,
        initWater,
        initElec
      });
      alert(`อนุมัติผู้เช่า "${currentReg.tenantName}" เข้าห้อง ${roomToUse} เรียบร้อยแล้ว!`);
      onRefreshState();
      const remaining = pendingRegs.filter(r => r.id !== currentReg.id);
      setSelectedRegId(remaining[0]?.id || null);
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
        lineId: simLineId,
        vehicleType: simVehicle,
        licensePlate: simPlate,
        plannedMoveInDate: simDate,
        depositPaidSatang: 0
      });
      alert('จำลองการลงทะเบียนผู้เช่าใหม่เรียบร้อยแล้ว');
      setActiveTab('pending');
      onRefreshState();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const registrationScriptCode = `/**
 * Google Apps Script สำหรับผูกกับ Google Form รับสมัคร/ลงทะเบียนผู้เช่าใหม่
 * ส่งข้อมูลเข้า Taky Apartment ERP เพื่อแสดงแจ้งเตือนบน Dashboard
 */
function onRegistrationSubmit(e) {
  var responses = e.response.getItemResponses();
  var formData = {};
  
  for (var i = 0; i < responses.length; i++) {
    var title = responses[i].getItem().getTitle();
    var val = responses[i].getResponse();
    formData[title] = val;
  }
  
  var payload = {
    requestedRoomNumber: formData['ห้องที่ต้องการจอง'] || formData['เลขห้อง'] || '101',
    tenantName: formData['ชื่อ-นามสกุล'] || formData['ชื่อผู้เช่า'] || '',
    phone: formData['เบอร์โทรศัพท์'] || '',
    lineId: formData['LINE ID'] || '',
    idCardNumber: formData['เลขบัตรประชาชน'] || '',
    vehicleType: formData['ประเภทยานพาหนะ'] || 'NONE', // 'CAR' หรือ 'BIKE' หรือ 'NONE'
    licensePlate: formData['ทะเบียนรถ'] || '',
    plannedMoveInDate: formData['วันที่ต้องการเข้าพัก'] || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd')
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var webhookUrl = "${window.location.origin}/api/webhooks/google-form/register";
  UrlFetchApp.fetch(webhookUrl, options);
}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center font-bold">
              <UserPlus className="w-5 h-5 text-sky-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>จัดการคำขอลงทะเบียนผู้เช่าใหม่ (Tenant Registration Queue)</span>
                {pendingRegs.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/30">
                    รออนุมัติ {pendingRegs.length} รายการ
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">ตรวจสอบคำขอจาก Google Form ตรวจสถานะห้องว่าง และกดยืนยันเพื่อบันทึกเข้าห้องทันที</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sub-Tabs */}
        <div className="px-5 border-b border-slate-800 bg-slate-900/90 flex gap-2 pt-2 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('pending')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
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
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 ประวัติที่อนุมัติแล้ว ({historyRegs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('simulate')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'simulate'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ➕ จำลองคำขอลงทะเบียนใหม่
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'script'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ โค้ดเชื่อมต่อ Google Form
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'pending' && (
            pendingRegs.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-semibold text-slate-200">ไม่มีคำขอลงทะเบียนค้างรอ</h3>
                <p className="text-xs text-slate-400 mt-1">
                  เมื่อมีผู้เช่ากรอกฟอร์มลงทะเบียนเข้ามา ระบบจะแจ้งเตือนบนหน้า Dashboard ทันที
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('simulate')}
                    className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium transition"
                  >
                    จำลองคำขอลงทะเบียนทดสอบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left List of Registrations */}
                <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-slate-950/40 p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">รายการคำขอลงทะเบียน:</div>
                  {pendingRegs.map(reg => {
                    const reqRoom = rooms.find(r => r.roomNumber === reg.requestedRoomNumber);
                    const isAvail = reqRoom?.status === 'AVAILABLE';
                    return (
                      <button
                        key={reg.id}
                        type="button"
                        onClick={() => handleSelectReg(reg)}
                        className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                          (currentReg?.id === reg.id)
                            ? 'bg-sky-500/10 border-sky-500/50 text-white shadow-sm'
                            : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                        }`}
                      >
                        <div>
                          <div className="font-bold text-sm text-white flex items-center gap-1.5">
                            <span>{reg.tenantName}</span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            ต้องการห้อง <strong className="text-sky-300">{reg.requestedRoomNumber}</strong> • {reg.phone}
                          </div>
                        </div>
                        <div className="text-right">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                            isAvail ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}>
                            {isAvail ? 'ห้องว่าง' : 'ห้องเต็ม'}
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
                          <span>ข้อมูลผู้ลงทะเบียน:</span>
                          <span className="text-[11px] text-slate-400">ส่งเมื่อ {currentReg.submittedAt.substring(0, 10)}</span>
                        </div>
                        <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2 text-xs">
                          <div>
                            <span className="text-slate-400 block text-[11px]">ชื่อ-นามสกุล:</span>
                            <span className="text-white font-bold text-sm">{currentReg.tenantName}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="text-slate-400 block text-[11px]">เบอร์โทรศัพท์:</span>
                              <span className="text-slate-200 flex items-center gap-1">
                                <Phone className="w-3 h-3 text-emerald-400" /> {currentReg.phone}
                              </span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">LINE ID:</span>
                              <span className="text-slate-200 flex items-center gap-1">
                                <MessageSquare className="w-3 h-3 text-sky-400" /> {currentReg.lineId || '-'}
                              </span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800">
                            <div>
                              <span className="text-slate-400 block text-[11px]">ห้องที่ต้องการ:</span>
                              <span className="text-sky-300 font-bold text-sm">ห้อง {currentReg.requestedRoomNumber}</span>
                            </div>
                            <div>
                              <span className="text-slate-400 block text-[11px]">วันที่เข้าพัก:</span>
                              <span className="text-slate-200">{currentReg.plannedMoveInDate}</span>
                            </div>
                          </div>
                          <div className="pt-1 border-t border-slate-800">
                            <span className="text-slate-400 block text-[11px]">ที่จอดรถ:</span>
                            <span className="text-slate-200 flex items-center gap-1">
                              <Car className="w-3.5 h-3.5 text-indigo-400" />
                              {currentReg.vehicleType === 'CAR' ? 'รถยนต์ (+500 บ./เดือน)' : currentReg.vehicleType === 'BIKE' ? 'มอเตอร์ไซค์ (+100 บ./เดือน)' : 'ไม่ใช้ที่จอดรถ'}
                              {currentReg.licensePlate && ` (${currentReg.licensePlate})`}
                            </span>
                          </div>
                        </div>

                        {/* Room Status Indicator */}
                        <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                          isRequestedRoomAvailable
                            ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                            : 'bg-amber-950/40 border-amber-500/30 text-amber-300'
                        }`}>
                          {isRequestedRoomAvailable ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <div>ห้อง {currentReg.requestedRoomNumber} ว่างอยู่ พร้อมอนุมัติเข้าพักได้ทันที</div>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                              <div>ห้อง {currentReg.requestedRoomNumber} ไม่ว่าง กรุณาเลือกห้องอื่นที่ว่างด้านล่าง</div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Approval Setup Form */}
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 space-y-3 flex flex-col justify-between">
                        <div className="space-y-3">
                          <div className="text-xs text-slate-400 font-semibold">ตั้งค่าสัญญา &amp; บันทึกเข้าห้อง:</div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">บรรจุเข้าห้อง</label>
                              <select
                                value={assignedRoom || currentReg.requestedRoomNumber}
                                onChange={(e) => {
                                  const rNum = e.target.value;
                                  setAssignedRoom(rNum);
                                  const rm = rooms.find(r => r.roomNumber === rNum);
                                  if (rm) {
                                    setInitWater(rm.currWater);
                                    setInitElec(rm.currElec);
                                  }
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                {rooms.map(r => (
                                  <option key={r.roomNumber} value={r.roomNumber} disabled={r.status === 'OCCUPIED'}>
                                    ห้อง {r.roomNumber} ({r.status === 'AVAILABLE' ? 'ว่าง' : 'ไม่ว่าง'})
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
                                    t === 'GOLD' ? settings.tierGoldSatang / 100 :
                                    t === 'SILVER' ? settings.tierSilverSatang / 100 :
                                    settings.tierStandardSatang / 100
                                  );
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              >
                                <option value="STANDARD">Standard (2,500 บ.)</option>
                                <option value="SILVER">Silver (3,000 บ.)</option>
                                <option value="GOLD">Gold (3,500 บ.)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">ค่าเช่าห้อง (บาท/ด.)</label>
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
                                <option value={1}>1 เดือน ({formatBaht(assignedRent * 100)} บ.)</option>
                                <option value={2}>2 เดือน ({formatBaht(assignedRent * 200)} บ.)</option>
                              </select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div>
                              <label className="text-slate-400 block mb-1">มิเตอร์น้ำเริ่มต้น</label>
                              <input
                                type="number"
                                value={initWater}
                                onChange={(e) => setInitWater(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              />
                            </div>
                            <div>
                              <label className="text-slate-400 block mb-1">มิเตอร์ไฟเริ่มต้น</label>
                              <input
                                type="number"
                                value={initElec}
                                onChange={(e) => setInitElec(Number(e.target.value))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white"
                              />
                            </div>
                          </div>
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
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        reg.status === 'APPROVED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {reg.status === 'APPROVED' ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>{reg.tenantName}</span>
                          <span className="text-sky-300">ห้อง {reg.requestedRoomNumber}</span>
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          โทร: {reg.phone} • LINE: {reg.lineId || '-'} • ยานพาหนะ: {reg.vehicleType}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className={`text-[11px] font-semibold ${reg.status === 'APPROVED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {reg.status === 'APPROVED' ? 'อนุมัติเข้าห้องแล้ว' : 'ปฏิเสธ'}
                      </span>
                      <div className="text-[10px] text-slate-400">{reg.submittedAt.substring(0, 10)}</div>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {activeTab === 'simulate' && (
            <div className="max-w-xl mx-auto bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-sky-400" />
                จำลองคำขอลงทะเบียนผู้เช่าใหม่เพื่อทดสอบระบบ
              </h3>
              <form onSubmit={handleSimulateSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">ชื่อ-นามสกุล ผู้เช่า</label>
                    <input
                      type="text"
                      value={simName}
                      onChange={(e) => setSimName(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">เบอร์โทรศัพท์</label>
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
                    <label className="text-slate-400 block mb-1">LINE ID</label>
                    <input
                      type="text"
                      value={simLineId}
                      onChange={(e) => setSimLineId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ห้องที่ต้องการจอง</label>
                    <select
                      value={simRoom}
                      onChange={(e) => setSimRoom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      {rooms.map(r => (
                        <option key={r.roomNumber} value={r.roomNumber}>
                          ห้อง {r.roomNumber} ({r.status === 'AVAILABLE' ? 'ว่าง' : 'มีผู้เช่า'})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">วันที่ต้องการเข้าพัก</label>
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
                    <label className="text-slate-400 block mb-1">ทะเบียนรถ</label>
                    <input
                      type="text"
                      value={simPlate}
                      onChange={(e) => setSimPlate(e.target.value)}
                      placeholder="5กข 1234 กทม"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
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

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Google Apps Script Webhook Endpoint สำหรับลงทะเบียน</h3>
                  <p className="text-xs text-slate-400">
                    นำสคริปต์นี้ไปใส่ใน Google Form สำหรับให้ผู้เช่ากรอกสมัครเข้าพัก ข้อมูลจะเด้งแจ้งเตือนบน Dashboard ทันที
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(registrationScriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 hover:bg-sky-500/30 text-xs font-semibold transition"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-sky-200/90 overflow-x-auto max-h-[300px]">
                <pre>{registrationScriptCode}</pre>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">🔗 Webhook URL สำหรับรับการลงทะเบียน:</div>
                <div className="font-mono text-sky-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 select-all">
                  {window.location.origin}/api/webhooks/google-form/register
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
