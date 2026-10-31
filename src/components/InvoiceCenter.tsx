import React, { useState, useEffect } from 'react';
import { AppState, Invoice } from '../types';
import { calcLateFeeSatang, formatBaht } from '../lib/finance';
import { generatePromptPayPayload, generateQrDataUrl } from '../lib/promptpay';
import { Smartphone, Printer, Copy, Send, CheckCircle2, DollarSign, ExternalLink, Edit3 } from 'lucide-react';

interface InvoiceCenterProps {
  state: AppState;
  selectedInvoiceId?: string;
  onSelectInvoice: (id: string) => void;
  onOpenPayment: (invoiceId: string) => void;
  onOpenEditInvoice: (invoiceId: string) => void;
  onSendLineNotify: (invoiceId: string) => Promise<any>;
}

export const InvoiceCenter: React.FC<InvoiceCenterProps> = ({
  state,
  selectedInvoiceId,
  onSelectInvoice,
  onOpenPayment,
  onOpenEditInvoice,
  onSendLineNotify
}) => {
  const { invoices, settings, simulatedDate } = state;
  const activeInvoices = invoices.filter(i => i.status !== 'ROLLED_OVER');

  const [submode, setSubmode] = useState<'LINE' | 'PRINT'>('LINE');
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<boolean>(false);
  const [sendingLine, setSendingLine] = useState<boolean>(false);
  const [lineResult, setLineResult] = useState<{ success: boolean; apiSent: boolean; apiError?: string } | null>(null);

  const selectedInvoice = activeInvoices.find(i => i.id === selectedInvoiceId) || activeInvoices[0];

  // Generate QR Code whenever selected invoice or its amount changes
  useEffect(() => {
    if (!selectedInvoice) return;
    const lateSatang = calcLateFeeSatang(selectedInvoice, simulatedDate, settings);
    const targetAmountSatang = selectedInvoice.balanceDueSatang > 0
      ? (selectedInvoice.balanceDueSatang + lateSatang)
      : selectedInvoice.totalSatang;

    const payload = generatePromptPayPayload(settings.promptPayId, targetAmountSatang);
    generateQrDataUrl(payload).then(url => {
      setQrCodeUrl(url);
    });
    setLineResult(null);
  }, [selectedInvoice, simulatedDate, settings]);

  const handleCopyLineText = () => {
    if (!selectedInvoice) return;
    const lateSatang = calcLateFeeSatang(selectedInvoice, simulatedDate, settings);
    const netDue = selectedInvoice.balanceDueSatang + lateSatang;

    const text = [
      `🏢 แจ้งค่าเช่า ${settings.apartmentName} — ห้อง ${selectedInvoice.roomNumber}`,
      `ผู้เช่า: ${selectedInvoice.tenantName} (แพ็กเกจ ${selectedInvoice.tier})`,
      `รอบตัดบิล: ${selectedInvoice.issueDate} (กำหนดชำระภายใน 5 พ.ย.)`,
      `--------------------------------`,
      `• ค่าเช่าห้องพัก: ${formatBaht(selectedInvoice.rentSatang)} บาท`,
      selectedInvoice.parkingFeeSatang > 0 ? `• ค่าจอดรถ (${selectedInvoice.parkingType === 'CAR' ? 'รถยนต์' : 'มอเตอร์ไซค์'}): ${formatBaht(selectedInvoice.parkingFeeSatang)} บาท` : null,
      `• ค่าน้ำ (${selectedInvoice.prevWater} → ${selectedInvoice.currWater} = ${selectedInvoice.waterUnits} หน่วย): ${formatBaht(selectedInvoice.waterSatang)} บาท`,
      `• ค่าไฟ (${selectedInvoice.prevElec} → ${selectedInvoice.currElec} = ${selectedInvoice.elecUnits} หน่วย): ${formatBaht(selectedInvoice.elecSatang)} บาท`,
      selectedInvoice.arrearsSatang > 0 ? `• ยอดค้างยกมา: ${formatBaht(selectedInvoice.arrearsSatang)} บาท` : null,
      lateSatang > 0 ? `• ค่าปรับเกินกำหนด: ${formatBaht(lateSatang)} บาท` : null,
      selectedInvoice.paidSatang > 0 ? `• ชำระแล้วบางส่วน: -${formatBaht(selectedInvoice.paidSatang)} บาท` : null,
      `--------------------------------`,
      `✅ ยอดสุทธิที่ต้องโอน: ${formatBaht(netDue)} บาท`,
      `📲 PromptPay: ${settings.promptPayId}`,
      `🏦 บัญชี: ${settings.bankName} ${settings.bankAccount} (${settings.bankOwner})`,
      `โอนแล้วกรุณาส่งรูปสลิปตอบกลับแชทนี้ ขอบคุณครับ`
    ].filter(Boolean).join('\n');

    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    }
  };

  const handleDirectLineSend = async () => {
    if (!selectedInvoice) return;
    setSendingLine(true);
    try {
      const res = await onSendLineNotify(selectedInvoice.id);
      setLineResult(res);
    } catch (err: any) {
      setLineResult({ success: false, apiSent: false, apiError: err.message });
    } finally {
      setSendingLine(false);
    }
  };

  const openLineShareApp = () => {
    if (!selectedInvoice) return;
    const lateSatang = calcLateFeeSatang(selectedInvoice, simulatedDate, settings);
    const netDue = selectedInvoice.balanceDueSatang + lateSatang;
    const text = encodeURIComponent(
      `🏢 แจ้งค่าเช่า ${settings.apartmentName} ห้อง ${selectedInvoice.roomNumber}\nผู้เช่า: ${selectedInvoice.tenantName}\nยอดสุทธิ: ${formatBaht(netDue)} บาท\nสแกนพร้อมเพย์: ${settings.promptPayId}\nบัญชี: ${settings.bankName} ${settings.bankAccount}`
    );
    window.open(`https://line.me/R/msg/text/?${text}`, '_blank');
  };

  return (
    <div className="space-y-4">
      {/* Top Mode Selector Bar */}
      <div className="bg-white rounded-xl p-4 border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3 no-print">
        <div>
          <h2 className="text-base font-bold text-slate-900">
            ศูนย์ส่งใบแจ้งหนี้ทาง LINE (พร้อม QR PromptPay) และพิมพ์สลิปกระดาษ A4
          </h2>
          <p className="text-xs text-slate-500">
            เลือกส่งการ์ดสรุปยอดพร้อม QR PromptPay ให้ผู้เช่าทาง LINE หรือสั่งพิมพ์สลิปกระดาษสอดใต้ประตูพร้อมกันทั้ง 15 ห้อง
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubmode('LINE')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              submode === 'LINE'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Smartphone className="w-4 h-4" />
            <span>โหมดส่งการ์ด LINE + QR PromptPay</span>
          </button>
          <button
            type="button"
            onClick={() => setSubmode('PRINT')}
            className={`px-3.5 py-2 rounded-lg text-xs font-semibold transition flex items-center gap-1.5 ${
              submode === 'PRINT'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>โหมดพิมพ์สลิปกระดาษ A4 (สอดใต้ประตู)</span>
          </button>
        </div>
      </div>

      {/* Submode 1: LINE Card View */}
      {submode === 'LINE' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 no-print">
          {/* Room Selector List */}
          <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">เลือกห้องเพื่อดูการ์ดใบแจ้งหนี้</span>
              <span className="text-xs text-slate-500 font-medium">{activeInvoices.length} บิล</span>
            </div>
            <div className="divide-y divide-slate-100 max-h-[580px] overflow-y-auto">
              {activeInvoices.map(inv => {
                const lateSatang = calcLateFeeSatang(inv, simulatedDate, settings);
                const netDue = inv.balanceDueSatang + lateSatang;
                const isSelected = selectedInvoice && selectedInvoice.id === inv.id;

                return (
                  <button
                    key={inv.id}
                    type="button"
                    onClick={() => onSelectInvoice(inv.id)}
                    className={`w-full text-left px-4 py-3 flex items-center justify-between transition ${
                      isSelected
                        ? 'bg-emerald-50 border-l-4 border-emerald-600'
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-xs text-slate-900">
                        ห้อง {inv.roomNumber} — {inv.tenantName}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        แพ็กเกจ {inv.tier} • ออกบิล {inv.issueDate}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold text-xs mono-num ${netDue > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
                        ฿{formatBaht(netDue > 0 ? netDue : inv.totalSatang)}
                      </div>
                      <div className={`text-[10px] ${netDue === 0 ? 'text-emerald-600 font-semibold' : 'text-slate-500'}`}>
                        {netDue === 0 ? 'ชำระครบแล้ว' : inv.paidSatang > 0 ? 'แบ่งจ่ายบางส่วน' : 'รอชำระ'}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Mobile Bill Preview Card */}
          <div className="lg:col-span-7 flex flex-col items-center">
            {selectedInvoice ? (
              <div className="w-full max-w-md bg-white rounded-2xl border-2 border-slate-200 shadow-xl overflow-hidden">
                {/* LINE Style Header */}
                <div className="bg-[#00B900] text-white px-4 py-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm">LINE Flex Preview</span>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-medium">Official Account</span>
                  </div>
                  {selectedInvoice.lineSentAt && (
                    <span className="text-[10px] text-emerald-100 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>ส่งแล้ว ({selectedInvoice.lineSentAt})</span>
                    </span>
                  )}
                </div>

                <div className="p-5 space-y-3.5 text-xs bg-slate-50/40">
                  {/* Bill Card Header */}
                  <div className="flex items-start justify-between border-b border-slate-200 pb-2.5">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{settings.apartmentName}</div>
                      <div className="text-[11px] text-slate-500">
                        เลขที่บิล: <span className="mono-num">{selectedInvoice.id}</span>
                      </div>
                      <div className="text-[11px] text-rose-600 font-semibold mt-0.5">
                        กำหนดชำระภายใน: วันที่ {settings.dueDayNextMonth} พ.ย. 2026
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-extrabold text-sm mono-num">
                        ห้อง {selectedInvoice.roomNumber}
                      </span>
                      <div className="text-[11px] text-slate-700 mt-1 font-semibold">{selectedInvoice.tenantName}</div>
                    </div>
                  </div>

                  {/* Line Items Table */}
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-500 text-[11px]">
                        <th className="py-1 text-left font-semibold">รายการ</th>
                        <th className="py-1 text-right font-semibold">รายละเอียด</th>
                        <th className="py-1 text-right font-semibold">จำนวนเงิน (บาท)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1.5 font-medium">1. ค่าเช่าห้องพัก ({selectedInvoice.tier})</td>
                        <td className="py-1.5 text-right text-slate-500">1 เดือน</td>
                        <td className="py-1.5 text-right font-semibold mono-num">
                          {formatBaht(selectedInvoice.rentSatang)}
                        </td>
                      </tr>
                      {selectedInvoice.parkingFeeSatang > 0 && (
                        <tr>
                          <td className="py-1.5 font-medium">
                            2. ค่าจอดรถ ({selectedInvoice.parkingType === 'CAR' ? 'รถยนต์' : 'มอเตอร์ไซค์'})
                          </td>
                          <td className="py-1.5 text-right text-slate-500">1 คัน</td>
                          <td className="py-1.5 text-right font-semibold mono-num text-indigo-700">
                            {formatBaht(selectedInvoice.parkingFeeSatang)}
                          </td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1.5 font-medium">3. ค่าน้ำประปา</td>
                        <td className="py-1.5 text-right text-slate-500 mono-num">
                          {selectedInvoice.prevWater} → {selectedInvoice.currWater} ({selectedInvoice.waterUnits} หน่วย)
                        </td>
                        <td className="py-1.5 text-right font-semibold mono-num">
                          {formatBaht(selectedInvoice.waterSatang)}
                        </td>
                      </tr>
                      <tr>
                        <td className="py-1.5 font-medium">4. ค่าไฟฟ้า</td>
                        <td className="py-1.5 text-right text-slate-500 mono-num">
                          {selectedInvoice.prevElec} → {selectedInvoice.currElec} ({selectedInvoice.elecUnits} หน่วย)
                        </td>
                        <td className="py-1.5 text-right font-semibold mono-num">
                          {formatBaht(selectedInvoice.elecSatang)}
                        </td>
                      </tr>
                      {selectedInvoice.arrearsSatang > 0 && (
                        <tr className="text-rose-700 bg-rose-50/60 font-semibold">
                          <td className="py-1.5">5. ยอดค้างชำระยกมาจากเดือนก่อน</td>
                          <td className="py-1.5 text-right">ทบยอดค้าง</td>
                          <td className="py-1.5 text-right font-bold mono-num">
                            {formatBaht(selectedInvoice.arrearsSatang)}
                          </td>
                        </tr>
                      )}
                      {calcLateFeeSatang(selectedInvoice, simulatedDate, settings) > 0 && (
                        <tr className="text-rose-700 bg-rose-50/60 font-semibold">
                          <td className="py-1.5">6. ค่าปรับเกินกำหนดวันที่ 5</td>
                          <td className="py-1.5 text-right">วันละ ฿{formatBaht(settings.dailyLateFeeSatang)}</td>
                          <td className="py-1.5 text-right font-bold mono-num">
                            {formatBaht(calcLateFeeSatang(selectedInvoice, simulatedDate, settings))}
                          </td>
                        </tr>
                      )}
                      {selectedInvoice.discountSatang !== undefined && selectedInvoice.discountSatang > 0 && (
                        <tr className="text-emerald-700 font-semibold bg-emerald-50/60">
                          <td className="py-1.5">
                            หัก: ส่วนลดพิเศษ {selectedInvoice.adjustmentNote ? `(${selectedInvoice.adjustmentNote})` : ''}
                          </td>
                          <td className="py-1.5 text-right">ปรับลดให้</td>
                          <td className="py-1.5 text-right font-bold mono-num">
                            -{formatBaht(selectedInvoice.discountSatang)}
                          </td>
                        </tr>
                      )}
                      {selectedInvoice.paidSatang > 0 && (
                        <tr className="text-emerald-700 font-semibold bg-emerald-50/60">
                          <td className="py-1.5">หัก: ชำระแล้วบางส่วน</td>
                          <td className="py-1.5 text-right">รับเงินแล้ว ({selectedInvoice.payments.length} งวด)</td>
                          <td className="py-1.5 text-right font-bold mono-num">
                            -{formatBaht(selectedInvoice.paidSatang)}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  {/* Net Total Box */}
                  {(() => {
                    const lateSatang = calcLateFeeSatang(selectedInvoice, simulatedDate, settings);
                    const netDue = selectedInvoice.balanceDueSatang + lateSatang;
                    return (
                      <div className="bg-slate-900 text-white rounded-xl p-3 flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-300">ยอดสุทธิที่ต้องชำระ (Net Due)</div>
                          <div className="text-[10px] text-emerald-300">ไม่มีค่าส่วนกลาง • คิดตามหน่วยจริง</div>
                        </div>
                        <div className="text-lg font-extrabold mono-num text-emerald-400">
                          ฿{formatBaht(netDue > 0 ? netDue : selectedInvoice.totalSatang)}
                        </div>
                      </div>
                    );
                  })()}

                  {/* Payment Details with Authentic EMVCo PromptPay QR */}
                  <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3 flex items-center gap-3.5">
                    {qrCodeUrl ? (
                      <img
                        src={qrCodeUrl}
                        alt="PromptPay QR Code"
                        className="w-28 h-28 border border-slate-300 rounded-lg bg-white p-1 shrink-0"
                      />
                    ) : (
                      <div className="w-28 h-28 border border-slate-300 rounded-lg bg-white flex items-center justify-center text-[10px] text-slate-400">
                        สร้าง QR...
                      </div>
                    )}
                    <div className="space-y-1 text-[11px] text-slate-700 flex-1">
                      <div className="inline-flex items-center gap-1 bg-[#00a950] text-white px-2 py-0.5 rounded font-bold text-[10px]">
                        <span>🏦 {settings.bankName}</span>
                      </div>
                      <div>
                        เลขบัญชี: <strong className="mono-num text-sm font-black text-[#008f43]">{settings.bankAccount}</strong>
                      </div>
                      <div>ชื่อบัญชี: <strong className="text-slate-900 font-bold">{settings.bankOwner}</strong></div>
                      <div>พร้อมเพย์: <strong className="mono-num text-slate-800">{settings.promptPayId}</strong></div>
                      <div className="text-[10px] text-slate-500">โอนแล้วกรุณาส่งรูปสลิปตอบกลับแชท LINE</div>
                    </div>
                  </div>
                </div>

                {/* API feedback banner */}
                {lineResult && (
                  <div className={`px-4 py-2 text-xs border-t ${lineResult.apiSent ? 'bg-emerald-100 text-emerald-800 border-emerald-200' : 'bg-rose-50 text-rose-800 border-rose-200'}`}>
                    {lineResult.apiSent ? (
                      <span>✔ ส่งแจ้งเตือนผ่าน LINE Messaging API สำเร็จแล้ว</span>
                    ) : (
                      <span>❌ ส่ง LINE ไม่สำเร็จ: {lineResult.apiError || 'ยังไม่ได้ตั้งค่า API Key หรือ LINE ID'}</span>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-white rounded-xl p-8 text-center text-sm text-slate-400 border border-slate-200">
                กรุณาเลือกบิลเพื่อดูตัวอย่าง
              </div>
            )}

            {/* Action Buttons Below Card */}
            {selectedInvoice && (
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2 w-full max-w-md">
                <button
                  type="button"
                  onClick={handleCopyLineText}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{copySuccess ? 'คัดลอกแล้ว!' : 'คัดลอกข้อความบิล'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleDirectLineSend}
                  disabled={sendingLine}
                  className="py-2.5 px-3 rounded-xl bg-[#00B900] text-white text-xs font-bold hover:bg-[#009e00] shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{sendingLine ? 'กำลังส่ง...' : 'ส่ง LINE OA'}</span>
                </button>

                <button
                  type="button"
                  onClick={openLineShareApp}
                  className="py-2.5 px-3 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition flex items-center justify-center gap-1.5"
                  title="เปิดแอป LINE บนมือถือเพื่อส่ง"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>เปิดแอป LINE</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenEditInvoice(selectedInvoice.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>✏️ แก้ไขยอดเงินในบิลนี้ (ปรับลด/เพิ่ม/ให้ส่วนลด)</span>
                </button>

                <button
                  type="button"
                  onClick={() => onOpenPayment(selectedInvoice.id)}
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition flex items-center justify-center gap-1.5"
                >
                  <DollarSign className="w-3.5 h-3.5" />
                  <span>บันทึกรับเงินบิลนี้</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Submode 2: A4 2-up Paper Slip Print View */}
      {submode === 'PRINT' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 no-print">
            <div className="text-xs text-amber-900">
              <strong>โหมดพิมพ์สลิปกระดาษสอดใต้ประตู:</strong> จัดหน้ากระดาษ A4 แบบ 2 คอลัมน์ พร้อมเส้นประสำหรับตัดแบ่งครึ่ง (มีรายละเอียดมิเตอร์และ QR PromptPay บนกระดาษ)
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 rounded-lg bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 shadow-sm transition flex items-center gap-1.5"
            >
              <Printer className="w-4 h-4" />
              <span>สั่งพิมพ์หน้ากระดาษ A4 (Print)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeInvoices.map(inv => {
              const lateSatang = calcLateFeeSatang(inv, simulatedDate, settings);
              const netDue = inv.balanceDueSatang + lateSatang;

              return (
                <div key={inv.id} className="print-slip-card bg-white rounded-xl p-4 border border-slate-300 space-y-2.5 text-xs">
                  <div className="flex items-start justify-between border-b border-slate-200 pb-2">
                    <div>
                      <div className="text-sm font-extrabold text-slate-900">{settings.apartmentName}</div>
                      <div className="text-[11px] text-slate-500">ใบแจ้งหนี้ / ใบเสร็จรับเงิน</div>
                      <div className="text-[10px] text-slate-400">รอบบิล {inv.billingPeriod} • กำหนดจ่าย 5 พ.ย.</div>
                    </div>
                    <div className="text-right">
                      <span className="px-2 py-0.5 rounded bg-slate-900 text-white font-extrabold text-xs mono-num">
                        ห้อง {inv.roomNumber}
                      </span>
                      <div className="text-[11px] text-slate-700 font-semibold mt-0.5">{inv.tenantName}</div>
                    </div>
                  </div>

                  <table className="w-full text-[11px]">
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-1">ค่าเช่าห้อง ({inv.tier})</td>
                        <td className="py-1 text-right mono-num">{formatBaht(inv.rentSatang)}</td>
                      </tr>
                      {inv.parkingFeeSatang > 0 && (
                        <tr>
                          <td className="py-1">ค่าจอดรถ ({inv.parkingType === 'CAR' ? 'รถยนต์' : 'มอเตอร์ไซค์'})</td>
                          <td className="py-1 text-right mono-num">{formatBaht(inv.parkingFeeSatang)}</td>
                        </tr>
                      )}
                      <tr>
                        <td className="py-1">
                          ค่าน้ำ ({inv.prevWater}→{inv.currWater} = {inv.waterUnits} หน่วย)
                        </td>
                        <td className="py-1 text-right mono-num">{formatBaht(inv.waterSatang)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">
                          ค่าไฟ ({inv.prevElec}→{inv.currElec} = {inv.elecUnits} หน่วย)
                        </td>
                        <td className="py-1 text-right mono-num">{formatBaht(inv.elecSatang)}</td>
                      </tr>
                      {inv.arrearsSatang > 0 && (
                        <tr className="text-rose-700">
                          <td className="py-1 font-semibold">ยอดค้างยกมาจากเดือนก่อน</td>
                          <td className="py-1 text-right font-bold mono-num">{formatBaht(inv.arrearsSatang)}</td>
                        </tr>
                      )}
                      {lateSatang > 0 && (
                        <tr className="text-rose-700">
                          <td className="py-1 font-semibold">ค่าปรับเกินกำหนด</td>
                          <td className="py-1 text-right font-bold mono-num">{formatBaht(lateSatang)}</td>
                        </tr>
                      )}
                    </tbody>
                  </table>

                  <div className="border-t border-slate-200 pt-1.5 flex justify-between items-baseline font-bold">
                    <span>ยอดสุทธิที่ต้องชำระ:</span>
                    <span className="text-sm font-black mono-num text-emerald-700">
                      ฿{formatBaht(netDue > 0 ? netDue : inv.totalSatang)}
                    </span>
                  </div>

                  <div className="bg-slate-50 p-2 rounded-lg text-[10px] text-slate-600 space-y-0.5">
                    <div>🏦 {settings.bankName} เลขบัญชี: <strong className="mono-num text-slate-900">{settings.bankAccount}</strong> ({settings.bankOwner})</div>
                    <div>📲 พร้อมเพย์: <strong className="mono-num text-slate-900">{settings.promptPayId}</strong> • ติดต่อ: {settings.contactInfo}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
