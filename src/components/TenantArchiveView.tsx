import React, { useState } from 'react';
import { MoveOutArchive } from '../types';
import { formatBaht } from '../lib/finance';
import { Search, Archive, UserCheck, Calendar, Zap, Droplets, ShieldCheck, FileText, Phone, MessageSquare } from 'lucide-react';

interface TenantArchiveViewProps {
  archives: MoveOutArchive[];
}

export const TenantArchiveView: React.FC<TenantArchiveViewProps> = ({ archives }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedArchive, setSelectedArchive] = useState<MoveOutArchive | null>(null);

  const filtered = archives.filter(a =>
    a.roomNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    a.tenantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (a.phone && a.phone.includes(searchTerm)) ||
    (a.lineId && a.lineId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="space-y-5">
      {/* Top Header Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold">
              <Archive className="w-4 h-4 text-emerald-400" />
            </div>
            <h2 className="text-lg font-bold text-white">คลังประวัติผู้เช่าย้ายออก (Move-Out Audit Ledger)</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-700 mono-num">
              ทั้งหมด {archives.length} รายการ
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            บันทึกประวัติผู้เช่าถาวร วันที่เข้า-ออก มิเตอร์สุดท้าย รายการหักค่าทำความสะอาด/ค่าเสียหาย/หนี้ค้าง และเงินประกันที่คืน เพื่อความโปร่งใสและตรวจสอบย้อนหลังได้ตลอดเวลา
          </p>
        </div>

        {/* Search Input */}
        <div className="w-full sm:w-72 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="ค้นหาตามเลขห้อง, ชื่อ, เบอร์โทร..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* Archives Table / List */}
      {filtered.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <Archive className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-sm font-semibold text-slate-300">
            {archives.length === 0 ? 'ยังไม่มีประวัติผู้เช่าย้ายออก' : 'ไม่พบข้อมูลที่ตรงกับคำค้นหา'}
          </h3>
          <p className="text-xs text-slate-500 mt-1">
            เมื่อมีผู้เช่าย้ายออกและทำเรื่องคืนเงินประกัน ข้อมูลทั้งหมดจะถูกบันทึกเก็บไว้ที่นี่ถาวร
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-2xl p-4 shadow-sm flex flex-col justify-between space-y-3 transition group"
            >
              <div>
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 font-bold text-xs flex items-center justify-center mono-num">
                      {item.roomNumber}
                    </span>
                    <div>
                      <h4 className="font-bold text-sm text-white">{item.tenantName}</h4>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2 mt-0.5">
                        {item.phone && (
                          <span className="flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5 text-slate-400" /> {item.phone}
                          </span>
                        )}
                        {item.lineId && (
                          <span className="flex items-center gap-0.5">
                            <MessageSquare className="w-2.5 h-2.5 text-sky-400" /> {item.lineId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    ย้ายออกแล้ว
                  </span>
                </div>

                {/* Dates & Meter breakdown */}
                <div className="mt-3 bg-slate-950/60 rounded-xl p-3 border border-slate-800/80 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" /> ระยะเวลาพัก:
                    </span>
                    <span className="text-slate-200">{item.moveInDate} ถึง {item.moveOutDate}</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1.5 border-t border-slate-800/80">
                    <div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Droplets className="w-3 h-3 text-sky-400" /> มิเตอร์น้ำสุดท้าย:
                      </span>
                      <strong className="text-sky-300 mono-num font-semibold">{item.finalWaterReading}</strong>
                      <span className="text-[10px] text-slate-400 ml-1">({formatBaht(item.finalWaterSatang)} บ.)</span>
                    </div>
                    <div>
                      <span className="text-[11px] text-slate-400 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" /> มิเตอร์ไฟสุดท้าย:
                      </span>
                      <strong className="text-amber-300 mono-num font-semibold">{item.finalElecReading}</strong>
                      <span className="text-[10px] text-slate-400 ml-1">({formatBaht(item.finalElecSatang)} บ.)</span>
                    </div>
                  </div>

                  {/* Deductions & Refund */}
                  <div className="pt-2 border-t border-slate-800/80 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-400">เงินประกันที่วางไว้:</span>
                      <span className="mono-num text-slate-200">{formatBaht(item.depositSatang)} บ.</span>
                    </div>
                    {item.cleaningFeeSatang > 0 && (
                      <div className="flex justify-between text-[11px] text-rose-300">
                        <span>• หักค่าทำความสะอาด:</span>
                        <span className="mono-num">-{formatBaht(item.cleaningFeeSatang)} บ.</span>
                      </div>
                    )}
                    {item.damageFeeSatang > 0 && (
                      <div className="flex justify-between text-[11px] text-rose-300">
                        <span>• หักค่าเสียหาย/ซ่อม:</span>
                        <span className="mono-num">-{formatBaht(item.damageFeeSatang)} บ.</span>
                      </div>
                    )}
                    {item.arrearsDeductedSatang > 0 && (
                      <div className="flex justify-between text-[11px] text-rose-300">
                        <span>• หักหนี้ค้างชำระ:</span>
                        <span className="mono-num">-{formatBaht(item.arrearsDeductedSatang)} บ.</span>
                      </div>
                    )}
                    <div className="flex justify-between pt-1 border-t border-slate-800 text-xs font-bold">
                      <span className="text-emerald-400">คืนเงินประกันสุทธิ:</span>
                      <span className="mono-num text-emerald-300 text-sm">
                        {item.netRefundSatang >= 0 ? `${formatBaht(item.netRefundSatang)} บาท` : `ผู้เช่าจ่ายเพิ่ม ${formatBaht(-item.netRefundSatang)} บาท`}
                      </span>
                    </div>
                  </div>
                </div>

                {item.deductionNote && (
                  <p className="text-[11px] text-slate-400 italic px-1 mt-2 line-clamp-2">
                    "{item.deductionNote}"
                  </p>
                )}
              </div>

              <div className="text-[10px] text-slate-500 pt-1 text-right">
                บันทึกเมื่อ: {item.createdAt ? new Date(item.createdAt).toLocaleDateString('th-TH') : '-'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
