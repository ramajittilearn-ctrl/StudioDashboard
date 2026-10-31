import React, { useState, useEffect, useRef } from 'react';
import { AppState, Room } from './types';
import {
  fetchAppState,
  setClientCachedState,
  updateSimulatedDate,
  updateSettings,
  batchSetupRooms,
  submitMoveIn,
  submitReservation,
  cancelReservation,
  markMaintenanceDone,
  commitBulkMeters,
  updateInvoice,
  recordPayment,
  submitMoveOut,
  addExpense,
  deleteExpense,
  sendLineNotification,
  resetDatabase,
  restoreBackup
} from './api/client';
import {
  auth,
  loginWithGoogle,
  logoutFirebase,
  testConnection,
  saveStateToFirestore,
  loadStateFromFirestore,
  subscribeToFirestoreState,
  ADMIN_EMAIL,
  isUserAdmin
} from './lib/firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { RoomLiveBoard } from './components/RoomLiveBoard';
import { BulkMeterTable } from './components/BulkMeterTable';
import { InvoiceCenter } from './components/InvoiceCenter';
import { PaymentCenter } from './components/PaymentCenter';
import { SettingsExpenses } from './components/SettingsExpenses';
import { TenantArchiveView } from './components/TenantArchiveView';
import { MoveInModal } from './components/modals/MoveInModal';
import { ReserveModal } from './components/modals/ReserveModal';
import { PaymentModal } from './components/modals/PaymentModal';
import { MoveOutModal } from './components/modals/MoveOutModal';
import { GoLiveSetupModal } from './components/modals/GoLiveSetupModal';
import { EditInvoiceModal } from './components/modals/EditInvoiceModal';
import { ReconcileModal } from './components/modals/ReconcileModal';
import { RegistrationModal } from './components/modals/RegistrationModal';
import { BackupRecallModal } from './components/modals/BackupRecallModal';
import { Check } from 'lucide-react';

