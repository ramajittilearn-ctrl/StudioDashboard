import React, { useState } from 'react';
import { BackupSnapshot, PropertySettings } from '../../types';
import { User } from 'firebase/auth';
import { ADMIN_EMAIL, isUserAdmin } from '../../lib/firebase';
import { X, Database, RotateCcw, Download, Upload, ShieldAlert, CheckCircle2, Clock, Calendar, Sparkles, AlertTriangle } from 'lucide-react';
import { createBackup, recallBackup, resetToDayOne, resetToDemo, restoreBackup } from '../../api/client';

interface BackupRecallModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupSnapshot[];
  settings: PropertySettings;
  currentUser: User | null;
  onRefreshState: () => void;
}

export const BackupRecallModal: React.FC<BackupRecallModalProps> = ({
  isOpen,
  onClose,
  backups,
  settings,
  currentUser,
  onRefreshState
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [customName, setCustomName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;

  const isAdmin = isUserAdmin(currentUser);

  const handleCreateSnapshot = async () => {
    setIsProcessing(true);
    setStatusMessage(null);
    try {
      await createBackup(customName || undefined, 'MANUAL');
      setCustomName('');
      setStatusMessage({ text: 'บันทึก Snapshot สำรองข้อมูลเรียบร้อยแล้ว', type: 'success' });
      onRefreshState();
    } catch (err: any) {
      setStatusMessage({ text: 'เกิดข้อผิดพลาด: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRecallSnapshot = async (snap: BackupSnapshot) => {
    if (!isAdmin) {
      alert(`คุณไม่มีสิทธิ์กู้คืนข้อมูล ฟังก์ชันนี้สงวนไว้เฉพาะ Admin (${ADMIN_EMAIL}) เท่านั้น`);
      return;
    }

    const confirmed = window.confirm(
      `⚠️ ยืนยันการกู้คืนข้อมูล (Recall Snapshot)\n\nระบบจะย้อนกลับไปใช้ข้อมูลจาก: "${snap.name}" (${new Date(snap.timestamp).toLocaleString('th-TH')})\n\nต้องการดำเนินการต่อหรือไม่?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await recallBackup(snap.id);
      setStatusMessage({ text: res.message || 'กู้คืนข้อมูลสำเร็จเรียบร้อยแล้ว', type: 'success' });
      onRefreshState();
    } catch (err: any) {
      setStatusMessage({ text: 'เกิดข้อผิดพลาด: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDayOne = async () => {
    if (!isAdmin) {
      alert(`คุณไม่มีสิทธิ์รีเซ็ตระบบ ฟังก์ชันนี้สงวนไว้เฉพาะ Admin (${ADMIN_EMAIL}) เท่านั้น`);
      return;
    }

    const confirmed = window.confirm(
      `🔄 ยืนยันการเริ่มต้นระบบวันแรก (Day-1 Clean Slate)\n\nระบบจะรีเซ็ตห้องทั้ง 15 ห้องเป็นห้องว่างทั้งหมด (101-305) มิเตอร์น้ำไฟเริ่มต้นที่ 0 และล้างรายการบิลทั้งหมด เพื่อให้พร้อมเปิดรับผู้เช่าจริงเสมือนวันแรก\n\nต้องการดำเนินการต่อหรือไม่?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await resetToDayOne();
      setStatusMessage({ text: res.message || 'รีเซ็ตระบบเป็นวันแรกเรียบร้อยแล้ว', type: 'success' });
      onRefreshState();
    } catch (err: any) {
      setStatusMessage({ text: 'เกิดข้อผิดพลาด: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResetDemo = async () => {
    if (!isAdmin) {
      alert(`คุณไม่มีสิทธิ์ดำเนินการ ฟังก์ชันนี้สงวนไว้เฉพาะ Admin (${ADMIN_EMAIL}) เท่านั้น`);
      return;
    }

    const confirmed = window.confirm(
      `🌟 โหลดข้อมูลจำลองสำหรับทดสอบ (Demo Sandbox)\n\nระบบจะเติมข้อมูลผู้เช่า 12 ห้อง บิลค่าเช่า และรายการค้างชำระสำหรับทดสอบการทำงาน\n\nต้องการดำเนินการต่อหรือไม่?`
    );
    if (!confirmed) return;

    setIsProcessing(true);
    setStatusMessage(null);
    try {
      const res = await resetToDemo();
      setStatusMessage({ text: res.message || 'โหลดข้อมูลตัวอย่างเรียบร้อยแล้ว', type: 'success' });
      onRefreshState();
    } catch (err: any) {
      setStatusMessage({ text: 'เกิดข้อผิดพลาด: ' + err.message, type: 'error' });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (!parsed || !Array.isArray(parsed.rooms) || parsed.rooms.length !== 15) {
          throw new Error('ไฟล์สำรองไม่ถูกต้อง ต้องมีโครงสร้าง 15 ห้อง');
        }
        await restoreBackup(parsed);
        setStatusMessage({ text: 'นำเข้าและกู้คืนข้อมูลจากไฟล์สำเร็จแล้ว', type: 'success' });
        onRefreshState();
      } catch (err: any) {
        setStatusMessage({ text: 'ไม่สามารถกู้คืนไฟล์ได้: ' + err.message, type: 'error' });
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center font-bold">
              <Database className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>ระบบสำรองข้อมูล &amp; กู้คืน (Weekly Backup &amp; Recall)</span>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  เฉพาะ Admin
                </span>
              </h2>
              <p className="text-xs text-slate-400">ระบบสำรองอัตโนมัติทุกสัปดาห์ และสามารถ Recall ย้อนกลับได้หากเกิดข้อผิดพลาด</p>
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

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-5">
          {/* Status Message */}
          {statusMessage && (
            <div className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              statusMessage.type === 'success' ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300' : 'bg-rose-950/50 border-rose-500/40 text-rose-300'
            }`}>
              {statusMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
              <span>{statusMessage.text}</span>
            </div>
          )}

          {/* Admin Warning Banner if not Admin */}
          {!isAdmin && (
            <div className="p-3.5 rounded-xl border border-amber-500/40 bg-amber-950/30 text-amber-300 text-xs flex items-center gap-3">
              <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
              <div>
                <strong className="block font-semibold">สิทธิ์การกู้คืนถูกจำกัด</strong>
                <span>ท่านกำลังดูในโหมดผู้ใช้ทั่วไป เฉพาะบัญชี <strong>{ADMIN_EMAIL}</strong> เท่านั้นที่สามารถกด Recall หรือ Reset ระบบได้</span>
              </div>
            </div>
          )}

          {/* Action Control Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Create Manual Snapshot */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2">
              <div className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-purple-400" />
                <span>บันทึก Snapshot ตอนนี้</span>
              </div>
              <input
                type="text"
                placeholder="ชื่อบันทึก (ระบุหรือไม่ก็ได้)"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white"
              />
              <button
                type="button"
                onClick={handleCreateSnapshot}
                disabled={isProcessing}
                className="w-full py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-semibold text-xs transition"
              >
                + บันทึก Snapshot
              </button>
            </div>

            {/* Day-1 Clean Slate */}
            <div className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-950/20 space-y-2 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-xs text-emerald-300 flex items-center gap-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-400" />
                  <span>เริ่มต้นระบบวันแรก (Day 1)</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  รีเซ็ตเป็น 15 ห้องว่าง มิเตอร์ 0 รอรับผู้เช่าจริง
                </p>
              </div>
              <button
                type="button"
                onClick={handleResetDayOne}
                disabled={isProcessing || !isAdmin}
                className="w-full py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs transition shadow-sm"
              >
                🔄 เริ่มต้นระบบวันแรก (Day 1)
              </button>
            </div>

            {/* Demo Sandbox / File Export */}
            <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-950/60 space-y-2 flex flex-col justify-between">
              <div>
                <div className="font-semibold text-xs text-slate-300 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>ข้อมูลจำลอง / ดาวน์โหลด</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  โหลดข้อมูลตัวอย่างเพื่อซ้อมใช้งาน หรือดาวน์โหลด JSON
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleResetDemo}
                  disabled={isProcessing || !isAdmin}
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-medium text-xs border border-slate-700 transition"
                  title="โหลดข้อมูลตัวอย่างสำหรับทดสอบระบบ"
                >
                  โหลด Demo
                </button>
                <a
                  href="/api/backup/download"
                  download
                  className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs border border-slate-700 transition text-center flex items-center justify-center gap-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>โหลด JSON</span>
                </a>
              </div>
            </div>
          </div>

          {/* Snapshots History Table */}
          <div className="border border-slate-800 rounded-xl bg-slate-950/40 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Calendar className="w-4 h-4 text-purple-400" />
                <span>ประวัติ Snapshot ที่มีในระบบ ({backups.length} รายการ)</span>
              </h3>
              <span className="text-[11px] text-slate-400">เก็บประวัติย้อนหลังสูงสุด 20 จุด</span>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-400">
                ยังไม่มี Snapshot ในระบบ กดปุ่ม "บันทึก Snapshot ตอนนี้" เพื่อเริ่มสำรองข้อมูล
              </div>
            ) : (
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {backups.map(snap => {
                  const isDayOne = snap.tag === 'DAY_ONE';
                  const isWeekly = snap.tag === 'WEEKLY_AUTO';

                  return (
                    <div
                      key={snap.id}
                      className="p-3 rounded-xl border border-slate-800 bg-slate-900/80 flex flex-wrap items-center justify-between gap-3 text-xs hover:border-slate-700 transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-sm ${
                          isDayOne ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                          isWeekly ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' :
                          'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                        }`}>
                          {isDayOne ? '🌱' : isWeekly ? '📅' : '💾'}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-2">
                            <span>{snap.name}</span>
                            <span className={`text-[10px] px-1.5 py-0.2 rounded font-medium ${
                              isDayOne ? 'bg-emerald-500/20 text-emerald-300' :
                              isWeekly ? 'bg-sky-500/20 text-sky-300' :
                              'bg-purple-500/20 text-purple-300'
                            }`}>
                              {isDayOne ? 'Day-1 Baseline' : isWeekly ? 'รายสัปดาห์' : 'โดย Admin'}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5">
                            เวลา: {new Date(snap.timestamp).toLocaleString('th-TH')} • {snap.roomsCount} ห้อง • {snap.invoicesCount} บิล
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRecallSnapshot(snap)}
                        disabled={isProcessing || !isAdmin}
                        className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-semibold text-xs transition disabled:opacity-50 flex items-center gap-1.5 shadow-sm"
                        title="กู้คืนข้อมูลระบบกลับไปเป็นจุดนี้"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>กู้คืน (Recall)</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
