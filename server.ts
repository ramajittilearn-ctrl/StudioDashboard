import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createBackupSnapshot, createDayOneState, createInitialSeedState, loadAppState, saveAppState } from './src/server/storage';
import { calcLateFeeSatang, calcMeterUnits, calcNextDueDate, calcProratedRentSatang, formatBaht } from './src/lib/finance';
import { FormSubmission, Invoice, MoveOutArchive, PaymentRecord, TenantRegistration } from './src/types';

async function startServer() {
  const app = express();
  const port = Number(process.env.PORT) || 3000;

  app.use(express.json({ limit: '10mb' }));

  // SECURITY RELEASE GATE:
  // The API handlers below currently have no server-side authentication and
  // store mutable tenant/financial state in local JSON. A publicly exposed
  // production deployment would allow anyone to read or modify that data.
  // Fail closed in production until verified auth + durable persistence are
  // implemented and tested. Never replace this gate with a frontend-only check.
  if (process.env.NODE_ENV === 'production') {
    app.use('/api', (_req, res) => {
      res.status(503).json({
        error: 'ERP production API is unavailable pending server-side authentication and durable storage.'
      });
    });
  }

  let state = loadAppState();

  // 1. Get entire application state
  app.get('/api/state', (req, res) => {
    res.json(state);
  });

  // 2. Update simulated date
  app.put('/api/simulated-date', (req, res) => {
    const { simulatedDate } = req.body;
    if (simulatedDate) {
      state.simulatedDate = simulatedDate;
      saveAppState(state);
    }
    res.json({ success: true, state });
  });

  // 3. Update property settings
  app.put('/api/settings', (req, res) => {
    const newSettings = req.body;
    if (newSettings) {
      state.settings = { ...state.settings, ...newSettings };
      saveAppState(state);
    }
    res.json({ success: true, state });
  });

  // 4. Update room details / Go-Live batch setup
  app.post('/api/rooms/batch-setup', (req, res) => {
    const { rooms } = req.body;
    if (Array.isArray(rooms) && rooms.length === 15) {
      state.rooms = rooms;
      // Recalculate or clear invoices
      state.invoices = [];
      saveAppState(state);
    }
    res.json({ success: true, state });
  });

  // 5. Move-In contract
  app.post('/api/rooms/move-in', (req, res) => {
    const {
      roomNumber,
      tenantName,
      phone,
      lineId,
      tier,
      rentSatang,
      depositMonths,
      startDate,
      parkingType,
      parkingFeeSatang,
      bookingCreditSatang,
      initWater,
      initElec,
      useProrate
    } = req.body;

    const rm = state.rooms.find(r => r.roomNumber === roomNumber);
    if (!rm) {
      return res.status(404).json({ error: 'Room not found' });
    }

    const mult = depositMonths || state.settings.defaultDepositMonths;
    const finalRentSatang = Number(rentSatang) || state.settings.tierGoldSatang;
    const depositSatang = finalRentSatang * mult;

    rm.status = 'OCCUPIED';
    rm.tenantName = (tenantName || '').trim();
    rm.phone = (phone || '').trim();
    rm.lineId = (lineId || '').trim();
    rm.tier = tier || 'GOLD';
    rm.rentSatang = finalRentSatang;
    rm.depositSatang = depositSatang;
    rm.startDate = startDate || state.simulatedDate;
    rm.parkingType = parkingType || 'NONE';
    rm.parkingFeeSatang = Number(parkingFeeSatang) || 0;
    rm.bookingDepositSatang = 0;
    rm.prevWater = Number(initWater) || 0;
    rm.currWater = Number(initWater) || 0;
    rm.prevElec = Number(initElec) || 0;
    rm.currElec = Number(initElec) || 0;
    rm.arrearsSatang = 0;

    // B8: If tenant moved in and prorated rent is chosen, issue initial move-in invoice
    if (useProrate && startDate) {
      const pro = calcProratedRentSatang(finalRentSatang, startDate, state.settings.billingDay);
      const period = (startDate || state.simulatedDate).substring(0, 7);
      const nextDue = calcNextDueDate(startDate || state.simulatedDate, state.settings.dueDayNextMonth || 5);
      const parkingFee = Number(parkingFeeSatang) || 0;
      const totalMoveInSatang = pro.proratedAmountSatang + parkingFee;

      state.invoices.push({
        id: `INV-${period.replace('-', '')}-${rm.roomNumber}-PRORATE`,
        roomNumber: rm.roomNumber,
        tenantName: rm.tenantName,
        tier: rm.tier,
        billingPeriod: period,
        issueDate: startDate || state.simulatedDate,
        dueDate: nextDue,
        rentSatang: pro.proratedAmountSatang,
        parkingType: rm.parkingType,
        parkingFeeSatang: parkingFee,
        prevWater: rm.prevWater,
        currWater: rm.currWater,
        waterRoll: false,
        waterUnits: 0,
        waterSatang: 0,
        prevElec: rm.prevElec,
        currElec: rm.currElec,
        elecRoll: false,
        elecUnits: 0,
        elecSatang: 0,
        arrearsSatang: 0,
        lateFeeSatang: 0,
        totalSatang: totalMoveInSatang,
        paidSatang: 0,
        balanceDueSatang: totalMoveInSatang,
        status: 'ISSUED',
        payments: []
      });
    }

    saveAppState(state);
    res.json({ success: true, state });
  });

  // 6. Reservation
  app.post('/api/rooms/reserve', (req, res) => {
    const { roomNumber, tenantName, phone, lineId, expectedDate, tier, depositSatang, parkingType } = req.body;
    const rm = state.rooms.find(r => r.roomNumber === roomNumber);
    if (!rm) return res.status(404).json({ error: 'Room not found' });

    rm.status = 'RESERVED';
    rm.tenantName = (tenantName || '').trim() + ' (จองแล้ว)';
    rm.phone = (phone || '').trim();
    rm.lineId = (lineId || '').trim();
    rm.startDate = expectedDate || state.simulatedDate;
    rm.tier = tier || 'SILVER';
    rm.parkingType = parkingType || 'NONE';
    rm.parkingFeeSatang = parkingType === 'CAR' ? state.settings.carParkingRateSatang : parkingType === 'BIKE' ? state.settings.bikeParkingRateSatang : 0;
    rm.bookingDepositSatang = Number(depositSatang) || 100000;

    saveAppState(state);
    res.json({ success: true, state });
  });

  // 7. Cancel reservation
  app.post('/api/rooms/cancel-reservation', (req, res) => {
    const { roomNumber } = req.body;
    const rm = state.rooms.find(r => r.roomNumber === roomNumber);
    if (!rm) return res.status(404).json({ error: 'Room not found' });

    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';
    rm.bookingDepositSatang = 0;

    saveAppState(state);
    res.json({ success: true, state });
  });

  // 8. Maintenance done
  app.post('/api/rooms/maintenance-done', (req, res) => {
    const { roomNumber } = req.body;
    const rm = state.rooms.find(r => r.roomNumber === roomNumber);
    if (!rm) return res.status(404).json({ error: 'Room not found' });

    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';

    saveAppState(state);
    res.json({ success: true, state });
  });

  // 9. Bulk Meter Commit on 25th
  app.post('/api/meters/bulk-commit', (req, res) => {
    const { readings } = req.body; // Array of { roomNumber, currWater, waterRoll, currElec, elecRoll }
    const s = state.settings;
    const period = state.simulatedDate.substring(0, 7); // e.g. "2026-10"

    if (Array.isArray(readings)) {
      readings.forEach(rd => {
        const rm = state.rooms.find(r => r.roomNumber === rd.roomNumber);
        if (!rm || rm.status !== 'OCCUPIED') return;

        if (rd.prevWater !== undefined && rd.prevWater !== null) {
          rm.prevWater = Number(rd.prevWater);
        }
        if (rd.prevElec !== undefined && rd.prevElec !== null) {
          rm.prevElec = Number(rd.prevElec);
        }
        rm.currWater = rd.currWater !== undefined && rd.currWater !== null ? Number(rd.currWater) : rm.currWater;
        rm.waterRoll = Boolean(rd.waterRoll);
        rm.currElec = rd.currElec !== undefined && rd.currElec !== null ? Number(rd.currElec) : rm.currElec;
        rm.elecRoll = Boolean(rd.elecRoll);

        const wUnits = calcMeterUnits(rm.prevWater, rm.currWater, rm.waterRoll);
        const eUnits = calcMeterUnits(rm.prevElec, rm.currElec, rm.elecRoll);
        const wSatang = Math.max(0, wUnits) * s.waterRateSatang;
        const eSatang = Math.max(0, eUnits) * s.electricityRateSatang;
        const parkingSatang = rm.parkingFeeSatang || 0;

        let inv = state.invoices.find(i => i.roomNumber === rm.roomNumber && i.billingPeriod === period && i.status !== 'ROLLED_OVER');
        const totalSatang = rm.rentSatang + wSatang + eSatang + parkingSatang + (rm.arrearsSatang || 0);

        // B3: Mark previous unpaid invoices for this room as ROLLED_OVER
        state.invoices.forEach(oldInv => {
          if (
            oldInv.roomNumber === rm.roomNumber &&
            oldInv.billingPeriod !== period &&
            oldInv.balanceDueSatang > 0 &&
            oldInv.status !== 'ROLLED_OVER'
          ) {
            oldInv.status = 'ROLLED_OVER';
          }
        });

        const nextDueDate = calcNextDueDate(state.simulatedDate, s.dueDayNextMonth || 5);

        if (inv) {
          inv.rentSatang = rm.rentSatang;
          inv.parkingType = rm.parkingType;
          inv.parkingFeeSatang = parkingSatang;
          inv.dueDate = nextDueDate;
          inv.prevWater = rm.prevWater;
          inv.currWater = rm.currWater;
          inv.waterRoll = rm.waterRoll;
          inv.waterUnits = wUnits;
          inv.waterSatang = wSatang;
          inv.prevElec = rm.prevElec;
          inv.currElec = rm.currElec;
          inv.elecRoll = rm.elecRoll;
          inv.elecUnits = eUnits;
          inv.elecSatang = eSatang;
          inv.arrearsSatang = rm.arrearsSatang || 0;
          inv.totalSatang = totalSatang;
          inv.balanceDueSatang = Math.max(0, totalSatang - inv.paidSatang);
          inv.status = inv.balanceDueSatang === 0 ? 'PAID' : (inv.paidSatang > 0 ? 'PARTIAL' : 'ISSUED');
        } else {
          state.invoices.push({
            id: `INV-${period.replace('-', '')}-${rm.roomNumber}`,
            roomNumber: rm.roomNumber,
            tenantName: rm.tenantName,
            tier: rm.tier,
            billingPeriod: period,
            issueDate: state.simulatedDate,
            dueDate: nextDueDate, // Due on 5th next month
            rentSatang: rm.rentSatang,
            parkingType: rm.parkingType,
            parkingFeeSatang: parkingSatang,
            prevWater: rm.prevWater,
            currWater: rm.currWater,
            waterRoll: rm.waterRoll,
            waterUnits: wUnits,
            waterSatang: wSatang,
            prevElec: rm.prevElec,
            currElec: rm.currElec,
            elecRoll: rm.elecRoll,
            elecUnits: eUnits,
            elecSatang: eSatang,
            arrearsSatang: rm.arrearsSatang || 0,
            arrearsMonthsCount: rm.arrearsSatang > 0 ? 1 : 0,
            lateFeeSatang: 0,
            totalSatang: totalSatang,
            paidSatang: 0,
            balanceDueSatang: totalSatang,
            status: 'ISSUED',
            payments: []
          });
        }

        // B1: Advance meter readings for the next cycle and reset roll flags
        rm.prevWater = rm.currWater;
        rm.prevElec = rm.currElec;
        rm.waterRoll = false;
        rm.elecRoll = false;
      });
    }

    saveAppState(state);
    res.json({ success: true, state });
  });

  // 9.1 Update Invoice amounts and line items
  app.post('/api/invoices/update', (req, res) => {
    const {
      invoiceId,
      rentSatang,
      parkingFeeSatang,
      waterSatang,
      waterUnits,
      currWater,
      elecSatang,
      elecUnits,
      currElec,
      arrearsSatang,
      lateFeeSatang,
      discountSatang,
      adjustmentNote
    } = req.body;

    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    if (rentSatang !== undefined) inv.rentSatang = Number(rentSatang);
    if (parkingFeeSatang !== undefined) inv.parkingFeeSatang = Number(parkingFeeSatang);
    if (waterSatang !== undefined) inv.waterSatang = Number(waterSatang);
    if (waterUnits !== undefined) inv.waterUnits = Number(waterUnits);
    if (currWater !== undefined) inv.currWater = Number(currWater);
    if (elecSatang !== undefined) inv.elecSatang = Number(elecSatang);
    if (elecUnits !== undefined) inv.elecUnits = Number(elecUnits);
    if (currElec !== undefined) inv.currElec = Number(currElec);
    if (arrearsSatang !== undefined) inv.arrearsSatang = Number(arrearsSatang);
    if (lateFeeSatang !== undefined) inv.lateFeeSatang = Number(lateFeeSatang);
    if (discountSatang !== undefined) inv.discountSatang = Number(discountSatang);
    if (adjustmentNote !== undefined) inv.adjustmentNote = String(adjustmentNote).trim();

    const subtotal = inv.rentSatang + inv.parkingFeeSatang + inv.waterSatang + inv.elecSatang + inv.arrearsSatang + inv.lateFeeSatang;
    const finalTotal = Math.max(0, subtotal - (inv.discountSatang || 0));
    inv.totalSatang = finalTotal;
    inv.balanceDueSatang = Math.max(0, finalTotal - inv.paidSatang);
    inv.status = inv.balanceDueSatang === 0 ? 'PAID' : (inv.paidSatang > 0 ? 'PARTIAL' : 'ISSUED');

    const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
    if (rm) {
      if (currWater !== undefined) rm.currWater = inv.currWater;
      if (currElec !== undefined) rm.currElec = inv.currElec;
      rm.parkingFeeSatang = inv.parkingFeeSatang;
      if (inv.balanceDueSatang === 0) {
        rm.arrearsSatang = 0;
      }
    }

    saveAppState(state);
    res.json({ success: true, state, invoice: inv });
  });

  // 10. Record Payment (Full or Partial)
  app.post('/api/payments', (req, res) => {
    const { invoiceId, amountSatang, method, slipNote } = req.body;
    const paySatang = Number(amountSatang) || 0;
    if (paySatang <= 0) {
      return res.status(400).json({ error: 'จำนวนเงินที่ชำระต้องมากกว่า 0 บาท' });
    }

    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });
    const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, state.settings);

    if (lateSatang > 0 && inv.lateFeeSatang === 0) {
      inv.lateFeeSatang = lateSatang;
      inv.totalSatang += lateSatang;
      inv.balanceDueSatang += lateSatang;
    }

    inv.paidSatang += paySatang;
    inv.balanceDueSatang = Math.max(0, inv.totalSatang - inv.paidSatang);
    inv.status = inv.balanceDueSatang === 0 ? 'PAID' : 'PARTIAL';

    const paymentRecord: PaymentRecord = {
      id: 'PAY-' + Date.now(),
      paidAt: state.simulatedDate + ' ' + new Date().toTimeString().substring(0, 5),
      amountSatang: paySatang,
      method: method || 'PromptPay QR',
      slipNote: slipNote || 'ชำระเงินเรียบร้อย'
    };
    inv.payments.push(paymentRecord);

    const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
    if (rm && inv.balanceDueSatang === 0) {
      rm.arrearsSatang = 0;
    } else if (rm) {
      rm.arrearsSatang = inv.balanceDueSatang;
    }

    saveAppState(state);
    res.json({ success: true, state, paymentRecord });
  });

  // 11. Move-Out Settlement
  app.post('/api/rooms/move-out', (req, res) => {
    const { roomNumber, currWater, currElec, cleaningFeeSatang, damageFeeSatang } = req.body;
    const rm = state.rooms.find(r => r.roomNumber === roomNumber);
    if (!rm) return res.status(404).json({ error: 'Room not found' });

    const s = state.settings;
    const cW = Number(currWater) >= 0 ? Number(currWater) : rm.currWater;
    const cE = Number(currElec) >= 0 ? Number(currElec) : rm.currElec;
    const wUnits = calcMeterUnits(rm.currWater, cW, false);
    const eUnits = calcMeterUnits(rm.currElec, cE, false);
    const finalWaterSatang = Math.max(0, wUnits) * s.waterRateSatang;
    const finalElectricSatang = Math.max(0, eUnits) * s.electricityRateSatang;
    const cleaningSatang = Number(cleaningFeeSatang) || 0;
    const damageSatang = Number(damageFeeSatang) || 0;

    const unpaidInvoices = state.invoices.filter(
      i => i.roomNumber === roomNumber && i.status !== 'ROLLED_OVER' && i.balanceDueSatang > 0
    );
    const totalInvoiceArrears = unpaidInvoices.reduce((sum, inv) => sum + inv.balanceDueSatang, 0);
    const arrearsSatang = Math.max(totalInvoiceArrears, rm.arrearsSatang || 0);

    const depositHeldSatang = rm.depositSatang || 0;
    const totalDeductions = finalWaterSatang + finalElectricSatang + cleaningSatang + damageSatang + arrearsSatang;
    const netRefundSatang = depositHeldSatang - totalDeductions;

    state.settlements.unshift({
      id: 'SET-' + Date.now(),
      roomNumber,
      tenantName: rm.tenantName,
      moveOutDate: state.simulatedDate,
      depositHeldSatang,
      finalWaterSatang,
      finalElectricSatang,
      cleaningFeeSatang: cleaningSatang,
      damageFeeSatang: damageSatang,
      arrearsSatang,
      netRefundSatang
    });

    state.moveOutArchives = state.moveOutArchives || [];
    state.moveOutArchives.unshift({
      id: 'ARCHIVE-' + Date.now(),
      roomNumber,
      tenantName: rm.tenantName,
      phone: rm.phone,
      lineId: rm.lineId,
      moveInDate: rm.startDate || '2026-01-01',
      moveOutDate: state.simulatedDate,
      depositSatang: depositHeldSatang,
      finalWaterReading: cW,
      finalElecReading: cE,
      finalWaterSatang,
      finalElecSatang: finalElectricSatang,
      cleaningFeeSatang: cleaningSatang,
      damageFeeSatang: damageSatang,
      arrearsDeductedSatang: arrearsSatang,
      netRefundSatang,
      deductionNote: `หักค่าน้ำ (${finalWaterSatang / 100}บ.) ค่าไฟ (${finalElectricSatang / 100}บ.) ค่าทำความสะอาด (${cleaningSatang / 100}บ.) ค่าเสียหาย (${damageSatang / 100}บ.)`,
      createdAt: new Date().toISOString()
    });

    if (netRefundSatang >= 0) {
      unpaidInvoices.forEach(inv => {
        inv.status = 'PAID';
        inv.balanceDueSatang = 0;
      });
      rm.arrearsSatang = 0;
    } else {
      rm.arrearsSatang = Math.abs(netRefundSatang);
    }

    rm.status = 'AVAILABLE';
    rm.tenantName = '';
    rm.phone = '';
    rm.lineId = '';
    rm.depositSatang = 0;
    rm.parkingType = 'NONE';
    rm.parkingFeeSatang = 0;
    rm.prevWater = cW;
    rm.currWater = cW;
    rm.prevElec = cE;
    rm.currElec = cE;

    saveAppState(state);
    res.json({ success: true, state, netRefundSatang });
  });

  // 12. Expenses
  app.post('/api/expenses', (req, res) => {
    const { title, category, amountSatang } = req.body;
    if (!title || !amountSatang) return res.status(400).json({ error: 'Title and amount required' });

    state.expenses.unshift({
      id: 'EXP-' + Date.now(),
      date: state.simulatedDate,
      category: category || 'ซ่อมบำรุง',
      title: title.trim(),
      amountSatang: Number(amountSatang)
    });

    saveAppState(state);
    res.json({ success: true, state });
  });

  app.delete('/api/expenses/:id', (req, res) => {
    const { id } = req.params;
    state.expenses = state.expenses.filter(e => e.id !== id);
    saveAppState(state);
    res.json({ success: true, state });
  });

  // 13. LINE OA Connection test & Notification
  app.post('/api/line/test-connection', async (req, res) => {
    const { token } = req.body;
    const lineToken = token || state.settings.lineChannelAccessToken;
    if (!lineToken) {
      return res.status(400).json({ error: 'กรุณากรอก LINE Channel Access Token' });
    }

    try {
      const lineRes = await fetch('https://api.line.me/v2/bot/info', {
        headers: { Authorization: `Bearer ${lineToken}` }
      });
      if (lineRes.ok) {
        const botInfo = await lineRes.json();
        return res.json({ success: true, botInfo });
      } else {
        const err = await lineRes.text();
        return res.status(400).json({ error: `LINE API Error (${lineRes.status}): ${err}` });
      }
    } catch (err: any) {
      return res.status(500).json({ error: err.message || 'ไม่สามารถเชื่อมต่อ LINE API ได้' });
    }
  });

  app.post('/api/line/notify', async (req, res) => {
    const { invoiceId, targetUserId } = req.body;
    const inv = state.invoices.find(i => i.id === invoiceId);
    if (!inv) return res.status(404).json({ error: 'Invoice not found' });

    const s = state.settings;
    const rm = state.rooms.find(r => r.roomNumber === inv.roomNumber);
    const lateSatang = calcLateFeeSatang(inv, state.simulatedDate, s);
    const netDue = inv.balanceDueSatang + lateSatang;

    const dueText = inv.dueDate ? ` (กำหนดชำระภายใน ${inv.dueDate})` : '';

    const messageText = [
      `🏢 แจ้งบิลค่าเช่า ${s.apartmentName} — ห้อง ${inv.roomNumber}`,
      `ผู้เช่า: ${inv.tenantName} (แพ็กเกจ ${inv.tier})`,
      `รอบตัดบิล: ${inv.issueDate}${dueText}`,
      `--------------------------------`,
      `• ค่าเช่าห้องพัก: ${formatBaht(inv.rentSatang)} บาท`,
      inv.parkingFeeSatang > 0 ? `• ค่าจอดรถ (${inv.parkingType === 'CAR' ? 'รถยนต์' : 'มอเตอร์ไซค์'}): ${formatBaht(inv.parkingFeeSatang)} บาท` : null,
      `• ค่าน้ำ (${inv.prevWater} → ${inv.currWater} = ${inv.waterUnits} หน่วย): ${formatBaht(inv.waterSatang)} บาท`,
      `• ค่าไฟ (${inv.prevElec} → ${inv.currElec} = ${inv.elecUnits} หน่วย): ${formatBaht(inv.elecSatang)} บาท`,
      inv.arrearsSatang > 0 ? `• ยอดค้างยกมา: ${formatBaht(inv.arrearsSatang)} บาท` : null,
      lateSatang > 0 ? `• ค่าปรับเกินกำหนด: ${formatBaht(lateSatang)} บาท` : null,
      (inv.discountSatang && inv.discountSatang > 0) ? `• ส่วนลดพิเศษ: -${formatBaht(inv.discountSatang)} บาท` : null,
      inv.paidSatang > 0 ? `• ชำระแล้วบางส่วน: -${formatBaht(inv.paidSatang)} บาท` : null,
      `--------------------------------`,
      `✅ ยอดสุทธิที่ต้องชำระ: ${formatBaht(netDue)} บาท`,
      `📲 สแกน PromptPay: ${s.promptPayId}`,
      `🏦 หรือโอนบัญชี ${s.bankName} ${s.bankAccount} (${s.bankOwner})`,
      `เมื่อโอนแล้วกรุณาแนบรูปสลิปตอบกลับ ขอบคุณครับ`
    ].filter(Boolean).join('\n');

    let apiSent = false;
    let apiError = '';

    // Determine target LINE ID: from request, or tenant's lineId, or default setting
    const destination = targetUserId || (rm && rm.lineId && rm.lineId.startsWith('U') ? rm.lineId : s.lineDestinationId);

    if (s.lineChannelAccessToken && destination) {
      try {
        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${s.lineChannelAccessToken}`
          },
          body: JSON.stringify({
            to: destination,
            messages: [{ type: 'text', text: messageText }]
          })
        });
        if (lineRes.ok) {
          apiSent = true;
        } else {
          const errText = await lineRes.text();
          apiError = `LINE API HTTP ${lineRes.status}: ${errText}`;
        }
      } catch (err: any) {
        apiError = err.message || 'Network error reaching LINE API';
      }
    } else if (!s.lineChannelAccessToken) {
      apiError = 'ยังไม่ได้ตั้งค่า LINE Channel Access Token ในการตั้งค่า';
    } else if (!destination) {
      apiError = 'ไม่พบ LINE User ID ของผู้เช่าห้องนี้ กรุณาระบุในข้อมูลผู้เช่า';
    }

    inv.lineSentAt = new Date().toISOString().replace('T', ' ').substring(0, 16);
    saveAppState(state);

    res.json({
      success: true,
      apiSent,
      apiError: apiError || undefined,
      messageText,
      sentAt: inv.lineSentAt
    });
  });

  // 14. Google Form Webhook & Payment Reconciliation
  app.post('/api/webhooks/google-form/payment', (req, res) => {
    const { roomNumber, tenantName, amount, paymentDate, paymentTime, bankAccount, slipUrl, slipBase64 } = req.body;
    if (!roomNumber || !amount) {
      return res.status(400).json({ error: 'roomNumber and amount are required' });
    }

    state.formSubmissions = state.formSubmissions || [];
    const amountSatang = Math.round(Number(amount) * 100);

    const submission: FormSubmission = {
      id: 'SUB-' + Date.now(),
      roomNumber: String(roomNumber).trim(),
      tenantName: (tenantName || '').trim() || `ผู้เช่าห้อง ${roomNumber}`,
      amountSatang,
      transferDate: paymentDate || state.simulatedDate,
      transferTime: paymentTime || '12:00',
      bankAccount: bankAccount || 'KBank',
      slipUrl: slipBase64 || slipUrl || 'https://placehold.co/400x600/e2e8f0/1e293b?text=Payment+Slip',
      submittedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    state.formSubmissions.unshift(submission);
    saveAppState(state);
    res.json({ success: true, submissionId: submission.id, state });
  });

  app.post('/api/reconcile/manual-upload', (req, res) => {
    const { roomNumber, tenantName, amountSatang, transferDate, transferTime, bankAccount, slipUrl } = req.body;
    state.formSubmissions = state.formSubmissions || [];

    const submission: FormSubmission = {
      id: 'SUB-' + Date.now(),
      roomNumber: String(roomNumber).trim(),
      tenantName: (tenantName || '').trim() || `ห้อง ${roomNumber}`,
      amountSatang: Number(amountSatang) || 0,
      transferDate: transferDate || state.simulatedDate,
      transferTime: transferTime || '12:00',
      bankAccount: bankAccount || 'KBank',
      slipUrl: slipUrl || 'https://placehold.co/400x600/e2e8f0/1e293b?text=Uploaded+Slip',
      submittedAt: new Date().toISOString(),
      status: 'PENDING'
    };

    state.formSubmissions.unshift(submission);
    saveAppState(state);
    res.json({ success: true, submission, state });
  });

  app.post('/api/reconcile/approve', (req, res) => {
    const { submissionId, invoiceId, note } = req.body;
    state.formSubmissions = state.formSubmissions || [];
    const sub = state.formSubmissions.find(s => s.id === submissionId);
    if (!sub) return res.status(404).json({ error: 'ไม่พบรายการแจ้งโอนนี้' });
    if (sub.status !== 'PENDING') {
      return res.status(400).json({ error: 'รายการแจ้งโอนนี้ได้รับการดำเนินการไปแล้ว ไม่สามารถดำเนินการซ้ำได้' });
    }

    // Match with targeted invoice or active unpaid invoice for this room
    let inv = invoiceId ? state.invoices.find(i => i.id === invoiceId) : undefined;
    if (!inv) {
      inv = state.invoices.find(i => i.roomNumber === sub.roomNumber && i.balanceDueSatang > 0);
    }

    if (inv) {
      const payRecord: PaymentRecord = {
        id: 'PAY-' + Date.now(),
        paidAt: `${sub.transferDate} ${sub.transferTime}`,
        amountSatang: sub.amountSatang,
        method: 'โอนผ่านธนาคาร',
        slipNote: note || `อนุมัติจาก Google Form (${sub.transferDate} ${sub.transferTime})`
      };

      inv.payments.push(payRecord);
      inv.paidSatang += sub.amountSatang;
      inv.balanceDueSatang = Math.max(0, inv.totalSatang - inv.paidSatang);
      inv.status = inv.balanceDueSatang === 0 ? 'PAID' : 'PARTIAL';

      // Update room arrears if payment cleared old balance
      const rm = state.rooms.find(r => r.roomNumber === inv?.roomNumber);
      if (rm && inv.balanceDueSatang === 0) {
        rm.arrearsSatang = 0;
      }

      sub.matchedInvoiceId = inv.id;
    }

    sub.status = 'RECONCILED';
    sub.reconciledAt = new Date().toISOString();
    sub.adminNote = note || 'ยืนยันยอดเงินเข้าบัญชีเรียบร้อย';

    saveAppState(state);
    res.json({ success: true, submission: sub, state });
  });

  app.post('/api/reconcile/reject', (req, res) => {
    const { submissionId, reason } = req.body;
    state.formSubmissions = state.formSubmissions || [];
    const sub = state.formSubmissions.find(s => s.id === submissionId);
    if (!sub) return res.status(404).json({ error: 'ไม่พบรายการแจ้งโอนนี้' });
    if (sub.status !== 'PENDING') {
      return res.status(400).json({ error: 'รายการแจ้งโอนนี้ได้รับการดำเนินการไปแล้ว' });
    }

    sub.status = 'REJECTED';
    sub.adminNote = reason || 'สลิปไม่ตรง / ตรวจสอบไม่พบยอดเงินในบัญชี';
    saveAppState(state);
    res.json({ success: true, submission: sub, state });
  });

  // 15. Tenant Registration Queue
  app.post('/api/webhooks/google-form/register', (req, res) => {
    const { requestedRoomNumber, tenantName, phone, lineId, idCardNumber, vehicleType, licensePlate, plannedMoveInDate, depositPaidSatang } = req.body;
    state.registrations = state.registrations || [];

    const reg: TenantRegistration = {
      id: 'REG-' + Date.now(),
      requestedRoomNumber: String(requestedRoomNumber).trim(),
      tenantName: (tenantName || '').trim(),
      phone: (phone || '').trim(),
      lineId: (lineId || '').trim(),
      idCardNumber: (idCardNumber || '').trim(),
      vehicleType: vehicleType || 'NONE',
      licensePlate: (licensePlate || '').trim(),
      plannedMoveInDate: plannedMoveInDate || state.simulatedDate,
      depositPaidSatang: Number(depositPaidSatang) || 0,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    };

    state.registrations.unshift(reg);
    saveAppState(state);
    res.json({ success: true, registration: reg, state });
  });

  app.post('/api/registrations/approve', (req, res) => {
    const { registrationId, roomNumber, tier, rentSatang, depositMonths, initWater, initElec } = req.body;
    state.registrations = state.registrations || [];
    const reg = state.registrations.find(r => r.id === registrationId);
    if (!reg) return res.status(404).json({ error: 'ไม่พบรายการลงทะเบียนนี้' });
    if (reg.status !== 'PENDING') {
      return res.status(400).json({ error: 'คำขอนี้ได้รับการประมวลผลไปแล้ว' });
    }

    const targetRoom = roomNumber || reg.requestedRoomNumber;
    const rm = state.rooms.find(r => r.roomNumber === targetRoom);
    if (!rm) return res.status(404).json({ error: 'ไม่พบห้องที่ระบุ' });

    if (rm.status === 'OCCUPIED') {
      return res.status(400).json({ error: `ห้อง ${targetRoom} มีผู้เช่าอยู่แล้วในปัจจุบัน` });
    }
    if (rm.status === 'RESERVED' && rm.phone && rm.phone !== reg.phone) {
      return res.status(400).json({ error: `ห้อง ${targetRoom} มีผู้จองไว้แล้ว (${rm.tenantName})` });
    }

    const mult = depositMonths || state.settings.defaultDepositMonths;
    const finalRentSatang = Number(rentSatang) || (tier === 'GOLD' ? state.settings.tierGoldSatang : tier === 'SILVER' ? state.settings.tierSilverSatang : state.settings.tierStandardSatang);
    const depositSatang = finalRentSatang * mult;

    rm.status = 'OCCUPIED';
    rm.tenantName = reg.tenantName;
    rm.phone = reg.phone;
    rm.lineId = reg.lineId || '';
    rm.tier = tier || rm.tier || 'STANDARD';
    rm.rentSatang = finalRentSatang;
    rm.depositSatang = depositSatang;
    rm.startDate = reg.plannedMoveInDate || state.simulatedDate;
    rm.parkingType = reg.vehicleType || 'NONE';
    rm.parkingFeeSatang = reg.vehicleType === 'CAR' ? state.settings.carParkingRateSatang : reg.vehicleType === 'BIKE' ? state.settings.bikeParkingRateSatang : 0;
    rm.prevWater = Number(initWater) || rm.currWater || 0;
    rm.currWater = Number(initWater) || rm.currWater || 0;
    rm.prevElec = Number(initElec) || rm.currElec || 0;
    rm.currElec = Number(initElec) || rm.currElec || 0;
    rm.arrearsSatang = 0;

    reg.status = 'APPROVED';
    reg.approvedAt = new Date().toISOString();

    saveAppState(state);
    res.json({ success: true, registration: reg, state });
  });

  app.post('/api/registrations/reject', (req, res) => {
    const { registrationId, reason } = req.body;
    state.registrations = state.registrations || [];
    const reg = state.registrations.find(r => r.id === registrationId);
    if (!reg) return res.status(404).json({ error: 'ไม่พบรายการลงทะเบียนนี้' });
    if (reg.status !== 'PENDING') {
      return res.status(400).json({ error: 'คำขอนี้ได้รับการประมวลผลไปแล้ว' });
    }

    reg.status = 'REJECTED';
    reg.adminNote = reason || 'ยกเลิก / ไม่ผ่านการอนุมัติ';
    saveAppState(state);
    res.json({ success: true, registration: reg, state });
  });

  // 16. Permanent Tenant Archives
  app.get('/api/tenants/archive', (req, res) => {
    res.json({ archives: state.moveOutArchives || [] });
  });

  // 17. Day-One Clean Reset & Demo Switcher
  app.post('/api/reset-day-one', (req, res) => {
    state = createDayOneState();
    saveAppState(state);
    res.json({ success: true, state, message: 'รีเซ็ตระบบเป็นสถานะเริ่มต้นวันแรก (15 ห้องว่าง มิเตอร์ 0) เรียบร้อยแล้ว' });
  });

  app.post('/api/reset-demo', (req, res) => {
    state = createInitialSeedState();
    saveAppState(state);
    res.json({ success: true, state, message: 'โหลดข้อมูลจำลองสำหรับทดสอบระบบเรียบร้อยแล้ว' });
  });

  // 18. Backup & Recall Manager
  app.get('/api/backups', (req, res) => {
    res.json({ backups: state.backups || [] });
  });

  app.post('/api/backups/create', (req, res) => {
    const { name, tag } = req.body;
    createBackupSnapshot(state, tag || 'MANUAL', name);
    saveAppState(state);
    res.json({ success: true, state, backups: state.backups });
  });

  app.post('/api/backups/recall', (req, res) => {
    const { snapshotId } = req.body;
    state.backups = state.backups || [];
    const snap = state.backups.find(b => b.id === snapshotId);
    if (!snap) return res.status(404).json({ error: 'ไม่พบ Snapshot ที่ต้องการกู้คืน' });

    try {
      const restored = JSON.parse(snap.stateData);
      if (restored && Array.isArray(restored.rooms) && restored.rooms.length === 15) {
        state = restored;
        saveAppState(state);
        return res.json({ success: true, state, message: `กู้คืนระบบจาก Snapshot "${snap.name}" เรียบร้อยแล้ว` });
      }
      res.status(400).json({ error: 'ข้อมูล Snapshot เสียหายหรือไม่ถูกต้อง' });
    } catch (err: any) {
      res.status(500).json({ error: 'เกิดข้อผิดพลาดในการกู้คืน: ' + err.message });
    }
  });

  app.get('/api/backup/download', (req, res) => {
    createBackupSnapshot(state, 'MANUAL', `สำรองข้อมูลโดยดาวน์โหลด (${state.simulatedDate})`);
    res.setHeader('Content-Disposition', `attachment; filename="taky_erp_backup_${state.simulatedDate}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.send(JSON.stringify(state, null, 2));
  });

  app.post('/api/backup/restore', (req, res) => {
    const uploadedState = req.body;
    if (uploadedState && Array.isArray(uploadedState.rooms) && uploadedState.rooms.length === 15) {
      state = uploadedState;
      saveAppState(state);
      return res.json({ success: true, state });
    }
    res.status(400).json({ error: 'Invalid backup structure. Must contain 15 rooms.' });
  });

  // Mount Vite or static server
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: process.env.DISABLE_HMR !== 'true' },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve('dist/index.html'));
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Taky Apartment ERP server running at http://0.0.0.0:${port}`);
  });
}

startServer().catch(err => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});
