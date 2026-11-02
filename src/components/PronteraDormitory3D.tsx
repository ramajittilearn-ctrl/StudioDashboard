import React, { useState, useRef, useEffect, useMemo } from 'react';
import { AppState, Room } from '../types';
import { calcLateFeeSatang, getLatestRoomInvoice } from '../lib/finance';
import { RotateCcw, Sun, Moon, Volume2, VolumeX, Eye, Layers } from 'lucide-react';
import {
  initPronteraDormitoryScene,
  PronteraSceneController,
  Room3DData
} from './pronteraSceneBuilder';

interface PronteraDormitory3DProps {
  state: AppState;
  onOpenRoomDetail: (roomNumber: string) => void;
}

export const PronteraDormitory3D: React.FC<PronteraDormitory3DProps> = ({
  state,
  onOpenRoomDetail
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const controllerRef = useRef<PronteraSceneController | null>(null);

  const [isNight, setIsNight] = useState<boolean>(false);
  const [selectedFloor, setSelectedFloor] = useState<number | null>(null);
  const [hoveredRoom, setHoveredRoom] = useState<Room3DData | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);
  const [npcMessage, setNpcMessage] = useState<string | null>(null);
  const [isSoundOn, setIsSoundOn] = useState<boolean>(false);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundIntervalRef = useRef<any>(null);

  // Convert state.rooms to Room3DData[]
  const rooms3DData: Room3DData[] = useMemo(() => {
    return state.rooms.map(rm => {
      const inv = getLatestRoomInvoice(state.invoices, rm.roomNumber);
      const lateSatang = inv ? calcLateFeeSatang(inv, state.simulatedDate, state.settings) : 0;
      const totalDueSatang = inv ? inv.balanceDueSatang + lateSatang : 0;
      const isOverdue = totalDueSatang > 0 && lateSatang > 0;

      return {
        roomNumber: rm.roomNumber,
        floor: rm.floor,
        status: rm.status,
        tenantName: rm.tenantName,
        phone: rm.phone,
        rent: rm.rentSatang / 100,
        tier: rm.tier,
        waterUnits: inv?.waterUnits,
        elecUnits: inv?.elecUnits,
        unpaidSatang: totalDueSatang,
        isOverdue
      };
    });
  }, [state.rooms, state.invoices, state.simulatedDate, state.settings]);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    const controller = initPronteraDormitoryScene(
      containerRef.current,
      rooms3DData,
      {
        onSelectRoom: (roomNumber) => {
          onOpenRoomDetail(roomNumber);
        },
        onHoverRoom: (room, screenPos) => {
          setHoveredRoom(room);
          if (screenPos) setHoverPos(screenPos);
          else setHoverPos(null);
        },
        onNpcInteract: (name, message) => {
          showNpcSpeech(`${name}: ${message}`);
        }
      }
    );
    controllerRef.current = controller;

    return () => {
      controller.dispose();
      controllerRef.current = null;
    };
  }, []);

  // Update room meshes when room data changes
  useEffect(() => {
    if (controllerRef.current) {
      controllerRef.current.updateRooms(rooms3DData);
    }
  }, [rooms3DData]);

  // Handle Night Mode switch
  const handleToggleNight = () => {
    const next = !isNight;
    setIsNight(next);
    if (controllerRef.current) {
      controllerRef.current.setNightMode(next);
    }
    showNpcSpeech(
      next
        ? 'เปิดโหมดค่ำคืน (Prontera Night) แสงไฟหน้าต่างและโคมไฟส่องสว่างอบอุ่น ✨'
        : 'เปิดโหมดกลางวัน แดดสดใสสไตล์ Prontera Field ☀️'
    );
  };

  // Focus floor
  const handleFocusFloor = (floor: number | null) => {
    setSelectedFloor(floor);
    if (controllerRef.current) {
      controllerRef.current.focusFloor(floor);
    }
  };

  // Reset camera
  const handleResetCamera = () => {
    setSelectedFloor(null);
    if (controllerRef.current) {
      controllerRef.current.resetCamera();
    }
  };

  const showNpcSpeech = (msg: string) => {
    setNpcMessage(msg);
    setTimeout(() => {
      setNpcMessage(prev => (prev === msg ? null : prev));
    }, 4500);
  };

  // Web Audio Synthesizer for RO Prontera theme sound
  const playNote = (freq: number) => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.08, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.5);
    } catch {}
  };

  const toggleSound = () => {
    if (!isSoundOn) {
      setIsSoundOn(true);
      showNpcSpeech('คาฟรา: เปิดเสียงทำนองเพลงบรรยากาศ Prontera Field 🎶');
      const melody = [523.25, 659.25, 783.99, 880.0, 783.99, 659.25];
      let idx = 0;
      playNote(melody[0]);
      soundIntervalRef.current = setInterval(() => {
        idx = (idx + 1) % melody.length;
        playNote(melody[idx]);
      }, 700);
    } else {
      setIsSoundOn(false);
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
    }
  };

  useEffect(() => {
    return () => {
      if (soundIntervalRef.current) clearInterval(soundIntervalRef.current);
      if (audioCtxRef.current) audioCtxRef.current.close().catch(() => {});
    };
  }, []);

  return (
    <div className="relative w-full rounded-3xl overflow-hidden border border-slate-300 shadow-2xl select-none bg-slate-950">
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        className="w-full h-[680px] cursor-grab active:cursor-grabbing"
      />

      {/* Top Floating Control Bar */}
      <div className="absolute top-4 left-4 right-4 z-40 flex flex-wrap items-center justify-between gap-2 pointer-events-auto">
        {/* Title & Badge */}
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-3 text-white">
          <span className="text-2xl">🏰</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm md:text-base text-amber-300">
                Studio Dormitory • อาคาร 3D สวนพอนเทร่า (RO Classic)
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500 text-slate-950">
                True 3D WebGL
              </span>
            </div>
            <p className="text-[11px] text-slate-300">
              โมเดล 3 มิติตัวตึกจริงพร้อมอิฐช่องลม ราวระเบียง ดาดฟ้า สวนดอกไม้ และลานจอดรถ
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Floor Focus Switcher */}
          <div className="bg-slate-900/90 backdrop-blur-md p-1 rounded-xl border border-slate-700 shadow-md flex items-center gap-1 text-xs">
            <button
              type="button"
              onClick={() => handleFocusFloor(null)}
              className={`px-2.5 py-1.5 rounded-lg font-bold transition ${
                selectedFloor === null ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              ทั้งตึก
            </button>
            <button
              type="button"
              onClick={() => handleFocusFloor(1)}
              className={`px-2 py-1.5 rounded-lg font-bold transition ${
                selectedFloor === 1 ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              ชั้น 1
            </button>
            <button
              type="button"
              onClick={() => handleFocusFloor(2)}
              className={`px-2 py-1.5 rounded-lg font-bold transition ${
                selectedFloor === 2 ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              ชั้น 2
            </button>
            <button
              type="button"
              onClick={() => handleFocusFloor(3)}
              className={`px-2 py-1.5 rounded-lg font-bold transition ${
                selectedFloor === 3 ? 'bg-amber-400 text-slate-950 shadow' : 'text-slate-300 hover:text-white'
              }`}
            >
              ชั้น 3
            </button>
          </div>

          {/* Day / Night Toggle */}
          <button
            type="button"
            onClick={handleToggleNight}
            className="bg-slate-900/90 hover:bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            {isNight ? (
              <>
                <Moon className="w-3.5 h-3.5 text-indigo-400 fill-indigo-400" />
                <span>ค่ำคืน (Night)</span>
              </>
            ) : (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                <span>กลางวัน (Day)</span>
              </>
            )}
          </button>

          {/* Sound Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            className="bg-slate-900/90 hover:bg-slate-800 text-white px-3 py-2 rounded-xl border border-slate-700 shadow-md text-xs font-bold flex items-center gap-1.5 transition active:scale-95"
          >
            {isSoundOn ? (
              <>
                <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">RO Sound On</span>
              </>
            ) : (
              <>
                <VolumeX className="w-3.5 h-3.5 text-slate-400" />
                <span>เพลง RO</span>
              </>
            )}
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            title="รีเซ็ตมุมมองกล้อง"
            className="bg-slate-900/90 hover:bg-slate-800 text-white p-2.5 rounded-xl border border-slate-700 shadow-md text-xs font-semibold flex items-center gap-1 transition active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* NPC Speech Toast */}
      {npcMessage && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-40 bg-slate-900/95 text-amber-200 border border-amber-400/50 px-5 py-2.5 rounded-2xl text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 animate-bounce">
          <span>✨</span>
          <span>{npcMessage}</span>
        </div>
      )}

      {/* Floating Room Hover Card (Tooltip tracking room) */}
      {hoveredRoom && hoverPos && (
        <div
          className="absolute z-50 bg-slate-900/95 text-white rounded-2xl p-3.5 text-xs shadow-2xl border border-amber-400/40 pointer-events-none w-56 backdrop-blur-md transform -translate-x-1/2 -translate-y-full"
          style={{
            left: `${hoverPos.x}px`,
            top: `${hoverPos.y - 12}px`
          }}
        >
          <div className="flex items-center justify-between mb-1.5">
            <span className="font-extrabold text-amber-300 text-sm mono-num">
              ห้อง {hoveredRoom.roomNumber} (ชั้น {hoveredRoom.floor})
            </span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                hoveredRoom.status === 'AVAILABLE'
                  ? 'bg-emerald-500 text-white'
                  : hoveredRoom.status === 'RESERVED'
                  ? 'bg-sky-500 text-white'
                  : hoveredRoom.isOverdue
                  ? 'bg-rose-600 text-white'
                  : 'bg-amber-400 text-slate-950'
              }`}
            >
              {hoveredRoom.status === 'AVAILABLE'
                ? 'ห้องว่าง'
                : hoveredRoom.status === 'RESERVED'
                ? 'จองแล้ว'
                : hoveredRoom.isOverdue
                ? 'ค้างชำระ'
                : 'มีผู้เช่า'}
            </span>
          </div>

          <div className="text-[11px] text-slate-300 space-y-0.5">
            <p>
              <span className="text-slate-400">ผู้เช่า:</span>{' '}
              <span className="font-bold text-white">
                {hoveredRoom.status === 'OCCUPIED' ? hoveredRoom.tenantName : '-'}
              </span>
            </p>
            <p>
              <span className="text-slate-400">ค่าเช่า:</span>{' '}
              <span className="font-bold text-emerald-400">
                ฿{hoveredRoom.rent.toLocaleString()}/เดือน
              </span>
            </p>
          </div>

          <div className="mt-2 pt-1.5 border-t border-slate-700/80 text-[10px] text-amber-300 font-bold flex items-center justify-between">
            <span>คลิกเพื่อดูสัญญา & ค่าเช่า</span>
            <span>➔</span>
          </div>
        </div>
      )}

      {/* Bottom Status Legend & Instructions */}
      <div className="absolute bottom-4 left-4 right-4 z-40 pointer-events-none flex flex-wrap items-center justify-between gap-2">
        <div className="bg-slate-900/90 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-700 shadow-xl flex items-center gap-4 text-xs pointer-events-auto text-white">
          <span className="font-bold text-amber-300">สถานะห้อง:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm" />
            <span>ห้องว่าง</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-amber-400 shadow-sm" />
            <span>มีผู้เช่า</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-sky-500 shadow-sm" />
            <span>จองแล้ว</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500 shadow-sm animate-pulse" />
            <span>ค้างชำระ</span>
          </div>
        </div>

        <div className="bg-slate-900/90 backdrop-blur-md text-slate-200 px-4 py-2 rounded-2xl text-xs pointer-events-auto border border-slate-700 shadow-xl">
          💡 คลิกค้างลากเพื่อหมุน 3D • สกอร์ลเมาส์เพื่อซูม • คลิกที่ห้องเพื่อเปิดดูข้อมูลผู้เช่า
        </div>
      </div>
    </div>
  );
};
