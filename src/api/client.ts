import { AppState, PropertySettings, Room } from '../types';

export async function fetchAppState(): Promise<AppState> {
  const res = await fetch('/api/state');
  if (!res.ok) throw new Error('Failed to fetch state');
  return res.json();
}

export async function updateSimulatedDate(simulatedDate: string): Promise<AppState> {
  const res = await fetch('/api/simulated-date', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ simulatedDate })
  });
  const data = await res.json();
  return data.state;
}

export async function updateSettings(settings: Partial<PropertySettings>): Promise<AppState> {
  const res = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  });
  const data = await res.json();
  return data.state;
}

export async function batchSetupRooms(rooms: Room[]): Promise<AppState> {
  const res = await fetch('/api/rooms/batch-setup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rooms })
  });
  const data = await res.json();
  return data.state;
}

export async function submitMoveIn(payload: any): Promise<AppState> {
  const res = await fetch('/api/rooms/move-in', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.state;
}

export async function submitReservation(payload: any): Promise<AppState> {
  const res = await fetch('/api/rooms/reserve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.state;
}

export async function cancelReservation(roomNumber: string): Promise<AppState> {
  const res = await fetch('/api/rooms/cancel-reservation', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomNumber })
  });
  const data = await res.json();
  return data.state;
}

export async function markMaintenanceDone(roomNumber: string): Promise<AppState> {
  const res = await fetch('/api/rooms/maintenance-done', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ roomNumber })
  });
  const data = await res.json();
  return data.state;
}

export async function commitBulkMeters(readings: any[]): Promise<AppState> {
  const res = await fetch('/api/meters/bulk-commit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ readings })
  });
  const data = await res.json();
  return data.state;
}

export async function updateInvoice(payload: any): Promise<AppState> {
  const res = await fetch('/api/invoices/update', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.state;
}

export async function recordPayment(payload: { invoiceId: string; amountSatang: number; method: string; slipNote: string }): Promise<AppState> {
  const res = await fetch('/api/payments', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.state;
}

export async function submitMoveOut(payload: any): Promise<{ state: AppState; netRefundSatang: number }> {
  const res = await fetch('/api/rooms/move-out', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function addExpense(payload: { title: string; category: string; amountSatang: number }): Promise<AppState> {
  const res = await fetch('/api/expenses', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  return data.state;
}

export async function deleteExpense(id: string): Promise<AppState> {
  const res = await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
  const data = await res.json();
  return data.state;
}

export async function testLineConnection(token?: string): Promise<{ success: boolean; botInfo?: any; error?: string }> {
  const res = await fetch('/api/line/test-connection', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token })
  });
  return res.json();
}

export async function sendLineNotification(invoiceId: string, targetUserId?: string): Promise<{ success: boolean; apiSent: boolean; apiError?: string; messageText: string; sentAt: string }> {
  const res = await fetch('/api/line/notify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ invoiceId, targetUserId })
  });
  return res.json();
}

export async function submitGoogleFormPayment(payload: any): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/webhooks/google-form/payment', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function manualUploadSlip(payload: any): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/reconcile/manual-upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function approveReconcile(submissionId: string, invoiceId?: string, note?: string): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/reconcile/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, invoiceId, note })
  });
  return res.json();
}

export async function rejectReconcile(submissionId: string, reason?: string): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/reconcile/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ submissionId, reason })
  });
  return res.json();
}

export async function submitRegistration(payload: any): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/registrations/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function approveRegistration(payload: any): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/registrations/approve', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  return res.json();
}

export async function rejectRegistration(registrationId: string, reason?: string): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/registrations/reject', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ registrationId, reason })
  });
  return res.json();
}

export async function resetToDayOne(): Promise<{ success: boolean; state: AppState; message: string }> {
  const res = await fetch('/api/reset-day-one', { method: 'POST' });
  return res.json();
}

export async function resetToDemo(): Promise<{ success: boolean; state: AppState; message: string }> {
  const res = await fetch('/api/reset-demo', { method: 'POST' });
  return res.json();
}

export async function fetchBackups(): Promise<{ backups: any[] }> {
  const res = await fetch('/api/backups');
  return res.json();
}

export async function createBackup(name?: string, tag?: 'DAY_ONE' | 'WEEKLY_AUTO' | 'MANUAL'): Promise<{ success: boolean; state: AppState }> {
  const res = await fetch('/api/backups/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, tag })
  });
  return res.json();
}

export async function recallBackup(snapshotId: string): Promise<{ success: boolean; state: AppState; message: string }> {
  const res = await fetch('/api/backups/recall', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ snapshotId })
  });
  return res.json();
}

export async function resetDatabase(): Promise<AppState> {
  const res = await fetch('/api/reset-day-one', { method: 'POST' });
  const data = await res.json();
  return data.state;
}

export async function restoreBackup(backupState: AppState): Promise<AppState> {
  const res = await fetch('/api/backup/restore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(backupState)
  });
  const data = await res.json();
  return data.state;
}
