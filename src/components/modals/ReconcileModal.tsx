import React, { useState, useEffect } from 'react';
import { FormSubmission, Invoice, PropertySettings, Room } from '../../types';
import { formatBaht, getLatestRoomInvoice } from '../../lib/finance';
import {
  X,
  CheckCircle2,
  XCircle,
  Upload,
  ExternalLink,
  Image as ImageIcon,
  AlertCircle,
  Copy,
  Check,
  RefreshCw
} from 'lucide-react';
import {
  approveReconcile,
  manualUploadSlip,
  refreshGoogleFormsViaBridge,
  rejectReconcile,
  syncGoogleFormsFromBridge
} from '../../api/client';
import {
  DASHBOARD_BRIDGE_GS,
  LIVE_INFORM_PAGE_URL,
  LIVE_PAYMENT_FORM_URL
} from '../../lib/bridgeScript';

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: FormSubmission[];
  rooms: Room[];
  invoices: Invoice[];
  settings: PropertySettings;
  onRefreshState: () => void;
}

function extractDriveId(sub: FormSubmission): string {
  if (sub.driveFileId) return sub.driveFileId;
  const s = String(sub.slipUrl || '').trim();
  if (!s) return '';
  const m = s.match(/[?&]id=([A-Za-z0-9_-]{10,})/) || s.match(/\/d\/([A-Za-z0-9_-]{10,})/);
  return m ? m[1] : '';
}

function getPreviewImageUrl(sub: FormSubmission): string {
  const driveId = extractDriveId(sub);
  if (driveId) {
    return `https://drive.google.com/thumbnail?id=${driveId}&sz=w1000`;
  }
  return sub.slipUrl || 'https://placehold.co/400x500/1e293b/94a3b8?text=Payslip+Preview';
}

