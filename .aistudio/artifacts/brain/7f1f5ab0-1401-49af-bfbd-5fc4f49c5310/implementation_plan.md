# Taky Apartment ERP — LINE OA API, Google Form Slip Reconciliation & Day-1 System Plan

แผนงานพัฒนาระบบบริหารจัดการหอพัก Taky Apartment (15 ห้อง) เชื่อมต่อ LINE Official Account Messaging API ส่งบิลตรง, ระบบรับยอดชำระและตรวจสลิปจาก Google Form เพื่อกระทบยอดธนาคาร (Bank Reconciliation), ระบบรับสมัครผู้เช่าใหม่และอนุมัติเข้าห้อง, คลังประวัติผู้เช่าย้ายออกถาวร, และการเริ่มต้นระบบเสมือนวันแรก (Day-1 State) พร้อมระบบสำรองและกู้คืนข้อมูลอัตโนมัติเฉพาะ Admin สูงสุด

---

### User Review & Critical Decisions

> [!IMPORTANT]
> **การตัดสินใจที่ได้รับการยืนยันจากผู้ใช้ (Confirmed Decisions):**
> 1. **Google Form Webhook & Slip Reconcile**: ใช้ระบบ Webhook / Apps Script ส่งเข้า API ของระบบอัตโนมัติ พร้อมรองรับการอัปโหลดหรือตรวจทานรูปภาพ Payslip บน Dashboard เพื่อกระทบยอดกับบัญชีธนาคาร
> 2. **LINE OA Messaging API**: จัดเก็บ `lineUserId` ในข้อมูลผู้เช่าเพื่อยิง Messaging API ตรงเข้าแชท LINE พร้อมปุ่มเปิดแชท LINE Direct Link
> 3. **Day-1 Clean Slate & Weekly Backup**: เริ่มต้นระบบด้วยห้องว่าง 15 ห้อง มิเตอร์เริ่มต้นที่ 0 และจัดทำระบบสำรองข้อมูลอัตโนมัติทุกสัปดาห์ พร้อมฟังก์ชันกู้คืนข้อมูล (Recall/Restore) ที่อนุญาตเฉพาะ Admin (`p.ramajitti@gmail.com`) เท่านั้น

---

## 1. ภาพรวมและขอบเขตระบบ (Overview & Core Capabilities)

ระบบ Taky Apartment ERP จะได้รับการอัปเกรดให้รองรับวงจรการทำงานของหอพักครบวงจร:
1. **การส่งบิลผ่าน LINE OA Messaging API**: Admin กดส่งบิลตรงเข้ากระเป๋าเงิน LINE ของผู้เช่าผ่าน Channel Access Token พร้อมข้อความ Flex Message สวยงาม และปุ่มเปิดดูบิล/สแกน QR Code PromptPay
2. **ระบบรับแจ้งโอน & ตรวจสอบสลิป (Payment Reconcile Tray)**: 
   - รองรับ Webhook รับข้อมูลจากการตอบ Google Form พร้อม URL สลิป หรือไฟล์รูปภาพสลิปที่แนบมา
   - มีถาด "🔔 รอตรวจสอบยอดชำระ (Pending Reconcile)" บน Dashboard: แสดงเวลา, ห้อง, ยอดเงิน, รูปสลิปขยายดูได้ชัดเจน
   - ปุ่ม 1-Click "ยืนยันและตัดยอดบิล (Reconcile & Match)": ระบบสร้างใบเสร็จรับเงิน, ตัดยอดหนี้ในบิลอัตโนมัติ, ปรับสถานะห้องเป็นชำระแล้ว
3. **ระบบลงทะเบียนผู้เช่าใหม่ (Tenant Registration Queue)**:
   - ผู้เช่ากรอกข้อมูลผ่าน Form (หรือ Web Registration Link)
   - Dashboard แจ้งเตือนใบสมัครใหม่ พร้อมตรวจสอบสถานะห้องที่ระบุว่าว่างอยู่หรือไม่
   - Admin กดยืนยัน: นำข้อมูลผู้เช่าบันทึกเข้าห้องทันที สถานะห้องเปลี่ยนเป็น "มีผู้เช่า"
4. **คลังประวัติผู้เช่าย้ายออก (Move-Out Archive & Audit Ledger)**:
   - จัดเก็บข้อมูลผู้เช่าที่ย้ายออก, วันที่เข้าพัก-ย้ายออก, มิเตอร์ไฟฟ้าน้ำประปาสุดท้าย, ค่าปรับ/ค่าทำความสะอาด, ยอดหักเงินประกัน และหลักฐานการคืนเงิน เก็บประวัติถาวรใน Firebase Firestore และเซิร์ฟเวอร์
   - เมนู "ประวัติผู้เช่า (Tenant Archive)" ค้นหาและดูย้อนหลังได้ตลอดเวลา
