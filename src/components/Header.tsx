import React from 'react';
import { PropertySettings } from '../types';
import { formatBaht } from '../lib/finance';
import { Building2, Calendar, Zap, Droplets, Car, Cloud, LogIn, LogOut, CheckCircle2, LayoutDashboard, Crown, ShieldAlert, RefreshCw } from 'lucide-react';
import { User } from 'firebase/auth';
import { ADMIN_EMAIL, isUserAdmin } from '../lib/firebase';

interface HeaderProps {
  settings: PropertySettings;
  simulatedDate: string;
  onSimulatedDateChange: (date: string) => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  unpaidCount: number;
  pendingSubmissionsCount?: number;
  pendingRegistrationsCount?: number;
  onOpenReconcileModal?: () => void;
  onOpenRegistrationModal?: () => void;
  onOpenBackupRecallModal?: () => void;
  onSyncGoogleForms?: () => void;
  isSyncingForms?: boolean;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  isCloudSynced: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  simulatedDate,
  onSimulatedDateChange,
  activeTab,
  onTabChange,
  unpaidCount,
  pendingSubmissionsCount = 0,
  pendingRegistrationsCount = 0,
  onOpenReconcileModal,
  onOpenRegistrationModal,
  onOpenBackupRecallModal,
  onSyncGoogleForms,
  isSyncingForms = false,
  currentUser,
  onLogin,
  onLogout,
  isCloudSynced
}) => {
  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-30 no-print shadow-md">
      {/* Top Brand & Status Strip */}
      <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 flex items-center justify-center font-bold text-slate-950 text-base shadow-sm shrink-0">
            <Building2 className="w-6 h-6 text-slate-950" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-bold text-base sm:text-lg tracking-tight text-white">{settings.apartmentName}</h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
                15 ห้อง • 3 ชั้น (101–305)
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 font-medium">
                <Cloud className="w-3 h-3 text-sky-400" />
                <span>Firebase: myapartment-5903f</span>
                {isCloudSynced && <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400" />}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400 mt-0.5">
              <span>ตัดรอบบิลวันที่ <strong className="text-slate-200">{settings.billingDay}</strong></span>
              <span>•</span>
              <span>กำหนดจ่ายวันที่ <strong className="text-slate-200">{settings.dueDayNextMonth}</strong></span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400 inline" />
                <span>ไฟ <strong className="text-amber-400 font-semibold">{formatBaht(settings.electricityRateSatang)}</strong> บ./หน่วย</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Droplets className="w-3 h-3 text-sky-400 inline" />
                <span>น้ำ <strong className="text-sky-400 font-semibold">{formatBaht(settings.waterRateSatang)}</strong> บ./หน่วย</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Car className="w-3 h-3 text-indigo-400 inline" />
                <span>จอดรถ <strong>{formatBaht(settings.carParkingRateSatang)}</strong>/<strong>{formatBaht(settings.bikeParkingRateSatang)}</strong> บ.</span>
              </span>
            </div>
          </div>
        </div>

        {/* Right Controls: Date Simulator & Firebase Auth */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Date Simulator */}
          <div className="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs">
            <Calendar className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-slate-400 hidden sm:inline">จำลองวันที่:</span>
            <select
              value={simulatedDate}
              onChange={(e) => onSimulatedDateChange(e.target.value)}
              className="bg-slate-900 text-amber-300 font-medium rounded px-2 py-0.5 border border-slate-700 focus:outline-none cursor-pointer text-xs"
            >
              <option value="2026-10-25">25 ต.ค. (วันตัดรอบจดมิเตอร์)</option>
              <option value="2026-11-03">3 พ.ย. (ก่อนครบกำหนดชำระ)</option>
              <option value="2026-11-08">8 พ.ย. (เลยกำหนด + ค่าปรับ)</option>
            </select>
          </div>

          {/* Google Auth Button & Sole Admin Display */}
          {currentUser ? (
            <div className={`flex items-center gap-1.5 border rounded-lg px-2.5 py-1 text-xs ${
              isUserAdmin(currentUser)
                ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300 ring-1 ring-emerald-500/30'
                : 'bg-slate-800 border-slate-700 text-slate-300'
            }`}>
              {isUserAdmin(currentUser) ? (
                <span className="font-bold text-amber-300 flex items-center gap-1" title="ผู้ดูแลระบบสูงสุด (Admin)">
                  <Crown className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden sm:inline">Admin:</span>
                  <span className="mono-num">{currentUser.email}</span>
                </span>
              ) : (
                <span className="text-rose-300 flex items-center gap-1" title="ไม่มีสิทธิ์ Admin (สิทธิ์ดูเท่านั้น)">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span className="truncate max-w-[120px]">{currentUser.email}</span>
                  <span className="text-[10px] text-slate-400">(อ่านอย่างเดียว)</span>
                </span>
              )}
              <button
                type="button"
                onClick={onLogout}
                className="text-slate-400 hover:text-rose-400 transition ml-1"
                title="ออกจากระบบ"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onLogin}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-sm transition"
              title={`เข้าสู่ระบบด้วย Google (${ADMIN_EMAIL})`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>เข้าสู่ระบบ Admin ({ADMIN_EMAIL})</span>
            </button>
          )}
        </div>
      </div>

      {/* Module Navigation Tabs */}
      <div className="max-w-7xl mx-auto px-4 flex overflow-x-auto border-t border-slate-800/80 gap-1 pt-1 scrollbar-none">
        <button
          type="button"
          onClick={() => onTabChange('dashboard')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'dashboard'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <LayoutDashboard className="w-4 h-4" />
          <span>📊 1. แดชบอร์ดภาพรวม (Dashboard)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('rooms')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'rooms'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>🏢 2. ผังห้อง 15 ห้อง (Live Board)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('billing')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'billing'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>⚡ 3. จดมิเตอร์วันที่ 25 (15 ห้อง)</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('invoices')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'invoices'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>📲 4. ส่งบิล LINE (QR) & พิมพ์สลิป A4</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('payments')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'payments'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>💰 5. รับชำระเงิน & ค้างชำระ</span>
          {unpaidCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 mono-num">
              {unpaidCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => onTabChange('settings')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'settings'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>⚙️ 6. รายจ่าย P&L & ตั้งค่าหอพัก</span>
        </button>

        <button
          type="button"
          onClick={() => onTabChange('archive')}
          className={`px-3.5 py-2.5 text-xs sm:text-sm font-semibold border-b-2 whitespace-nowrap transition-colors flex items-center gap-1.5 ${
            activeTab === 'archive'
              ? 'border-emerald-400 text-emerald-400'
              : 'border-transparent text-slate-300 hover:text-white'
          }`}
        >
          <span>📜 7. ประวัติผู้เช่า (Archive)</span>
        </button>

        {/* Quick Modal Triggers on the right side of tab bar */}
        <div className="ml-auto flex items-center gap-1.5 py-1 whitespace-nowrap">
          {onSyncGoogleForms && settings.googleAppsScriptUrl && (
            <button
              type="button"
              onClick={onSyncGoogleForms}
              disabled={isSyncingForms}
              className="px-2.5 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1 transition"
              title="ดึงข้อมูลสลิปและผู้เช่าลงทะเบียนใหม่จาก Google Form ทันที"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncingForms ? 'animate-spin' : ''}`} />
              <span>ซิงก์ฟอร์ม</span>
            </button>
          )}

          {onOpenReconcileModal && (
            <button
              type="button"
              onClick={onOpenReconcileModal}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                pendingSubmissionsCount > 0
                  ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="ตรวจสอบสลิป Google Form"
            >
              <span>💳 ตรวจสลิป</span>
              {pendingSubmissionsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-amber-500 text-slate-950 font-bold text-[10px]">
                  {pendingSubmissionsCount}
                </span>
              )}
            </button>
          )}

          {onOpenRegistrationModal && (
            <button
              type="button"
              onClick={onOpenRegistrationModal}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                pendingRegistrationsCount > 0
                  ? 'bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 animate-pulse'
                  : 'bg-slate-800/80 hover:bg-slate-800 text-slate-300 border border-slate-700'
              }`}
              title="อนุมัติการลงทะเบียนผู้เช่าใหม่"
            >
              <span>🔔 ลงทะเบียนใหม่</span>
              {pendingRegistrationsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-sky-500 text-slate-950 font-bold text-[10px]">
                  {pendingRegistrationsCount}
                </span>
              )}
            </button>
          )}

          {onOpenBackupRecallModal && (
            <button
              type="button"
              onClick={onOpenBackupRecallModal}
              className="px-2.5 py-1 rounded-lg bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-semibold flex items-center gap-1 transition"
              title="สำรองข้อมูลรายสัปดาห์ / กู้คืนข้อมูล (Recall)"
            >
              <span>💾 สำรอง/Recall</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
