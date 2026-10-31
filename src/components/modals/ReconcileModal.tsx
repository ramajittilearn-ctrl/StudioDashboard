import React, { useState } from 'react';
import { FormSubmission, Invoice, Room } from '../../types';
import { formatBaht, getLatestRoomInvoice } from '../../lib/finance';
import { X, CheckCircle2, XCircle, Upload, FileText, ExternalLink, Image as ImageIcon, ZoomIn, AlertCircle, Copy, Check } from 'lucide-react';
import { approveReconcile, manualUploadSlip, rejectReconcile } from '../../api/client';

interface ReconcileModalProps {
  isOpen: boolean;
  onClose: () => void;
  submissions: FormSubmission[];
  rooms: Room[];
  invoices: Invoice[];
  onRefreshState: () => void;
}

export const ReconcileModal: React.FC<ReconcileModalProps> = ({
  isOpen,
  onClose,
  submissions,
  rooms,
  invoices,
  onRefreshState
}) => {
  const [selectedSubId, setSelectedSubId] = useState<string | null>(submissions[0]?.id || null);
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'manual' | 'script'>('pending');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [adminNote, setAdminNote] = useState('');
  const [copiedScript, setCopiedScript] = useState(false);

  // Manual slip upload form state
  const [manualRoom, setManualRoom] = useState('101');
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('3200');
  const [manualDate, setManualDate] = useState('2026-10-26');
  const [manualTime, setManualTime] = useState('14:30');
  const [manualSlipUrl, setManualSlipUrl] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600&auto=format&fit=crop&q=80');

  if (!isOpen) return null;

  const pendingSubmissions = submissions.filter(s => s.status === 'PENDING');
  const historySubmissions = submissions.filter(s => s.status !== 'PENDING');
  const currentSub = submissions.find(s => s.id === selectedSubId) || pendingSubmissions[0];

  const latestInv = currentSub ? getLatestRoomInvoice(invoices, currentSub.roomNumber) : undefined;
  const targetInvoice = latestInv && latestInv.balanceDueSatang > 0 ? latestInv : null;
  const targetRoom = currentSub ? rooms.find(r => r.roomNumber === currentSub.roomNumber) : null;

  const handleApprove = async () => {
    if (!currentSub) return;
    setIsSubmitting(true);
    try {
      await approveReconcile(currentSub.id, targetInvoice?.id, adminNote || 'ยอดเงินเข้าบัญชีตรงกับสลิป');
      setAdminNote('');
      onRefreshState();
      // Select next pending if available
      const remaining = pendingSubmissions.filter(s => s.id !== currentSub.id);
      setSelectedSubId(remaining[0]?.id || null);
    } catch (err: any) {
      alert('เกิดข้อผิดพลาด: ' + (err.message || 'ไม่สามารถตัดยอดได้'));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!currentSub) return;
    const reason = prompt('กรุณาระบุเหตุผลการปฏิเสธสลิป (เช่น ไม่มียอดเงินเข้าบัญชี, สลิปซ้ำ):', 'ตรวจสอบไม่พบยอดเงินในบัญชีธนาคาร');
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
        tenantName: manualName || (rooms.find(r => r.roomNumber === manualRoom)?.tenantName || `ห้อง ${manualRoom}`),
        amountSatang: Math.round(Number(manualAmount) * 100),
        transferDate: manualDate,
        transferTime: manualTime,
        bankAccount: 'KBank',
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

  const googleAppsScriptCode = `/**
 * Google Apps Script สำหรับผูกกับ Google Form รับแจ้งโอนเงิน
 * ส่งข้อมูลเข้า Taky Apartment ERP อัตโนมัติ
 */
function onFormSubmit(e) {
  var responses = e.response.getItemResponses();
  var formData = {};
  
  for (var i = 0; i < responses.length; i++) {
    var title = responses[i].getItem().getTitle();
    var val = responses[i].getResponse();
    formData[title] = val;
  }
  
  // แปลงฟิลด์ตามหัวข้อคำถามใน Google Form ของท่าน
  var payload = {
    roomNumber: formData['เลขห้อง'] || formData['ห้องพัก'] || '101',
    tenantName: formData['ชื่อผู้โอน'] || formData['ชื่อ-นามสกุล'] || '',
    amount: formData['จำนวนเงินที่โอน'] || formData['ยอดเงิน'] || 0,
    paymentDate: formData['วันที่โอน'] || Utilities.formatDate(new Date(), 'GMT+7', 'yyyy-MM-dd'),
    paymentTime: formData['เวลาที่โอน'] || Utilities.formatDate(new Date(), 'GMT+7', 'HH:mm'),
    bankAccount: formData['ธนาคารปลายทาง'] || 'KBank',
    slipUrl: formData['แนบสลิป'] || '' // URL จาก Google Drive หรือภาพแนบ
  };
  
  var options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  };
  
  var webhookUrl = "${window.location.origin}/api/webhooks/google-form/payment";
  UrlFetchApp.fetch(webhookUrl, options);
}`;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
              💳
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ตรวจสอบสลิป & กระทบยอดธนาคาร (Bank Reconcile)</span>
                {pendingSubmissions.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    รอตรวจสอบ {pendingSubmissions.length} รายการ
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">จับคู่สลิปจาก Google Form กับบิลค่าเช่า เพื่อกระทบยอดบัญชีธนาคาร</p>
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
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📥 รายการรอตรวจสอบ ({pendingSubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('history')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'history'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            📜 ประวัติที่ตัดยอดแล้ว ({historySubmissions.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('manual')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'manual'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ➕ อัปโหลดสลิปทดสอบ
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`pb-2 px-3 font-semibold border-b-2 transition ${
              activeTab === 'script'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            ⚙️ โค้ดเชื่อมต่อ Google Form
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto flex-1">
          {activeTab === 'pending' && (
            pendingSubmissions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3 opacity-80" />
                <h3 className="text-base font-semibold text-slate-200">ไม่มีสลิปค้างรอตรวจสอบ</h3>
                <p className="text-xs text-slate-400 mt-1">
                  ทุกรายการที่ผู้เช่าแจ้งผ่าน Google Form ได้รับการกระทบยอดเรียบร้อยแล้ว
                </p>
                <div className="mt-4 flex justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
                  >
                    อัปโหลดสลิปทดสอบ
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                {/* Left List of Submissions */}
                <div className="lg:col-span-4 border border-slate-800 rounded-xl bg-slate-950/40 p-2 space-y-1.5 max-h-[500px] overflow-y-auto">
                  <div className="text-[11px] font-semibold text-slate-400 px-2 py-1">รายการสลิปรอตรวจ:</div>
                  {pendingSubmissions.map(sub => (
                    <button
                      key={sub.id}
                      type="button"
                      onClick={() => { setSelectedSubId(sub.id); setAdminNote(''); }}
                      className={`w-full text-left p-3 rounded-xl border transition flex items-center justify-between ${
                        (currentSub?.id === sub.id)
                          ? 'bg-amber-500/10 border-amber-500/50 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-amber-300">ห้อง {sub.roomNumber}</span>
                          <span className="text-xs text-slate-300 truncate max-w-[120px]">{sub.tenantName}</span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {sub.transferDate} • {sub.transferTime} น.
                        </div>
                      </div>
                      <div className="text-right">
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
                          <a
                            href={currentSub.slipUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:underline flex items-center gap-1 text-[11px]"
                          >
                            <ExternalLink className="w-3 h-3" /> เปิดภาพขนาดเต็ม
                          </a>
                        </div>
                        <div className="w-full max-h-[340px] bg-slate-900 rounded-lg overflow-hidden flex items-center justify-center border border-slate-800 group relative">
                          <img
                            src={currentSub.slipUrl}
                            alt="Slip Payslip"
                            className="max-h-[340px] w-auto object-contain rounded"
                            onError={(e: any) => {
                              e.target.src = 'https://placehold.co/400x500/1e293b/94a3b8?text=Payslip+Preview';
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
                            <div className="flex justify-between">
                              <span className="text-slate-400">วัน-เวลาโอน:</span>
                              <span className="text-slate-200">{currentSub.transferDate} เวลา {currentSub.transferTime} น.</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-slate-400">บัญชีปลายทาง:</span>
                              <span className="text-slate-200">{currentSub.bankAccount}</span>
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
                                <span className="mono-num text-emerald-400">-{formatBaht(targetInvoice.paidSatang)} บ.</span>
                              </div>
                              <div className="flex justify-between pt-1 border-t border-slate-800 font-bold">
                                <span className="text-amber-400">ยอดคงเหลือที่ต้องจ่าย:</span>
                                <span className="mono-num text-amber-300 text-sm">{formatBaht(targetInvoice.balanceDueSatang)} บาท</span>
                              </div>
                              {currentSub.amountSatang >= targetInvoice.balanceDueSatang ? (
                                <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5 inline" /> ยอดเงินครอบคลุมครบตามบิล (ตัดหนี้หมด 100%)
                                </div>
                              ) : (
                                <div className="text-[11px] text-amber-300 mt-1 flex items-center gap-1">
                                  <AlertCircle className="w-3.5 h-3.5 inline" /> ยอดโอนแบ่งจ่ายบางส่วน (คงเหลืออีก {formatBaht(targetInvoice.balanceDueSatang - currentSub.amountSatang)} บ.)
                                </div>
                              )}
                            </div>
                          ) : (
                            <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800 text-xs text-slate-400 text-center">
                              ไม่พบบิลค้างชำระของห้อง {currentSub.roomNumber} (อาจเป็นเงินจองห้อง หรือชำระล่วงหน้า)
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
            )
          )}

          {activeTab === 'history' && (
            historySubmissions.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">ยังไม่มีประวัติการตัดยอด</div>
            ) : (
              <div className="space-y-2">
                {historySubmissions.map(sub => (
                  <div
                    key={sub.id}
                    className="p-3 rounded-xl border border-slate-800 bg-slate-950/40 flex flex-wrap items-center justify-between gap-3 text-xs"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                        sub.status === 'RECONCILED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                      }`}>
                        {sub.status === 'RECONCILED' ? '✓' : '✕'}
                      </div>
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <span>ห้อง {sub.roomNumber}</span>
                          <span className="text-slate-400 font-normal">({sub.tenantName})</span>
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
                        <span className={`text-[10px] font-semibold ${sub.status === 'RECONCILED' ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {sub.status === 'RECONCILED' ? 'ตัดยอดบิลสำเร็จ' : 'ปฏิเสธ'}
                        </span>
                      </div>
                      {sub.slipUrl && (
                        <a
                          href={sub.slipUrl}
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
            )
          )}

          {activeTab === 'manual' && (
            <div className="max-w-xl mx-auto bg-slate-950/60 p-5 rounded-2xl border border-slate-800">
              <h3 className="font-bold text-white text-sm mb-3 flex items-center gap-2">
                <Upload className="w-4 h-4 text-amber-400" />
                อัปโหลดสลิปทดสอบ หรือเพิ่มรายการแจ้งโอนด้วยตนเอง
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
                  <label className="text-slate-400 block mb-1">URL รูปสลิป (หรือใส่ภาพตัวอย่าง)</label>
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

          {activeTab === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-white text-sm">Google Apps Script Webhook Endpoint</h3>
                  <p className="text-xs text-slate-400">
                    คัดลอกโค้ดนี้ไปวางใน Google Form / Google Sheets ของท่าน (เมนู Extensions &gt; Apps Script) เพื่อส่งข้อมูลสลิปเข้าหอพักแบบอัตโนมัติ
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(googleAppsScriptCode);
                    setCopiedScript(true);
                    setTimeout(() => setCopiedScript(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 text-xs font-semibold transition"
                >
                  {copiedScript ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedScript ? 'คัดลอกแล้ว!' : 'คัดลอกโค้ด Apps Script'}</span>
                </button>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 font-mono text-[11px] text-amber-200/90 overflow-x-auto max-h-[300px]">
                <pre>{googleAppsScriptCode}</pre>
              </div>

              <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-3 text-xs text-slate-300 space-y-1">
                <div className="font-semibold text-white">🔗 Webhook URL สำหรับรับข้อมูล:</div>
                <div className="font-mono text-emerald-400 bg-slate-900 px-3 py-1.5 rounded border border-slate-800 select-all">
                  {window.location.origin}/api/webhooks/google-form/payment
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