5. **Day-1 Reset & Weekly Automated Backup Engine**:
   - ระบบพร้อมปุ่ม "เริ่มต้นระบบวันแรก (Day-1 Clean Slate)" ล้างข้อมูลจำลองเดิม ให้เป็น 15 ห้องว่าง มิเตอร์ 0 รอรับผู้เช่าจริง
   - ระบบตั้งเวลา Backup อัตโนมัติทุกสัปดาห์ (Weekly Snapshots)
   - หน้าต่าง Recall Backup เฉพาะ `p.ramajitti@gmail.com` เพื่อกู้คืนฐานข้อมูลหากเกิดข้อผิดพลาด

---

## 2. ประสบการณ์ผู้ใช้และการออกแบบหน้าจอ (User Experience & UI Design)

### โครงสร้างและการจัดวางหน้าจอ (Layout & Visuals)
- **สไตล์ดีไซน์**: Professional Real Estate SaaS & Financial Ledger ตามหลัก `frontend-design` ไร้ static pill slop, ใช้ tabular numbers (`font-mono`) สำหรับตัวเลขการเงินและมิเตอร์
- **Dashboard Action Center**:
  - แถบแจ้งเตือนด่วน 2 แถบด้านบน:
    1. `🔔 การลงทะเบียนใหม่ (Pending Registrations)` แสดงจำนวนคนรออนุมัติเข้าห้อง
    2. `💳 รอตรวจสอบสลิปโอนเงิน (Pending Slips Reconcile)` แสดงจำนวนสลิปที่ส่งมาจาก Google Form
  - การ์ดสถิติ 4 ตัวหลัก (รายรับสุทธิ, ค้างชำระ, อัตราการเข้าพัก, สลิปรอตรวจ)
- **Slip Reconcile Modal / Drawer**:
  - แสดงภาพสลิปโอนเงินฝั่งซ้าย (พร้อมปุ่ม Zoom In / หมุนภาพ)
  - ข้อมูลที่ผู้เช่ากรอกฝั่งขวา (ห้อง, วันที่-เวลาโอน, ยอดเงิน, บัญชีปลายทาง)
  - เปรียบเทียบกับยอดหนี้คงค้างของห้องนั้นทันที
  - ปุ่ม `[✓ อนุมัติตัดยอดบิล]` และ `[✕ ปฏิเสธสลิป / แจ้งเตือนสลิปไม่ถูกต้อง]`
- **LINE OA Direct Messaging**:
  - ในหน้ารายละเอียดบิล มีปุ่ม `[ยิงเข้า LINE ผู้เช่าทันที]` (ผ่าน Messaging API) พร้อมสถานะส่งสำเร็จ/ล้มเหลว
  - รองรับ Fallback ด้วยปุ่ม `[เปิดแชท LINE (Web Link)]` ส่งข้อความพร้อมสรุปยอด

---

## 3. สถาปัตยกรรมระบบและโครงสร้างข้อมูล (Technical Architecture & Data Strategy)

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Taky Apartment ERP Platform                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
           ┌────────────────────────┴────────────────────────┐
           ▼                                                 ▼
┌──────────────────────────────┐              ┌──────────────────────────────┐
│       React UI Client        │              │     Express Full-Stack API   │
│  - Executive Dashboard       │              │  - /api/webhooks/google-form │
│  - Slip Reconcile Drawer     │◄──HTTP/REST─►│  - /api/line/push-invoice    │
│  - Registration Reviewer     │              │  - /api/tenants/archive      │
│  - 15-Room Visual Board      │              │  - /api/backup/schedule      │
│  - Invoice & Meter Center    │              │  - /api/backup/restore       │
└──────────────┬───────────────┘              └──────────────┬───────────────┘
               │                                             │
               │                                             ▼
               │                              ┌──────────────────────────────┐
               │                              │ Local Snapshot Storage       │
               │                              │ data/dormitory_state.json    │
               │                              │ data/backups/weekly_*.json   │
               │                              └──────────────────────────────┘
               ▼