export default function App() {
  const [state, setState] = useState<AppState | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isCloudSynced, setIsCloudSynced] = useState<boolean>(false);

  // Selected invoice for LINE card preview
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | undefined>(undefined);

  // Modal states
  const [moveInRoom, setMoveInRoom] = useState<Room | null>(null);
  const [reserveRoom, setReserveRoom] = useState<Room | null>(null);
  const [paymentInvoiceId, setPaymentInvoiceId] = useState<string | null>(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState<string | null>(null);
  const [moveOutRoom, setMoveOutRoom] = useState<Room | null>(null);
  const [isGoLiveOpen, setIsGoLiveOpen] = useState<boolean>(false);
  const [isReconcileOpen, setIsReconcileOpen] = useState<boolean>(false);
  const [isRegistrationOpen, setIsRegistrationOpen] = useState<boolean>(false);
  const [isBackupRecallOpen, setIsBackupRecallOpen] = useState<boolean>(false);

  const isLocalUpdate = useRef<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(prev => (prev === msg ? null : prev));
    }, 3200);
  };

  // 1. Initial State Loading from Firebase & Server
  useEffect(() => {
    const initApp = async () => {
      testConnection();

      const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
        setCurrentUser(user);
      });

      try {
        let remoteState = await loadStateFromFirestore();

        if (remoteState && Array.isArray(remoteState.rooms) && remoteState.rooms.length === 15) {
          setClientCachedState(remoteState);
          setState(remoteState);
          setIsCloudSynced(true);
          if (remoteState.invoices && remoteState.invoices.length > 0) {
            setSelectedInvoiceId(remoteState.invoices[0].id);
          }
        } else {
          const serverState = await fetchAppState();
          setClientCachedState(serverState);
          setState(serverState);
          if (serverState.invoices && serverState.invoices.length > 0) {
            setSelectedInvoiceId(serverState.invoices[0].id);
          }
          await saveStateToFirestore(serverState);
          setIsCloudSynced(true);
        }
      } catch (err) {
        console.warn('Could not read from Firestore, falling back to local server:', err);
        const serverState = await fetchAppState();
        setClientCachedState(serverState);
        setState(serverState);
        if (serverState.invoices && serverState.invoices.length > 0) {
          setSelectedInvoiceId(serverState.invoices[0].id);
        }
      } finally {
        setLoading(false);
      }

      // 2. Subscribe to real-time changes from Firestore
      const unsubscribeFirestore = subscribeToFirestoreState((cloudState) => {
        if (!isLocalUpdate.current) {
          setClientCachedState(cloudState);
          setState(cloudState);
          setIsCloudSynced(true);
        }
      });

      return () => {
        unsubscribeAuth();
        unsubscribeFirestore();
      };
    };

    initApp();
  }, []);

  const syncBothStores = async (nextState: AppState) => {
    setState(nextState);
    isLocalUpdate.current = true;
    try {
      await saveStateToFirestore(nextState);
      setIsCloudSynced(true);
    } catch (err) {
      console.warn('Firestore cloud sync failed:', err);
    } finally {
      setTimeout(() => {
        isLocalUpdate.current = false;
      }, 500);
    }
  };

  if (loading || !state) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm font-medium text-slate-300">กำลังเชื่อมต่อ Firebase (myapartment-5903f)...</p>
        </div>
      </div>
    );
  }

  const unpaidCount = state.invoices.filter(i => i.status !== 'ROLLED_OVER' && i.balanceDueSatang > 0).length;

  // Firebase Auth Handlers
  const handleGoogleLogin = async () => {
    try {
      const user = await loginWithGoogle();
      setCurrentUser(user);
      if (isUserAdmin(user)) {
        showToast(`👑 ยินดีต้อนรับ Admin สูงสุด: ${user.email} (สิทธิ์เต็ม)`);
      } else {
        showToast(`เข้าสู่ระบบสำเร็จ: ${user.email} (สิทธิ์ดูข้อมูลทั่วไป — ผู้ดูแลสูงสุดคือ ${ADMIN_EMAIL})`);
      }
    } catch (err: any) {
      showToast('เข้าสู่ระบบไม่สำเร็จ: ' + (err.message || 'Error'));
    }
  };

  const handleGoogleLogout = async () => {
    try {
      await logoutFirebase();
      setCurrentUser(null);
      showToast('ออกจากระบบเรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการออกจากระบบ');
    }
  };

  // State mutation Handlers
  const handleSimulatedDateChange = async (date: string) => {
    try {
      const nextState = await updateSimulatedDate(date);
      await syncBothStores(nextState);
      if (date > '2026-11-05') {
        showToast('จำลองวันที่เลยกำหนดชำระวันที่ 5: ระบบคำนวณค่าปรับรายวันอัตโนมัติแล้ว');
      } else {
        showToast(`เปลี่ยนวันที่ระบบเป็น ${date}`);
      }
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการเปลี่ยนวันที่');
    }
  };

  const handleUpdateSettings = async (newSettings: any) => {
    try {
      const nextState = await updateSettings(newSettings);
      await syncBothStores(nextState);
      showToast('บันทึกการตั้งค่าเรทราคาลง Firebase เรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการบันทึกการตั้งค่า');
    }
  };

  const handleBatchSetup = async (rooms: Room[]) => {
    try {
      const nextState = await batchSetupRooms(rooms);
      await syncBothStores(nextState);
      setIsGoLiveOpen(false);
      showToast('บันทึกข้อมูลจริงทั้ง 15 ห้องสำหรับ Go-Live ลง Firebase เรียบร้อยแล้ว!');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการบันทึกข้อมูล 15 ห้อง');
    }
  };

  const handleMoveInSubmit = async (payload: any) => {
    try {
      const nextState = await submitMoveIn(payload);
      await syncBothStores(nextState);
      setMoveInRoom(null);
      showToast(`ทำสัญญาเข้าอยู่ห้อง ${payload.roomNumber} (${payload.tenantName}) สำเร็จ`);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการทำสัญญาเข้าอยู่');
    }
  };

  const handleReserveSubmit = async (payload: any) => {
    try {
      const nextState = await submitReservation(payload);
      await syncBothStores(nextState);
      setReserveRoom(null);
      showToast(`บันทึกการจองห้อง ${payload.roomNumber} สำเร็จ`);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการรับจอง');
    }
  };

  const handleCancelReserve = async (roomNumber: string) => {
    if (!window.confirm(`ยืนยันการยกเลิกจองห้อง ${roomNumber} และเปิดเป็นห้องว่าง?`)) return;
    try {
      const nextState = await cancelReservation(roomNumber);
      await syncBothStores(nextState);
      showToast(`ยกเลิกการจองห้อง ${roomNumber} แล้ว`);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการยกเลิกจอง');
    }
  };

  const handleMaintenanceDone = async (roomNumber: string) => {
    try {
      const nextState = await markMaintenanceDone(roomNumber);
      await syncBothStores(nextState);
      showToast(`ห้อง ${roomNumber} ซ่อมเสร็จแล้ว พร้อมเปิดให้เช่า`);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด');
    }
  };

  const handleCommitBulkMeters = async (readings: any[]) => {
    try {
      const nextState = await commitBulkMeters(readings);
      await syncBothStores(nextState);
      setActiveTab('invoices');
      showToast('ออกบิลประจำวันที่ 25 และบันทึกลง Firebase เรียบร้อย!');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการออกบิล');
    }
  };

  const handlePaymentSubmit = async (payload: any) => {
    try {
      const nextState = await recordPayment(payload);
      await syncBothStores(nextState);
      setPaymentInvoiceId(null);
      showToast('บันทึกการรับชำระเงิน ตัดยอดหนี้อัตโนมัติ และอัปเดต Firebase เรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการรับชำระเงิน');
    }
  };

  const handleEditInvoiceSubmit = async (payload: any) => {
    try {
      const nextState = await updateInvoice(payload);
      await syncBothStores(nextState);
      setEditingInvoiceId(null);
      showToast('แก้ไขยอดเงินในบิลและคำนวณยอดสุทธิใหม่เรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการแก้ไขยอดบิล');
    }
  };

  const handleMoveOutSubmit = async (payload: any) => {
    try {
      const { state: nextState } = await submitMoveOut(payload);
      await syncBothStores(nextState);
      setMoveOutRoom(null);
      showToast(`บันทึกย้ายออกห้อง ${payload.roomNumber} และออกใบสรุปคืนเงินประกันเรียบร้อย`);
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการบันทึกย้ายออก');
    }
  };

  const handleAddExpense = async (payload: any) => {
    try {
      const nextState = await addExpense(payload);
      await syncBothStores(nextState);
      showToast('บันทึกรายการรายจ่ายเรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const nextState = await deleteExpense(id);
      await syncBothStores(nextState);
      showToast('ลบรายการรายจ่ายแล้ว');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาด');
    }
  };

  const handleSendLineNotify = async (invoiceId: string) => {
    const res = await sendLineNotification(invoiceId);
    const updated = await fetchAppState();
    await syncBothStores(updated);
    showToast(res.apiSent ? 'ส่งบิลผ่าน LINE Messaging API สำเร็จ' : 'สร้างข้อความบิล LINE เรียบร้อย');
    return res;
  };

  const handleResetDb = async () => {
    if (!window.confirm('ต้องการรีเซ็ตข้อมูลทั้งหมดกลับเป็นค่าเริ่มต้นตัวอย่าง 15 ห้องใช่หรือไม่?')) return;
    try {
      const nextState = await resetDatabase();
      await syncBothStores(nextState);
      showToast('รีเซ็ตฐานข้อมูลตัวอย่าง 15 ห้องเรียบร้อย');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการรีเซ็ต');
    }
  };

  const handleRestoreBackupState = async (backup: AppState) => {
    try {
      const nextState = await restoreBackup(backup);
      await syncBothStores(nextState);
      showToast('กู้คืนข้อมูลสำเร็จ');
    } catch (err: any) {
      showToast('เกิดข้อผิดพลาดในการกู้คืน');
    }
  };

  const refreshServerState = async () => {
    try {
      const next = await fetchAppState();
      await syncBothStores(next);
    } catch (err) {
      console.error('Failed to refresh server state:', err);
    }
  };

  const paymentInvoice = state.invoices.find(i => i.id === paymentInvoiceId) || null;
  const pendingSubmissionsCount = (state.formSubmissions || []).filter(s => s.status === 'PENDING').length;
  const pendingRegistrationsCount = (state.registrations || []).filter(r => r.status === 'PENDING').length;

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 selection:bg-emerald-500 selection:text-white">
      {/* Top Header */}
      <Header
        settings={state.settings}
        simulatedDate={state.simulatedDate}
        onSimulatedDateChange={handleSimulatedDateChange}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        unpaidCount={unpaidCount}
        pendingSubmissionsCount={pendingSubmissionsCount}
        pendingRegistrationsCount={pendingRegistrationsCount}
        onOpenReconcileModal={() => setIsReconcileOpen(true)}
        onOpenRegistrationModal={() => setIsRegistrationOpen(true)}
        onOpenBackupRecallModal={() => setIsBackupRecallOpen(true)}
        currentUser={currentUser}
        onLogin={handleGoogleLogin}
        onLogout={handleGoogleLogout}
        isCloudSynced={isCloudSynced}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-5 space-y-6">
        {/* Tab 1: Executive Dashboard */}
        {activeTab === 'dashboard' && (
          <DashboardView
            state={state}
            onNavigateTab={setActiveTab}
            onOpenPaymentModal={(invId) => setPaymentInvoiceId(invId)}
            onViewInvoice={(rNum) => {
              const inv = state.invoices.find(i => i.roomNumber === rNum && i.status !== 'ROLLED_OVER');
              if (inv) setSelectedInvoiceId(inv.id);
              setActiveTab('invoices');
            }}
            onSendLineNotify={handleSendLineNotify}
            onOpenReconcileModal={() => setIsReconcileOpen(true)}
            onOpenRegistrationModal={() => setIsRegistrationOpen(true)}
            onOpenBackupRecallModal={() => setIsBackupRecallOpen(true)}
          />
        )}

        {/* Tab 2: 15-Room Live Board */}
        {activeTab === 'rooms' && (
          <RoomLiveBoard
            state={state}
            onOpenMoveIn={(rNum) => setMoveInRoom(state.rooms.find(r => r.roomNumber === rNum) || null)}
            onOpenReserve={(rNum) => setReserveRoom(state.rooms.find(r => r.roomNumber === rNum) || null)}
            onCancelReserve={handleCancelReserve}
            onMarkMaintenanceDone={handleMaintenanceDone}
            onOpenPayment={(rNum) => {
              const inv = state.invoices.find(i => i.roomNumber === rNum && i.status !== 'ROLLED_OVER');
              if (inv) setPaymentInvoiceId(inv.id);
            }}
            onOpenMoveOut={(rNum) => setMoveOutRoom(state.rooms.find(r => r.roomNumber === rNum) || null)}
            onViewLineBill={(rNum) => {
              const inv = state.invoices.find(i => i.roomNumber === rNum && i.status !== 'ROLLED_OVER');
              if (inv) setSelectedInvoiceId(inv.id);
              setActiveTab('invoices');
            }}
            onOpenGoLive={() => setIsGoLiveOpen(true)}
            onGoToBilling={() => setActiveTab('billing')}
          />
        )}

        {/* Tab 3: 25th Meter Bulk Entry */}
        {activeTab === 'billing' && (
          <BulkMeterTable
            state={state}
            onCommitInvoices={handleCommitBulkMeters}
          />
        )}

        {/* Tab 4: Dual Invoices & LINE Preview */}
        {activeTab === 'invoices' && (
          <InvoiceCenter
            state={state}
            selectedInvoiceId={selectedInvoiceId}
            onSelectInvoice={setSelectedInvoiceId}
            onOpenPayment={(invId) => setPaymentInvoiceId(invId)}
            onOpenEditInvoice={(invId) => setEditingInvoiceId(invId)}
            onSendLineNotify={handleSendLineNotify}
          />
        )}

        {/* Tab 5: Payments & Arrears Ledger */}
        {activeTab === 'payments' && (
          <PaymentCenter
            state={state}
            onOpenPaymentModal={(invId) => setPaymentInvoiceId(invId)}
            onOpenEditInvoice={(invId) => setEditingInvoiceId(invId)}
            onViewInvoice={(rNum) => {
              const inv = state.invoices.find(i => i.roomNumber === rNum && i.status !== 'ROLLED_OVER');
              if (inv) setSelectedInvoiceId(inv.id);
              setActiveTab('invoices');
            }}
          />
        )}

        {/* Tab 6: Settings, Expenses & P&L */}
        {activeTab === 'settings' && (
          <SettingsExpenses
            state={state}
            onUpdateSettings={handleUpdateSettings}
            onAddExpense={handleAddExpense}
            onDeleteExpense={handleDeleteExpense}
            onResetDatabase={handleResetDb}
            onRestoreBackup={handleRestoreBackupState}
          />
        )}

        {/* Tab 7: Permanent Tenant Archives */}
        {activeTab === 'archive' && (
          <TenantArchiveView archives={state.moveOutArchives || []} />
        )}
      </main>

      {/* Modals */}
      <MoveInModal
        room={moveInRoom}
        state={state}
        isOpen={Boolean(moveInRoom)}
        onClose={() => setMoveInRoom(null)}
        onSubmit={handleMoveInSubmit}
      />

      <ReserveModal
        room={reserveRoom}
        state={state}
        isOpen={Boolean(reserveRoom)}
        onClose={() => setReserveRoom(null)}
        onSubmit={handleReserveSubmit}
      />

      <PaymentModal
        invoice={paymentInvoice}
        state={state}
        isOpen={Boolean(paymentInvoiceId)}
        onClose={() => setPaymentInvoiceId(null)}
        onSubmit={handlePaymentSubmit}
      />

      <MoveOutModal
        room={moveOutRoom}
        state={state}
        isOpen={Boolean(moveOutRoom)}
        onClose={() => setMoveOutRoom(null)}
        onSubmit={handleMoveOutSubmit}
      />

      <GoLiveSetupModal
        state={state}
        isOpen={isGoLiveOpen}
        onClose={() => setIsGoLiveOpen(false)}
        onSubmit={handleBatchSetup}
      />

      <EditInvoiceModal
        invoice={state.invoices.find(i => i.id === editingInvoiceId) || null}
        state={state}
        isOpen={Boolean(editingInvoiceId)}
        onClose={() => setEditingInvoiceId(null)}
        onSubmit={handleEditInvoiceSubmit}
      />

      <ReconcileModal
        isOpen={isReconcileOpen}
        onClose={() => setIsReconcileOpen(false)}
        submissions={state.formSubmissions || []}
        rooms={state.rooms}
        invoices={state.invoices}
        onRefreshState={refreshServerState}
      />

      <RegistrationModal
        isOpen={isRegistrationOpen}
        onClose={() => setIsRegistrationOpen(false)}
        registrations={state.registrations || []}
        rooms={state.rooms}
        settings={state.settings}
        onRefreshState={refreshServerState}
      />

      <BackupRecallModal
        isOpen={isBackupRecallOpen}
        onClose={() => setIsBackupRecallOpen(false)}
        backups={state.backups || []}
        settings={state.settings}
        currentUser={currentUser}
        onRefreshState={refreshServerState}
      />

      {/* Global Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2.5 animate-bounce-subtle no-print">
          <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            <Check className="w-3.5 h-3.5" />
          </span>
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
