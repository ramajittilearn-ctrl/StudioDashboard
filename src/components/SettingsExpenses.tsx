import React, { useState } from 'react';
import { AppState, PropertySettings } from '../types';
import { formatBaht, fromSatang, toSatang } from '../lib/finance';
import { Settings, Plus, Trash2, Download, Upload, RotateCcw, MessageSquare } from 'lucide-react';
import { downloadStateJson, testLineConnection } from '../api/client';

interface SettingsExpensesProps {
  state: AppState;
  onUpdateSettings: (settings: Partial<PropertySettings>) => void;
  onAddExpense: (expense: { title: string; category: string; amountSatang: number }) => void;
  onDeleteExpense: (id: string) => void;
  onResetDatabase: () => void;
  onRestoreBackup: (backupState: AppState) => void;
}

export const SettingsExpenses: React.FC<SettingsExpensesProps> = ({
  state,
  onUpdateSettings,
  onAddExpense,
  onDeleteExpense,
  onResetDatabase,
  onRestoreBackup
}) => {
  const { settings, expenses, invoices } = state;

  // Local Settings Form
  const [elecRate, setElecRate] = useState<number>(fromSatang(settings.electricityRateSatang));
  const [waterRate, setWaterRate] = useState<number>(fromSatang(settings.waterRateSatang));
  const [carParkRate, setCarParkRate] = useState<number>(fromSatang(settings.carParkingRateSatang));
  const [bikeParkRate, setBikeParkRate] = useState<number>(fromSatang(settings.bikeParkingRateSatang));
  const [tierStd, setTierStd] = useState<number>(fromSatang(settings.tierStandardSatang));
  const [tierSilver, setTierSilver] = useState<number>(fromSatang(settings.tierSilverSatang));
  const [tierGold, setTierGold] = useState<number>(fromSatang(settings.tierGoldSatang));
  const [billingDay, setBillingDay] = useState<number>(settings.billingDay);
  const [dueDay, setDueDay] = useState<number>(settings.dueDayNextMonth);
  const [lateFee, setLateFee] = useState<number>(fromSatang(settings.dailyLateFeeSatang));
  const [promptPayId, setPromptPayId] = useState<string>(settings.promptPayId);
  const [bankName, setBankName] = useState<string>(settings.bankName);
  const [bankAccount, setBankAccount] = useState<string>(settings.bankAccount);
  const [bankOwner, setBankOwner] = useState<string>(settings.bankOwner);
  const [lineToken, setLineToken] = useState<string>(settings.lineChannelAccessToken || '');
  const [lineDestId, setLineDestId] = useState<string>(settings.lineDestinationId || '');
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // New Expense Form
  const [expTitle, setExpTitle] = useState<string>('');
  const [expCategory, setExpCategory] = useState<any>('ซ่อมบำรุง');
  const [expAmount, setExpAmount] = useState<string>('');

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      electricityRateSatang: toSatang(elecRate),
      waterRateSatang: toSatang(waterRate),
      carParkingRateSatang: toSatang(carParkRate),
      bikeParkingRateSatang: toSatang(bikeParkRate),
      tierStandardSatang: toSatang(tierStd),
      tierSilverSatang: toSatang(tierSilver),
      tierGoldSatang: toSatang(tierGold),
      billingDay,
      dueDayNextMonth: dueDay,
      dailyLateFeeSatang: toSatang(lateFee),
      promptPayId,
      bankName,
      bankAccount,
      bankOwner,
      lineChannelAccessToken: lineToken.trim(),
      lineDestinationId: lineDestId.trim()
    });
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleCreateExpense = (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseFloat(expAmount);
    if (!expTitle || isNaN(amount) || amount <= 0) return;

    onAddExpense({
      title: expTitle.trim(),
      category: expCategory,
      amountSatang: toSatang(amount)
    });

    setExpTitle('');
    setExpAmount('');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (parsed && Array.isArray(parsed.rooms) && parsed.rooms.length === 15) {
          onRestoreBackup(parsed);
          alert('กู้คืนฐานข้อมูลจากไฟล์สำรองเรียบร้อยแล้ว!');
        } else {
          alert('ไฟล์สำรองไม่ถูกต้อง ต้องมีข้อมูล 15 ห้อง');
        }
      } catch (err) {
        alert('อ่านไฟล์สำรองไม่สำเร็จ กรุณาตรวจสอบว่าเป็นไฟล์ JSON ที่ถูกต้อง');
      }
    };
    reader.readAsText(file);
  };

  const totalCollectedSatang = invoices.reduce((acc, i) => acc + (i.paidSatang || 0), 0);
  const totalExpenseSatang = expenses.reduce((acc, e) => acc + e.amountSatang, 0);
  const netOperatingIncome = totalCollectedSatang - totalExpenseSatang;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
      {/* Left: Property Settings & LINE Integration */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-emerald-600" />
              <span>ตั้งค่าเรทราคา กฎหอพัก และการเชื่อมต่อ LINE OA</span>
            </h2>
            <p className="text-xs text-slate-500">
              กำหนดเรทน้ำ-ไฟ ค่าจอดรถ ค่าปรับรายวันหลังวันที่ {dueDay} และบัญชีรับเงิน
            </p>
          </div>
          {saveSuccess && (
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-1 rounded">
              ✔ บันทึกแล้ว
            </span>
          )}
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-3.5 text-xs">
          {/* Utilities Rates */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">อัตราค่าไฟ (บาท/หน่วย)</label>
              <input
                type="number"
                step="0.01"
                value={elecRate}
                onChange={(e) => setElecRate(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">อัตราค่าน้ำ (บาท/หน่วย - ไม่มีขั้นต่ำ)</label>
              <input
                type="number"
                step="0.01"
                value={waterRate}
                onChange={(e) => setWaterRate(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* Parking Rates */}
          <div className="grid grid-cols-2 gap-3 bg-indigo-50/50 p-2.5 rounded-lg border border-indigo-100">
            <div>
              <label className="block font-semibold text-indigo-950 mb-1">🚗 ค่าจอดรถยนต์ (บาท/เดือน)</label>
              <input
                type="number"
                step="50"
                value={carParkRate}
                onChange={(e) => setCarParkRate(parseFloat(e.target.value) || 0)}
                className="w-full border border-indigo-300 bg-white rounded-lg px-3 py-1.5 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-indigo-950 mb-1">🛵 ค่าจอดมอเตอร์ไซค์ (บาท/เดือน)</label>
              <input
                type="number"
                step="10"
                value={bikeParkRate}
                onChange={(e) => setBikeParkRate(parseFloat(e.target.value) || 0)}
                className="w-full border border-indigo-300 bg-white rounded-lg px-3 py-1.5 mono-num"
                required
              />
            </div>
          </div>

          {/* Package Tiers */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Standard (บาท)</label>
              <input
                type="number"
                step="100"
                value={tierStd}
                onChange={(e) => setTierStd(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Silver (บาท)</label>
              <input
                type="number"
                step="100"
                value={tierSilver}
                onChange={(e) => setTierSilver(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Gold (บาท)</label>
              <input
                type="number"
                step="100"
                value={tierGold}
                onChange={(e) => setTierGold(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* Billing Day & Due Day */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">วันตัดรอบบิล</label>
              <input
                type="number"
                min="1"
                max="28"
                value={billingDay}
                onChange={(e) => setBillingDay(parseInt(e.target.value, 10) || 25)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">วันครบกำหนดชำระ</label>
              <input
                type="number"
                min="1"
                max="28"
                value={dueDay}
                onChange={(e) => setDueDay(parseInt(e.target.value, 10) || 5)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ค่าปรับล่าช้า (บาท/วัน)</label>
              <input
                type="number"
                step="10"
                value={lateFee}
                onChange={(e) => setLateFee(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
          </div>

          {/* PromptPay & Bank Details */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เบอร์ PromptPay (สำหรับเจน QR)</label>
              <input
                type="text"
                value={promptPayId}
                onChange={(e) => setPromptPayId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ธนาคาร & ชื่อบัญชี</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                placeholder="เช่น ธนาคารกสิกรไทย"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">เลขที่บัญชีธนาคาร</label>
              <input
                type="text"
                value={bankAccount}
                onChange={(e) => setBankAccount(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2 mono-num"
                required
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">ชื่อเจ้าของบัญชี</label>
              <input
                type="text"
                value={bankOwner}
                onChange={(e) => setBankOwner(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2"
                required
              />
            </div>
          </div>

          {/* LINE OA API Configuration */}
          <div className="bg-emerald-50/60 p-3 rounded-lg border border-emerald-200 space-y-2">
            <div className="font-semibold text-emerald-950 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                <span>การเชื่อมต่อ LINE Official Account (LINE Messaging API)</span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  if (!lineToken.trim()) {
                    alert('กรุณากรอก LINE Channel Access Token ก่อนทดสอบ');
                    return;
                  }
                  try {
                    const data = await testLineConnection(lineToken.trim());
                    if (data.success) {
                      alert(`✅ เชื่อมต่อ LINE OA สำเร็จ!\nชื่อบอท: ${data.botInfo?.displayName || 'LINE Bot'}\nBasic ID: ${data.botInfo?.basicId || '-'}`);
                    } else {
                      alert('❌ เชื่อมต่อไม่สำเร็จ: ' + (data.error || 'Token ไม่ถูกต้อง'));
                    }
                  } catch (err: any) {
                    alert('เกิดข้อผิดพลาดในการเชื่อมต่อ: ' + err.message);
                  }
                }}
                className="px-2.5 py-1 rounded bg-[#00B900] hover:bg-[#009e00] text-white text-[11px] font-bold shadow-xs transition"
              >
                🔌 ทดสอบเชื่อมต่อ API
              </button>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                LINE Channel Access Token (ใส่ API Key เพื่อส่งบิลตรงเข้า LINE ของผู้เช่า)
              </label>
              <input
                type="password"
                value={lineToken}
                onChange={(e) => setLineToken(e.target.value)}
                placeholder="ใส่ Channel Access Token (Long-lived) จาก LINE Developers Console"
                className="w-full border border-emerald-300 bg-white rounded px-2.5 py-1.5 mono-num text-[11px]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-medium text-slate-700 mb-1">
                Target User ID / Group ID (ปลายทางทดสอบส่งบิล เช่น U1234...)
              </label>
              <input
                type="text"
                value={lineDestId}
                onChange={(e) => setLineDestId(e.target.value)}
                placeholder="เช่น U1234567890abcdef..."
                className="w-full border border-emerald-300 bg-white rounded px-2.5 py-1.5 mono-num text-[11px]"
              />
            </div>
            <div className="text-[10px] text-emerald-800 bg-emerald-100/70 p-2 rounded leading-relaxed">
              💡 <strong>วิธีส่งตรงถึงผู้เช่าแต่ละห้อง:</strong> เพียงใส่ LINE User ID ในข้อมูลผู้เช่าของห้องนั้นๆ เมื่อกด "ส่ง LINE OA" ระบบจะยิงบิลตรงเข้าแชทส่วนตัวของผู้เช่าทันที
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
            <button
              type="submit"
              className="px-4 py-2.5 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-700 shadow-sm transition"
            >
              💾 บันทึกการตั้งค่าและคำนวณใหม่
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => downloadStateJson(state)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-white font-medium hover:bg-slate-700 transition flex items-center gap-1"
              >
                <Download className="w-3.5 h-3.5" />
                <span>สำรองข้อมูล (.json)</span>
              </button>

              <label className="px-3 py-2 rounded-lg bg-slate-100 text-slate-700 border border-slate-300 font-medium hover:bg-slate-200 transition cursor-pointer flex items-center gap-1">
                <Upload className="w-3.5 h-3.5" />
                <span>กู้คืน</span>
                <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
              </label>

              <button
                type="button"
                onClick={onResetDatabase}
                className="px-3 py-2 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 font-medium hover:bg-rose-100 transition flex items-center gap-1"
                title="รีเซ็ตข้อมูลตัวอย่างกลับเป็นค่าเริ่มต้น"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>รีเซ็ต</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* Right: Property Expenses & Monthly P&L */}
      <div className="lg:col-span-6 bg-white rounded-xl border border-slate-200 shadow-sm p-5 space-y-4">
        <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              📊 บัญชีรายจ่ายหอพัก & สรุปกำไรสุทธิ (Monthly P&L)
            </h2>
            <p className="text-xs text-slate-500">
              บันทึกค่าซ่อมบำรุง ค่าทำความสะอาด และค่าไฟส่วนกลางของตึกเพื่อหักลบกับค่าเช่าที่เก็บได้จริง
            </p>
          </div>
        </div>

        {/* Add Expense Form */}
        <form onSubmit={handleCreateExpense} className="grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
          <div className="sm:col-span-5">
            <input
              type="text"
              value={expTitle}
              onChange={(e) => setExpTitle(e.target.value)}
              placeholder="รายการจ่าย (เช่น ซ่อมปั๊มน้ำชั้น 1)"
              className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              required
            />
          </div>
          <div className="sm:col-span-3">
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2 py-2 bg-white"
            >
              <option value="ซ่อมบำรุง">🔧 ซ่อมบำรุง</option>
              <option value="ค่าไฟ/น้ำส่วนกลางตึก">⚡ น้ำ/ไฟส่วนกลาง</option>
              <option value="ทำความสะอาด">🧹 ทำความสะอาด</option>
              <option value="อุปกรณ์หอพัก">📦 อุปกรณ์หอพัก</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <input
              type="number"
              step="1"
              min="1"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              placeholder="บาท"
              className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white mono-num"
              required
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              className="w-full h-full py-2 rounded-lg bg-slate-900 text-white font-bold hover:bg-slate-800 transition flex items-center justify-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่ม</span>
            </button>
          </div>
        </form>

        {/* Expenses List */}
        <div className="divide-y divide-slate-100 max-h-64 overflow-y-auto text-xs">
          {expenses.length === 0 ? (
            <div className="py-6 text-center text-slate-400">ยังไม่มีรายการรายจ่ายในงวดนี้</div>
          ) : (
            expenses.map(ex => (
              <div key={ex.id} className="py-2.5 px-2 flex items-center justify-between hover:bg-slate-50 transition">
                <div>
                  <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium mr-1.5 text-[11px]">
                    {ex.category}
                  </span>
                  <span className="font-semibold text-slate-800">{ex.title}</span>
                  <span className="text-slate-400 ml-1.5 mono-num text-[11px]">({ex.date})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-rose-600 mono-num">
                    -฿{formatBaht(ex.amountSatang)}
                  </span>
                  <button
                    type="button"
                    onClick={() => onDeleteExpense(ex.id)}
                    className="text-slate-400 hover:text-rose-600 transition p-1"
                    title="ลบรายการ"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* P&L Statement Box */}
        <div className="bg-slate-900 text-white rounded-xl p-4 space-y-2 text-xs">
          <div className="flex justify-between text-slate-300">
            <span>รายรับจริงที่เก็บเงินได้แล้วในรอบนี้:</span>
            <span className="font-bold text-emerald-400 mono-num text-sm">
              +฿{formatBaht(totalCollectedSatang)}
            </span>
          </div>
          <div className="flex justify-between text-slate-300">
            <span>หัก รายจ่ายดำเนินงานและซ่อมบำรุงหอพัก:</span>
            <span className="font-bold text-rose-400 mono-num text-sm">
              -฿{formatBaht(totalExpenseSatang)}
            </span>
          </div>
          <div className="border-t border-slate-700 pt-2 flex justify-between items-baseline">
            <span className="font-bold text-sm">กำไรสุทธิเข้ากระเป๋า (Net Operating Income):</span>
            <span className={`font-black text-lg mono-num ${netOperatingIncome >= 0 ? 'text-emerald-300' : 'text-rose-400'}`}>
              ฿{formatBaht(netOperatingIncome)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