┌────────────────────────────────────────────────────────────────────────┐
│ Firebase Firestore & Cloud Auth (Project: myapartment-5903f)           │
│ Collections: rooms, invoices, payments, form_submissions,              │
│              registrations, move_out_archives, backups, settings       │
│ Security Rule: allow write: if request.auth.token.email ==             │
│                             'p.ramajitti@gmail.com'                    │
└────────────────────────────────────────────────────────────────────────┘
```

### เอนทิตีข้อมูลใหม่และขยายเพิ่มเติม (Data Schema Updates)

1. **`FormSubmission` (แจ้งชำระเงินจาก Google Form)**:
   - `id`: string
   - `roomNumber`: string
   - `tenantName`: string
   - `amountSatang`: number
   - `paymentDate`: string
   - `paymentTime`: string
   - `slipUrl`: string (DataURL หรือ Image URL จาก Google Drive/Form)
   - `status`: `'pending' | 'reconciled' | 'rejected'`
   - `matchedInvoiceId`?: string
   - `reconciledAt`?: string
   - `reconciledBy`?: string

2. **`TenantRegistration` (คำขอลงทะเบียนเข้าพักใหม่)**:
   - `id`: string
   - `requestedRoomNumber`: string
   - `tenantName`: string
   - `phone`: string
   - `lineUserId`?: string
   - `idCardNumber`?: string
   - `vehicleType`: `'none' | 'car' | 'motorcycle'`
   - `licensePlate`?: string
   - `plannedMoveInDate`: string
   - `status`: `'pending' | 'approved' | 'rejected'`
   - `depositPaidSatang`: number

3. **`MoveOutArchive` (ประวัติผู้เช่าย้ายออกถาวร)**:
   - `id`: string
   - `roomNumber`: string
   - `tenantName`: string
   - `phone`: string
   - `lineUserId`?: string
   - `moveInDate`: string
   - `moveOutDate`: string
   - `finalElectricityReading`: number
   - `finalWaterReading`: number
   - `depositReturnedSatang`: number
   - `deductions`: Array<{ reason: string; amountSatang: number }>
   - `settlementSummary`: string
   - `createdAt`: string

4. **`BackupSnapshot` (ระบบสำรองและกู้คืนข้อมูล)**:
   - `id`: string
   - `timestamp`: string
   - `tag`: `'weekly_auto' | 'manual_admin' | 'day1_baseline'`
   - `roomsCount`: number
   - `invoicesCount`: number
   - `stateData`: object

5. **`LineOASettings`**:
   - `channelAccessToken`: string
   - `channelSecret`: string
   - `lineOAId`: string (e.g. `@takyapartment`)
   - `testPushSuccess`: boolean

---

## 4. แผนการดำเนินงานเป็นขั้นตอน (Implementation Phases)

### Phase 1: การจัดการสถานะข้อมูลเริ่มต้น (Day-1 State) & ระบบ Backup/Recall
- สร้างปุ่มเริ่มต้นระบบวันแรก (Day-1 Reset) รีเซ็ตห้องทั้ง 15 ห้องเป็นห้องว่าง มิเตอร์ 0
- บันทึก Snapshot Baseline วันแรกไว้ในระบบ
- เพิ่มระบบบันทึก Backup อัตโนมัติทุกสัปดาห์ (Weekly Snapshot) และโมดอลเรียกคืนข้อมูล (Recall) เฉพาะ Admin

### Phase 2: ระบบ Webhook & Reconcile สลิปจาก Google Form
- พัฒนา API Endpoint `/api/webhooks/google-form/payment` สำหรับรับ JSON จาก Google Apps Script
- เพิ่มแท็บและโมดอล "Reconcile Desk": ดูสลิป, ตรวจสอบยอด, กดยืนยันตัดยอดบิลอัตโนมัติ
- รองรับปุ่ม "จำลองการส่งจาก Google Form" และ "อัปโหลดสลิปตรวจทานด้วยตนเอง" เพื่อความสะดวกในการใช้งาน

### Phase 3: ระบบแจ้งเตือนและอนุมัติการลงทะเบียนผู้เช่า (Registration Queue)
- พัฒนา API Endpoint `/api/webhooks/google-form/register` และหน้าฟอร์มลงทะเบียนสำหรับผู้เช่า
- เพิ่มแบนเนอร์แจ้งเตือนการลงทะเบียนบน Dashboard
- แสดงข้อมูลเปรียบเทียบกับห้องว่าง หากห้องว่าง Admin กดยืนยันแล้วระบบจะ Move-in อัตโนมัติ

### Phase 4: LINE OA Messaging API Direct Push
- ติดตั้ง Endpoint `/api/line/push-invoice` บนเซิร์ฟเวอร์ Express เพื่อยิง LINE Messaging API Push Message
- เชื่อมต่อ `lineUserId` ของผู้เช่าแต่ละห้อง
- ออกแบบการ์ด Flex Message ภาษาไทย แสดงรายละเอียดบิลและลิงก์สแกนจ่ายเงิน

### Phase 5: คลังประวัติผู้เช่าย้ายออก (Move-Out Archive Ledger)
- อัปเดตขั้นตอน Move-out เมื่อคืนเงินประกัน ให้บันทึกประวัติลง `move_out_archives` อย่างครบถ้วน
- เพิ่มหน้าแท็บ "คลังประวัติผู้เช่า (Tenant Archive)" ให้ Admin ตรวจสอบย้อนหลังได้ทุกเมื่อ
- ตรวจสอบความถูกต้องผ่าน `compile_applet` และ `lint_applet`