function getExternalSlipUrl(sub: FormSubmission): string {
  const driveId = extractDriveId(sub);
  if (driveId) {
    return `https://drive.google.com/file/d/${driveId}/view`;
  }
  return sub.slipUrl;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  isOpen,
  onClose,
  submissions,
  rooms,
  invoices,
  settings,
  onRefreshState
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'script' | 'manual'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRefreshingForm, setIsRefreshingForm] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  // Google Bridge config state
  const [bridgeUrl, setBridgeUrl] = useState(settings.googleAppsScriptUrl || '');
  const [bridgeToken, setBridgeToken] = useState(settings.googleAppsScriptToken || '');
  const [syncStatusMsg, setSyncStatusMsg] = useState<{ ok: boolean; text: string } | null>(null);

  // Manual slip upload form state
  const [manualRoom, setManualRoom] = useState('101');
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('3200');
  const [manualDate, setManualDate] = useState('2026-10-26');
  const [manualTime, setManualTime] = useState('14:30');
  const [manualSlipUrl, setManualSlipUrl] = useState(
    'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80'
  );

  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
  const historySubmissions = submissions.filter(s => s.status !== 'PENDING');
  const currentSub =
    pendingSubmissions.find(s => s.id === selectedSubId) || pendingSubmissions[0] || null;

  useEffect(() => {
    setBridgeUrl(settings.googleAppsScriptUrl || '');
    setBridgeToken(settings.googleAppsScriptToken || '');
  }, [settings.googleAppsScriptUrl, settings.googleAppsScriptToken]);

  useEffect(() => {
    if (!isOpen) return;
    if (currentSub && selectedSubId !== currentSub.id) {
      setSelectedSubId(currentSub.id);
    }
  }, [isOpen, currentSub?.id]);

  if (!isOpen) return null;

  let targetInvoice: Invoice | null = null;
  if (currentSub) {
    if (currentSub.billingPeriod) {
      const periodMatch = invoices.find(
        i =>
          i.roomNumber === currentSub.roomNumber &&
          i.billingPeriod === currentSub.billingPeriod &&
          i.status !== 'ROLLED_OVER' &&
          i.balanceDueSatang > 0
      );
      if (periodMatch) {
        targetInvoice = periodMatch;
      }
    }
    if (!targetInvoice) {
      const latestInv = getLatestRoomInvoice(invoices, currentSub.roomNumber);
      if (latestInv && latestInv.balanceDueSatang > 0) {
        targetInvoice = latestInv;
      }
    }
  }

  const isBridgeConfigured = Boolean(settings.googleAppsScriptUrl && settings.googleAppsScriptToken);
  const livePaymentFormUrl = settings.paymentFormUrl || LIVE_PAYMENT_FORM_URL;
  const liveInformPageUrl = settings.informPageUrl || LIVE_INFORM_PAGE_URL;

  const handleSyncNow = async (overrideU?: string, overrideT?: string) => {
    const u = (overrideU !== undefined ? overrideU : bridgeUrl).trim();
    const t = (overrideT !== undefined ? overrideT : bridgeToken).trim();
    if (!u || !t) {
      setActiveTab('script');
      setSyncStatusMsg({
        ok: false,
        text: 'กรุณาวาง Apps Script Web App URL และ Secret Token ด้านล่างก่อนกดดึงสลิป'
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
        text: `ซิงก์สำเร็จ! พบสลิปรอตรวจ ${res.pendingPaymentsCount} รายการ (มาใหม่ ${res.newPaymentsCount}) • คำขอลงทะเบียนรออนุมัติ ${res.pendingRegistrationsCount} รายการ`
      });
      if (res.pendingPaymentsCount > 0 && overrideU === undefined) {
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

  const handleRefreshFormChoices = async () => {
    setIsRefreshingForm(true);
    setSyncStatusMsg(null);
    try {
      const res = await refreshGoogleFormsViaBridge();
      setSyncStatusMsg({
        ok: true,
        text: `อัปเดตวันครบกำหนดใน Google Form (วันที่ ${settings.dueDayNextMonth || 5} ของเดือนถัดไป) สำเร็จ: ${res.message}`
      });
    } catch (err: any) {
      setSyncStatusMsg({
        ok: false,
        text: err.message || 'ไม่สามารถอัปเดต Google Form ได้'
      });
    } finally {
      setIsRefreshingForm(false);
    }
  };

  const handleApprove = async () => {
    if (!currentSub) return;
    setIsSubmitting(true);
    try {
      const res = await approveReconcile(
        currentSub.id,
        targetInvoice?.id,
        adminNote || 'ยอดเงินเข้าบัญชีตรงกับสลิป'
      );
      setAdminNote('');
      onRefreshState();
      const remaining = pendingSubmissions.filter(s => s.id !== currentSub.id);
      setSelectedSubId(remaining[0]?.id || null);
      if (res.sheetWarning) {
        alert(`ตัดยอดบิลสำเร็จ!\n\nหมายเหตุ: ${res.sheetWarning}`);
      }
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถตัดยอดได้'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentSub) return;
    const reason = prompt(
      'กรุณาระบุเหตุผลการปฏิเสธสลิป (เช่น ไม่มียอดเงินเข้าบัญชี, สลิปซ้ำ):',
      'ตรวจสอบไม่พบยอดเงินในบัญชีธนาคาร'
    );
    if (!reason) return;

    setIsSubmitting(true);
    try {
      await rejectReconcile(currentSub.id, reason);
      onRefreshState();
      const remaining = pendingSubmissions.filter(s => s.id !== currentSub.id);
      setSelectedSubId(remaining[0]?.id || null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await manualUploadSlip({
        roomNumber: manualRoom,
        tenantName:
          manualName || rooms.find(r => r.roomNumber === manualRoom)?.tenantName || `ห้อง ${manualRoom}`,
        amountSatang: Math.round(Number(manualAmount) * 100),
        transferDate: manualDate,
        transferTime: manualTime,
        bankAccount: settings.bankName || 'KBank',
        slipUrl: manualSlipUrl
      });
      alert('เพิ่มรายการแจ้งชำระเงินเรียบร้อยแล้ว');
      setActiveTab('pending');
      onRefreshState();
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              💳
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ตรวจสอบสลิป &amp; กระทบยอดธนาคาร (Google Form)</span>
                {pendingSubmissions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    รอตรวจสอบ {pendingSubmissions.length} รายการ
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                ดึงสลิปโอนเงินจาก Google Form จับคู่บิลค่าเช่า และบันทึกสถานะยืนยันกลับลง Google Sheet อัตโนมัติ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSyncNow()}
              disabled={isSyncing}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>{isSyncing ? 'กำลังดึงสลิป...' : 'ดึงสลิปจาก Google Form'}</span>
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
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📥 รายการรอตรวจสอบ ({pendingSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 ประวัติที่ตัดยอดแล้ว ({historySubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition flex items-center gap-1.5 ${
              activeTab === 'script'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>⚙️ เชื่อมต่อ Google Form</span>
            {isBridgeConfigured && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-2 px-3 font-semibold border-b-2 whitespace-nowrap transition ${
              activeTab === 'manual'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ➕ อัปโหลดสลิปด้วยตนเอง
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
          {activeTab === 'pending' &&
            (pendingSubmissions.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto opacity-80" />
                <h3 className="text-base font-semibold text-slate-200">ไม่มีสลิปค้างรอตรวจสอบ</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {isBridgeConfigured
                    ? 'เชื่อมต่อ Google Form เรียบร้อยแล้ว ระบบจะเช็กสลิปใหม่อัตโนมัติทุก 45 วินาที หรือกดปุ่มดึงสลิปทันทีด้านล่าง'
                    : 'ยังไม่ได้ผูก URL ของ Google Apps Script — กดปุ่ม "ตั้งค่าเชื่อมต่อ Google Form" เพื่อดึงสลิปโอนเงินจริงจากฟอร์มของหอพัก'}
                </p>
                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  {isBridgeConfigured ? (
                    <button
                      type="button"
                      onClick={() => handleSyncNow()}
                      disabled={isSyncing}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                      <span>ดึงสลิปใหม่จาก Google Form ทันที</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setActiveTab('script')}
                      className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition"
                    >
                      ⚙️ ตั้งค่าเชื่อมต่อ Google Form
                    </button>
                  )}
                  <a
                    href={liveInformPageUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium transition flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>เปิดหน้าเว็บแจ้งชำระเงิน (/inform/)</span>
                  </a>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left List of Submissions */}
                <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-slate-950/40 p-2 space-y-1.5 max-h-[520px] overflow-y-auto">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">รายการสลิปรอตรวจ:</div>
                  {pendingSubmissions.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => {
                        setSelectedSubId(sub.id);
                        setAdminNote('');
                      }}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between gap-2 ${
                        currentSub?.id === sub.id
                          ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-amber-300">ห้อง {sub.roomNumber}</span>
                          <span className="text-xs text-slate-300 truncate max-w-[120px]">{sub.tenantName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sub.transferDate} • {sub.transferTime} น.
                          {sub.billingPeriod ? ` • งวด ${sub.billingPeriod}` : ''}
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <div className="font-bold text-sm text-emerald-400 mono-num">
                          {formatBaht(sub.amountSatang)} บ.
                        </div>
                        <span className="text-[10px] text-amber-400 font-medium">รอตัดยอด</span>
                      </div>
                    </button>
                  ))}
                </div>

                {/* Right Reconcile Detail Panel */}
                {currentSub && (
                  <div className="lg:col-span-8 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Slip Preview Box */}
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-3 flex flex-col items-center">
                        <div className="w-full flex items-center justify-between text-xs text-slate-400 mb-2">
                          <span className="font-semibold text-slate-300 flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                            รูปสลิปหลักฐานการโอน
                          </span>
                          {currentSub.slipUrl && (
                            <a
                              href={getExternalSlipUrl(currentSub)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                            >
                              <ExternalLink className="w-3 h-3" /> เปิดดูสลิปเต็มใน Google Drive
                            </a>
                          )}
                        </div>
                        <div className="w-full max-h-[360px] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 group relative">
                          <img
                            src={getPreviewImageUrl(currentSub)}
                            alt="Slip Payslip"
                            className="max-h-[360px] w-auto object-contain rounded"
                            onError={(e: any) => {
                              e.target.onerror = null;
                              e.target.src =
                                'https://placehold.co/400x500/1e293b/94a3b8?text=Open+Slip+in+Google+Drive';
                            }}
                          />
                        </div>
                      </div>

                      {/* Reconciliation Matching Box */}
                      <div className="border border-slate-800 rounded-xl bg-slate-950/60 p-4 flex flex-col justify-between space-y-3">
                        <div>
                          <div className="text-xs text-slate-400 font-semibold mb-2">ข้อมูลที่แจ้งจาก Google Form:</div>
                          <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-1.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-slate-400">ห้องพัก:</span>
                              <strong className="text-amber-300 font-semibold">ห้อง {currentSub.roomNumber}</strong>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">ชื่อผู้แจ้ง:</span>
                              <span className="text-white font-medium">{currentSub.tenantName}</span>
                            </div>
                            {currentSub.billingPeriod && (
                              <div className="flex justify-between">
                                <span className="text-slate-400">เดือนที่ชำระ:</span>
                                <span className="text-sky-300 font-semibold mono-num">{currentSub.billingPeriod}</span>
                              </div>
                            )}
                            {currentSub.paymentCategories && (
                              <div className="flex justify-between gap-2">
                                <span className="text-slate-400 shrink-0">ประเภทการชำระ:</span>
                                <span className="text-slate-200 text-right">{currentSub.paymentCategories}</span>
                              </div>
                            )}
                            <div className="flex justify-between">
                              <span className="text-slate-400">วัน-เวลาโอน:</span>
                              <span className="text-slate-200">
                                {currentSub.transferDate} เวลา {currentSub.transferTime} น.
                              </span>
                            </div>
                            <div className="flex justify-between pt-1 border-t border-slate-800 text-sm">
                              <span className="text-slate-300 font-semibold">ยอดเงินที่โอน:</span>
                              <strong className="text-emerald-400 font-bold mono-num text-base">
                                {formatBaht(currentSub.amountSatang)} บาท
                              </strong>
                            </div>
                          </div>
                        </div>

                        {/* Invoice Match Comparison */}
                        <div>
                          <div className="text-xs text-slate-400 font-semibold mb-1">เปรียบเทียบกับบิลในระบบ:</div>
                          {targetInvoice ? (
                            <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 text-xs space-y-1">
                              <div className="flex justify-between">
                                <span className="text-slate-400">เลขบิล:</span>
                                <span className="text-slate-300 mono-num">{targetInvoice.id}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">ยอดบิลทั้งหมด:</span>
                                <span className="mono-num text-slate-200">{formatBaht(targetInvoice.totalSatang)} บ.</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">ชำระแล้ว:</span>
                                <span className="mono-num text-emerald-400">
                                  -{formatBaht(targetInvoice.paidSatang)} บ.
                                </span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                                <span className="text-amber-400">ยอดคงเหลือที่ต้องจ่าย:</span>
                                <span className="mono-num text-amber-300 text-sm">
                                  {formatBaht(targetInvoice.balanceDueSatang)} บาท
                                </span>
                              </div>
                              {currentSub.amountSatang >= targetInvoice.balanceDueSatang ? (
                                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> ยอดเงินครอบคลุมครบตามบิล (ตัดหนี้หมด 100%)
                                </div>
                              ) : (
                                <div className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 inline" /> ยอดโอนแบ่งจ่ายบางส่วน (คงเหลืออีก{' '}
                                  {formatBaht(targetInvoice.balanceDueSatang - currentSub.amountSatang)} บ.)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 text-xs text-slate-400 text-center">
                              ไม่พบบิลค้างชำระของห้อง {currentSub.roomNumber} (อาจเป็นเงินจองห้อง เงินประกัน หรือชำระล่วงหน้า — สามารถกดยืนยันเพื่อบันทึกประวัติได้)
                            </div>
                          )}
                        </div>

                        {/* Admin note & Action buttons */}
                        <div className="space-y-2 pt-2 border-t border-slate-800">
                          <input
                            type="text"
                            placeholder="หมายเหตุการตรวจสอบ (เช่น ยอดตรงกับ KBank เวลา 14:32 น.)"
                            value={adminNote}
                            onChange={(e) => setAdminNote(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-400"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleReject}
                              disabled={isSubmitting}
                              className="flex-1 px-3 py-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-semibold text-xs transition flex items-center justify-center gap-1.5"
                            >
                              <XCircle className="w-4 h-4" />
                              <span>ปฏิเสธสลิป</span>
                            </button>
                            <button
                              type="button"
                              onClick={handleApprove}
                              disabled={isSubmitting}
                              className="flex-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 transition flex items-center justify-center gap-1.5"
                            >
                              <CheckCircle2 className="w-4 h-4" />
                              <span>{isSubmitting ? 'กำลังบันทึก...' : '✓ ยืนยันยอดเงินเข้า & ตัดยอดบิล'}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

          {activeTab === 'history' &&
            (historySubmissions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีประวัติการตัดยอด</div>
            ) : (
              <div className="space-y-2">
                {historySubmissions.map(sub => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          sub.status === 'RECONCILED'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : 'bg-rose-500/20 text-rose-400'
                        }`}
                      >
                        {sub.status === 'RECONCILED' ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>ห้อง {sub.roomNumber}</span>
                          <span className="text-slate-400 font-normal">({sub.tenantName})</span>
                          {sub.billingPeriod && (
                            <span className="text-sky-300 font-mono text-[11px]">งวด {sub.billingPeriod}</span>
                          )}
                        </div>
                        <div className="text-slate-400 text-[11px]">
                          โอนเมื่อ {sub.transferDate} {sub.transferTime} น. • หมายเหตุ: {sub.adminNote || '-'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className="font-bold text-emerald-400 mono-num text-sm">
                          {formatBaht(sub.amountSatang)} บ.
                        </div>
                        <span
                          className={`text-[10px] font-semibold ${
                            sub.status === 'RECONCILED' ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {sub.status === 'RECONCILED' ? 'ตัดยอดบิลสำเร็จ' : 'ปฏิเสธ'}
                        </span>
                      </div>
                      {sub.slipUrl && (
                        <a
                          href={getExternalSlipUrl(sub)}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:text-white text-[11px] border border-slate-700"
                        >
                          ดูสลิป
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}

          {activeTab === 'script' && (
            <div className="space-y-4 text-xs">
              <div className="bg-slate-950/70 border border-amber-500/30 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-white text-sm">
                      🔗 เชื่อมต่อ Google Form แจ้งชำระเงิน &amp; ลงทะเบียนผู้เช่า
                    </h3>
                    <p className="text-slate-400 mt-0.5">
                      ใช้ URL และ Secret Token เดียวกันสำหรับทั้งฟอร์มแจ้งชำระเงินและฟอร์มลงทะเบียนผู้เช่า (ตั้งค่าที่ใดที่หนึ่งมีผลทั้งระบบ)
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <a
                      href={liveInformPageUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> หน้าแจ้งโอน (/inform/)
                    </a>
                    <a
                      href={livePaymentFormUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center gap-1"
                    >
                      <ExternalLink className="w-3 h-3" /> Google Form แจ้งโอน
                    </a>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">1. Apps Script Web App URL</label>
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
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center gap-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>{isSyncing ? 'กำลังทดสอบ & ซิงก์ข้อมูล...' : '💾 บันทึก & ดึงข้อมูลจาก Google Form ทันที'}</span>
                  </button>
                  {isBridgeConfigured && (
                    <button
                      type="button"
                      onClick={handleRefreshFormChoices}
                      disabled={isRefreshingForm}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 font-semibold transition flex items-center gap-1.5"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 ${isRefreshingForm ? 'animate-spin' : ''}`} />
                      <span>อัปเดตวันครบกำหนด (วันที่ {settings.dueDayNextMonth || 5}) ใน Google Form</span>
                    </button>
                  )}
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-bold text-white text-sm">
                      โค้ดสำหรับวางใน Google Sheet (ไฟล์ DashboardBridge.gs)
                    </div>
                    <p className="text-slate-400 mt-0.5">
                      เปิด Google Sheet <strong>Taky Apartment — Payments</strong> &rarr;{' '}
                      <strong>Extensions &gt; Apps Script</strong> &rarr; สร้างไฟล์{' '}
                      <code className="text-amber-300">DashboardBridge.gs</code> (และเปลี่ยน{' '}
                      <code className="text-amber-300">DUE_DAY = 5</code> ใน <code className="text-amber-300">Code.gs</code>)
                      แล้วกด Run <code className="text-emerald-300">setupDashboardBridge</code> และ Deploy เป็น Web App
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(DASHBOARD_BRIDGE_GS);
                      setCopiedScript(true);
                      setTimeout(() => setCopiedScript(false), 2500);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold transition shrink-0"
                  >
                    {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedScript ? 'คัดลอก DashboardBridge.gs แล้ว!' : 'คัดลอกโค้ด DashboardBridge.gs'}</span>
                  </button>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-200/90 overflow-x-auto max-h-[220px]">
                  <pre>{DASHBOARD_BRIDGE_GS}</pre>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'manual' && (
            <div className="max-w-xl mx-auto bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                เพิ่มรายการแจ้งโอนเงินด้วยตนเอง (หรือทดสอบระบบตัดยอด)
              </h3>
              <form onSubmit={handleManualSubmit} className="space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">เลือกห้องพัก</label>
                    <select
                      value={manualRoom}
                      onChange={(e) => setManualRoom(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    >
                      {rooms.map(r => (
                        <option key={r.roomNumber} value={r.roomNumber}>
                          ห้อง {r.roomNumber} ({r.tenantName || 'ห้องว่าง'})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">ชื่อผู้แจ้งโอน</label>
                    <input
                      type="text"
                      value={manualName}
                      onChange={(e) => setManualName(e.target.value)}
                      placeholder="เช่น คุณสมศักดิ์"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-slate-400 block mb-1">จำนวนเงิน (บาท)</label>
                    <input
                      type="number"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value)}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-emerald-400 font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">วันที่โอน</label>
                    <input
                      type="date"
                      value={manualDate}
                      onChange={(e) => setManualDate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="text-slate-400 block mb-1">เวลาโอน</label>
                    <input
                      type="text"
                      value={manualTime}
                      onChange={(e) => setManualTime(e.target.value)}
                      placeholder="14:30"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-slate-400 block mb-1">URL รูปสลิป</label>
                  <input
                    type="text"
                    value={manualSlipUrl}
                    onChange={(e) => setManualSlipUrl(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-300 text-[11px]"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold transition flex items-center justify-center gap-2"
                  >
                    <span>{isSubmitting ? 'กำลังส่งข้อมูล...' : 'ส่งข้อมูลเข้าระบบ Reconcile'}</span>
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
