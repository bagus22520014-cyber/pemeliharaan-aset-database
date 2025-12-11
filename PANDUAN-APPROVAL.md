# Panduan Sistem Approval

## Ringkasan Perubahan

Sistem approval telah ditambahkan ke semua tabel transaksi:

- `aset`
- `perbaikan`
- `rusak`
- `dipinjam`
- `dijual`
- `mutasi`

### Kolom Baru

Setiap tabel sekarang memiliki:

- `approval_status` ENUM('diajukan', 'disetujui', 'ditolak') DEFAULT 'diajukan'
- `approval_date` DATETIME (diisi saat approval/reject)

### Notifikasi Approval

- Kolom notifikasi untuk aset sekarang menggunakan `AsetId` (bukan `related_aset_id`).
- Semua notifikasi approval yang terkait aset akan menyimpan `AsetId` sebagai referensi utama.
- Pastikan migrasi dan backend sudah menggunakan field ini.

### Alur Kerja Approval

#### 1. User Biasa Membuat/Edit Data

- Status otomatis: `diajukan`
- Admin menerima notifikasi dengan tipe `approval`
- Data menunggu persetujuan admin

#### 2. Admin Membuat/Edit Data

- Status otomatis: `disetujui`
- Approval date diisi saat pembuatan
- Tidak perlu review tambahan

#### 3. Admin Review & Approve/Reject

- Admin dapat melihat pending approvals
- Admin dapat approve atau reject
- Submitter menerima notifikasi hasil review

---

## Endpoint Baru

### 1. GET `/approval/pending`

**Deskripsi**: Melihat semua pengajuan yang menunggu persetujuan (admin only)

**Headers**:

```
x-role: admin
x-username: admin
x-beban: MLM
```

**Response**:

```json
{
  "total": 5,
  "approvals": [
    {
      "tabel_ref": "aset",
      "id": 1,
      "AsetId": "0001/MLM/2024",
      "NamaAset": "Komputer Desktop",
      "approval_status": "diajukan",
      "approval_date": null
    },
    {
      "tabel_ref": "perbaikan",
      "id": 3,
      "aset_id": 5,
      "tanggal_perbaikan": "2024-01-15",
      "approval_status": "diajukan"
    }
  ]
}
```

### 2. GET `/approval/:tabelRef/:recordId`

**Deskripsi**: Melihat detail pengajuan untuk review (admin only)

**Parameters**:

- `tabelRef`: nama tabel (`aset`, `perbaikan`, `rusak`, `dipinjam`, `dijual`, `mutasi`)
- `recordId`: ID record dalam tabel tersebut

**Example**: `GET /approval/perbaikan/5`

**Headers**:

```
x-role: admin
x-username: admin
```

**Response**:

```json
{
  "tabel_ref": "perbaikan",
  "record": {
    "id": 5,
    "aset_id": 12,
    "AsetId": "0008/SRG-NET/2019",
    "NamaAset": "Router Mikrotik",
    "tanggal_perbaikan": "2024-01-15",
    "deskripsi": "Ganti power supply",
    "biaya": 500000,
    "teknisi": "Teknisi A",
    "beban_kode": "SRG-NET",
    "created_by": "user1",
    "approval_status": "diajukan"
  }
}
```

### 3. POST `/approval/:tabelRef/:recordId/:action`

**Deskripsi**: Approve atau reject pengajuan (admin only)

**Parameters**:

- `tabelRef`: nama tabel
- `recordId`: ID record
- `action`: `approve` atau `reject`

**Body (optional)**:

```json
{
  "alasan": "Biaya terlalu tinggi, perlu review ulang"
}
```

**Example**: `POST /approval/perbaikan/5/approve`

**Headers**:

```
x-role: admin
x-username: admin
```

**Response (Approve)**:

```json
{
  "message": "Pengajuan perbaikan berhasil disetujui",
  "tabel_ref": "perbaikan",
  "record_id": 5,
  "status": "disetujui",
  "alasan": null
}
```

**Response (Reject)**:

```json
{
  "message": "Pengajuan perbaikan berhasil ditolak",
  "tabel_ref": "perbaikan",
  "record_id": 5,
  "status": "ditolak",
  "alasan": "Biaya terlalu tinggi, perlu review ulang"
}
```

---

## Notifikasi

### Notifikasi untuk Admin

Ketika user mengajukan transaksi baru:

```json
{
  "id": 15,
  "user_id": 1,
  "tipe": "approval",
  "judul": "Persetujuan Diperlukan",
  "pesan": "User user1 mengajukan perbaikan untuk aset 0008/SRG-NET/2019: Ganti power supply",
  "link": null,
  "tabel_ref": "perbaikan",
  "record_id": 5,
  "dibaca": false,
  "waktu_dibuat": "2024-01-15T10:30:00"
}
```

### Notifikasi untuk User (Submitter)

Ketika admin approve/reject:

**Approved**:

```json
{
  "tipe": "success",
  "judul": "Pengajuan Disetujui",
  "pesan": "Pengajuan perbaikan untuk aset 0008/SRG-NET/2019 telah disetujui"
}
```

**Rejected**:

```json
{
  "tipe": "error",
  "judul": "Pengajuan Ditolak",
  "pesan": "Pengajuan perbaikan untuk aset 0008/SRG-NET/2019 telah ditolak. Alasan: Biaya terlalu tinggi, perlu review ulang"
}
```

---

## Contoh Penggunaan

### Scenario 1: User Mengajukan Perbaikan

**1. User membuat perbaikan**:

```bash
curl -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -H "x-role: user" \
  -H "x-username: user1" \
  -H "x-beban: SRG-NET" \
  -d '{
    "AsetId": "0008/SRG-NET/2019",
    "tanggal_perbaikan": "2024-01-15",
    "deskripsi": "Ganti power supply",
    "biaya": 500000,
    "teknisi": "Teknisi A"
  }'
```

**Response**:

```json
{
  "message": "Perbaikan ditambahkan",
  "perbaikan": {
    "id": 5,
    "aset_id": 12,
    "AsetId": "0008/SRG-NET/2019",
    "tanggal_perbaikan": "2024-01-15",
    "deskripsi": "Ganti power supply",
    "biaya": 500000
  }
}
```

**Note**: `approval_status` = `diajukan`, admin mendapat notifikasi

**2. Admin melihat pending approvals**:

```bash
curl http://localhost:4000/approval/pending \
  -H "x-role: admin" \
  -H "x-username: admin"
```

**3. Admin melihat detail**:

```bash
curl http://localhost:4000/approval/perbaikan/5 \
  -H "x-role: admin" \
  -H "x-username: admin"
```

**4. Admin approve**:

```bash
curl -X POST http://localhost:4000/approval/perbaikan/5/approve \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin"
```

**5. User menerima notifikasi approval**:
User dapat mengecek notifikasi di `/notification`

### Scenario 2: Admin Membuat Perbaikan

```bash
curl -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -H "x-beban: SRG-NET" \
  -d '{
    "AsetId": "0008/SRG-NET/2019",
    "tanggal_perbaikan": "2024-01-15",
    "deskripsi": "Update firmware",
    "biaya": 0,
    "teknisi": "Admin"
  }'
```

**Note**: `approval_status` = `disetujui` otomatis, tidak perlu review

### Scenario 3: Admin Reject dengan Alasan

```bash
curl -X POST http://localhost:4000/approval/perbaikan/5/reject \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -d '{
    "alasan": "Biaya terlalu tinggi. Harap cari vendor lain atau nego harga"
  }'
```

User akan menerima notifikasi reject dengan alasan tersebut.

---

## Riwayat Approval

Semua approval action dicatat di tabel `riwayat` dengan:

- `jenis_aksi`: `approval_disetujui` atau `approval_ditolak`
- `perubahan`: JSON berisi approval_action, alasan, timestamp
- `tabel_ref`: tabel yang di-approve
- `record_id`: ID record yang di-approve

Catatan implementasi:

- Approval actions sekarang digabungkan (merged) dengan entry riwayat sebelumnya ketika memungkinkan. Jika ada riwayat terakhir untuk record yang sama, informasi approval akan ditambahkan ke objek `perubahan` sebagai array `approvals` sehingga seluruh riwayat untuk satu transaksi tetap terkumpul dalam satu jejak audit.
- Jika tidak ada riwayat sebelumnya, action approval akan membuat entry riwayat baru seperti sebelumnya.

**Query riwayat approval**:

```bash
curl http://localhost:4000/riwayat?jenis_aksi=approval \
  -H "x-role: admin" \
  -H "x-username: admin"
```

---

## Testing dengan Cookie

Jika menggunakan cookie authentication (dari `/user/login`):

**1. Login sebagai user**:

```bash
curl -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"user1","password":"User#1234"}' \
  -c user-cookies.txt
```

**2. Buat pengajuan**:

```bash
curl -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -b user-cookies.txt \
  -d '{...}'
```

**3. Login sebagai admin**:

```bash
curl -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  -c admin-cookies.txt
```

**4. Review dan approve**:

```bash
curl http://localhost:4000/approval/pending -b admin-cookies.txt

curl -X POST http://localhost:4000/approval/perbaikan/5/approve \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt
```

---

## Catatan Penting

1. **Semua tabel transaksi** sudah mendukung approval workflow
2. **Status default** untuk user: `diajukan`, untuk admin: `disetujui`
3. **Notifikasi** dikirim ke semua admin saat user membuat pengajuan
4. **Riwayat lengkap** dicatat untuk audit trail
5. **Alasan reject** opsional tetapi sangat disarankan untuk komunikasi yang jelas
6. **Filter beban** tetap berlaku untuk user dalam melihat data

## Migration

Jika database sudah ada, jalankan migration:

```bash
# Add approval columns to aset table
node scripts/addApprovalToAset.js

# Update notification table schema
node scripts/updateNotificationTable.js

# Migrate notification table: related_aset_id -> AsetId
node scripts/migrateNotificationRelatedAsetId.js
```

Semua script migration sudah tersedia dan aman dijalankan multiple kali (idempotent).

---

## Testing & Verification

### Test 1: User Membuat Aset → Notifikasi Admin

```powershell
# 1. User membuat aset
$userH = @{ 'x-role' = 'user'; 'x-username' = 'user1'; 'x-beban' = 'MLG-NET' }
$asetBody = @{
  AsetId = "TEST-1234/MLG-NET/2025"
  NamaAset = "Test Laptop"
  Grup = "KOMPUTER"
  Beban = "MLG-NET"
  NilaiAset = 7500000
  TglPembelian = "2025-12-10"
} | ConvertTo-Json

$result = Invoke-RestMethod -Uri 'http://localhost:4000/aset' -Method POST `
  -Body $asetBody -ContentType 'application/json' -Headers $userH

# Result: approval_status = "diajukan"

# 2. Admin cek notifikasi
$adminH = @{ 'x-role' = 'admin'; 'x-username' = 'admin' }
$notif = Invoke-RestMethod -Uri 'http://localhost:4000/notification?dibaca=false' `
  -Headers $adminH

# Expected result:
# - Total: 1 notifikasi baru
# - Tipe: "approval"
# - Judul: "Persetujuan Diperlukan"
# - Pesan: "User user1 mengajukan aset baru: Test Laptop (TEST-1234/MLG-NET/2025)"
# - AsetId: "TEST-1234/MLG-NET/2025"
# - tabel_ref: "aset"
# - record_id: [ID dari aset yang baru dibuat]
```

**✅ Hasil Test**: Notifikasi approval berhasil dikirim ke admin saat user membuat aset baru.

---

### Test X: Penolakan Tidak Mengubah StatusAset (rusak/perbaikan/dipinjam/dijual)

Verifikasi bahwa ketika admin menolak pengajuan, `StatusAset` pada tabel `aset` tidak berubah.

Contoh PowerShell:

```powershell
$userH = @{ 'x-role' = 'user'; 'x-username' = 'user1'; 'x-beban' = 'MLG-NET' }
$adminH = @{ 'x-role' = 'admin'; 'x-username' = 'admin' }

# 1. Buat pengajuan (mis. perbaikan) sebagai user
$body = @{ AsetId = 'TEST-1234/MLG-NET/2025'; tanggal_perbaikan = (Get-Date).ToString('yyyy-MM-dd'); deskripsi = 'Test' } | ConvertTo-Json
$res = Invoke-RestMethod -Uri 'http://localhost:4000/perbaikan' -Method POST -Headers $userH -Body $body -ContentType 'application/json'
$id = $res.perbaikan.id

# 2. Catat StatusAset sebelum review
$before = (Invoke-RestMethod -Uri 'http://localhost:4000/aset' -Headers $adminH | Where-Object { $_.AsetId -eq 'TEST-1234/MLG-NET/2025' }).StatusAset

# 3. Admin reject
Invoke-RestMethod -Uri "http://localhost:4000/approval/perbaikan/$id/reject" -Method POST -Headers $adminH -Body '{}' -ContentType 'application/json'

# 4. Pastikan StatusAset tetap sama
$after = (Invoke-RestMethod -Uri 'http://localhost:4000/aset' -Headers $adminH | Where-Object { $_.AsetId -eq 'TEST-1234/MLG-NET/2025' }).StatusAset
Write-Host "Before: $before, After: $after"
```

Hasil yang diharapkan: `Before` sama dengan `After` (tidak berubah).

## Implementasi (detail teknis)

- Riwayat approval kini diintegrasikan ke dalam tabel `riwayat` yang sama dengan entry transaksi lain. Ketika admin melakukan approve/reject, server akan:

  - Mencari entry `riwayat` terakhir untuk transaksi tersebut (mencocokkan `tabel_ref`+`record_id` atau `aset_id`), preferensi diberikan ke entry bertipe `input`.
  - Jika ditemukan, informasi approval ditambahkan ke objek `perubahan` sebagai array `approvals` (menyimpan action, user_id, role, alasan, dan timestamp).
  - Jika tidak ditemukan atau terjadi error saat merge, sistem membuat entry `riwayat` baru dengan `jenis_aksi` `approval_disetujui` atau `approval_ditolak` (fallback behavior).

- Alasan perubahan: menyimpan seluruh jejak audit untuk satu transaksi dalam satu record `riwayat` membuat histori lebih mudah dibaca dan mengurangi kebingungan pada timeline.

- Implementasi juga menangani masalah kolasi (collation) yang muncul saat melakukan UNION across tables: `getPendingApprovals()` sekarang menjalankan query per-tabel dan menggabungkan hasil di sisi aplikasi untuk menghindari error "Illegal mix of collations for operation 'UNION'" pada beberapa instalasi database.

## Cara Verifikasi Merge Riwayat

1. Buat aset sebagai user (lihat contoh `Testing & Verification`).
2. Sebagai admin, approve aset tersebut (`POST /approval/aset/:id/approve`).
3. Cek riwayat untuk aset tersebut: `GET /riwayat?aset_id=<id>` atau `GET /riwayat/aset/<AsetId>`.
   - Jika merge berhasil, Anda akan melihat satu entry `jenis_aksi: input` diikuti oleh `perubahan.approvals` yang berisi objek approval.
   - Jika merge tidak mungkin, akan ada entry `approval_disetujui` terpisah.

Contoh cepat (PowerShell):

```powershell
#$user membuat aset (lihat Testing & Verification)
#$admin approve
Invoke-RestMethod -Uri 'http://localhost:4000/approval/aset/52/approve' -Method POST -Headers @{ 'x-role'='admin'; 'x-username'='admin' } -ContentType 'application/json' -Body '{}'

#cek riwayat
Invoke-RestMethod -Uri 'http://localhost:4000/riwayat?aset_id=52' -Headers @{ 'x-role'='admin'; 'x-username'='admin' }
```

## Rekomendasi Developer

- Pastikan semua pemanggilan `logRiwayat()` di seluruh `routes/*.js` menyertakan `record_id` ketika tersedia (mis. `logRiwayat(..., 'aset', result.insertId)`) — ini meningkatkan kemungkinan approval akan digabungkan ke riwayat input asli.
- Jika ingin selalu memisahkan approval sebagai entri sendiri (tidak melakukan merge), ubah `logApprovalAction()` untuk selalu insert baru dan nonaktifkan logic merge.
- Jika database Anda menggunakan kolasi heterogen, pertimbangkan menyamakan kolasi teks atau terus menggunakan strategi query terpisah (saat ini digunakan) untuk `getPendingApprovals()`.

- **Pastikan create handlers tidak mengubah `StatusAset` untuk pengajuan oleh user**: perbaiki/cek `routes/perbaikan.js`, `routes/rusak.js`, `routes/dipinjam.js`, `routes/dijual.js` agar hanya melakukan `UPDATE aset SET StatusAset = ...` ketika record dibuat oleh admin (`approval_status === 'disetujui'`) atau, lebih disarankan, lakukan semua perubahan `StatusAset` hanya dari `routes/approval.js` saat admin menekan `approve`.

## Script & Commands

- Jalankan migration yang relevan:

```bash
node scripts/addApprovalToAset.js
node scripts/updateNotificationTable.js
node scripts/migrateNotificationRelatedAsetId.js
```

### Menambahkan informasi "disetujui/ditolak oleh"

Untuk menyimpan siapa yang menyetujui/menolak, tambahkan kolom approver ke tabel transaksi dengan menjalankan skrip migrasi baru:

```bash
node scripts/addApprovalByColumns.js
```

Kolom yang ditambahkan pada setiap tabel transaksi: `approval_by_user_id`, `approval_by_username`, `approval_by_role`.

Setelah migrasi dijalankan, proses approval akan menyimpan approver ke kolom tersebut dan juga menyertakan `oleh_username` di dalam `riwayat.perubahan.approvals`.

Jika Anda juga ingin menyimpan approver di tabel `notification` (agar payload notifikasi berisi field terstruktur), jalankan migrasi berikut:

```bash
node scripts/addNotificationApproverColumns.js
```

Kolom yang ditambahkan pada tabel `notification`: `approver_user_id`, `approver_username`, `approver_role`.

---

## Perubahan Kode (ringkasan)

Perubahan berikut sudah diterapkan di repo agar approval menyimpan siapa yang menyetujui/menolak dan menampilkan informasi itu ke pelapor:

- `routes/middleware/approval.js`

  - `updateApprovalStatus()` sekarang mengisi `approval_by_user_id`, `approval_by_username`, `approval_by_role` pada tabel transaksi saat approval.
  - `logApprovalAction()` menambahkan `oleh_username` ke objek approval yang disimpan di `riwayat.perubahan.approvals` saat merge.
  - `notifySubmitterOfDecision()` menyimpan approver ke tabel `notification` (fields: `approver_user_id`, `approver_username`, `approver_role`) dan menambahkan nama approver ke pesan.

- `routes/approval.js`

  - Alur approve diubah untuk memperoleh admin info (id/role/username) terlebih dahulu, lalu menyimpan approver ke tabel transaksi, merge ke `riwayat`, dan kirim notifikasi yang menyertakan approver.

- `routes/notification.js`

  - Mapper API sekarang mengembalikan `approver_user_id`, `approver_username`, `approver_role` bila tersedia.

- `routes/aset.js`, `routes/perbaikan.js`, `routes/rusak.js`, `routes/dipinjam.js`, `routes/dijual.js`, `routes/mutasi.js`
  - Semua route transaction sudah menggunakan pola `logRiwayat()` yang menerima `record_id` (perubahan dilakukan pada `aset.js` earlier); pastikan setiap `logRiwayat()` call menyertakan `recordId` ketika record dibuat.

Jika Anda ingin daftar patch/commit yang lebih spesifik, saya bisa membuat ringkasan patch per file.

## Contoh Output (setelah approve)

- Contoh `riwayat` (merged input + approval):

```json
{
  "id": 108,
  "jenis_aksi": "input",
  "user_id": 54,
  "username": "user1",
  "role": "user",
  "aset_id": 58,
  "AsetId": "TEST-APPROVE-4149/MLG-NET/2025",
  "tabel_ref": "aset",
  "record_id": 58,
  "perubahan": {
    "approvals": [
      {
        "approval_action": "disetujui",
        "oleh_user_id": 38,
        "oleh_username": "admin",
        "oleh_role": "admin",
        "timestamp": "2025-12-10T17:03:05.514Z"
      }
    ]
  }
}
```

- Contoh notifikasi untuk submitter (API `GET /notification`):

```json
{
  "id": 45,
  "user_id": 54,
  "tipe": "success",
  "judul": "Pengajuan Disetujui",
  "pesan": "Pengajuan aset untuk aset TEST-APPROVE-4149/MLG-NET/2025 telah disetujui oleh admin",
  "tabel_ref": "aset",
  "record_id": 58,
  "AsetId": "TEST-APPROVE-4149/MLG-NET/2025",
  "approver_user_id": 38,
  "approver_username": "admin",
  "approver_role": "admin",
  "dibaca": false,
  "waktu_dibuat": "2025-12-10T17:03:05Z"
}
```

## Quick Verification Steps

1. Jalankan migration kolom approver (jika belum):

```powershell
node scripts/addApprovalByColumns.js
node scripts/addNotificationApproverColumns.js
```

2. Buat asset sebagai user, lalu approve sebagai admin (contoh singkat):

```powershell
# create asset as user
($userH = @{ 'x-role'='user'; 'x-username'='user1'; 'x-beban'='MLG-NET' })
# body … see Testing & Verification section
Invoke-RestMethod -Uri 'http://localhost:4000/aset' -Method POST -Body $asetBody -ContentType 'application/json' -Headers $userH

# approve as admin
($adminH = @{ 'x-role'='admin'; 'x-username'='admin' })
Invoke-RestMethod -Uri "http://localhost:4000/approval/aset/<newId>/approve" -Method POST -Headers $adminH -ContentType 'application/json' -Body '{}'

# check riwayat
Invoke-RestMethod -Uri "http://localhost:4000/riwayat?aset_id=<newId>" -Headers $adminH

# check notifications for submitter
Invoke-RestMethod -Uri 'http://localhost:4000/notification' -Headers @{ 'x-role'='user'; 'x-username'='user1' }
```

3. Pastikan riwayat mengandung `perubahan.approvals` dengan fields `oleh_username` dan `oleh_user_id`, serta notification mengandung `approver_username`.

---

Jika sudah oke, saya lanjutkan dan: (pick one)

- A: Scan semua `routes/*.js` dan open PR/patch untuk menambahkan `record_id` ke setiap `logRiwayat()` call yang belum menyertakan (safe update).
- B: Buat script otomatis test yang membuat + approve record untuk setiap tabel transaksi dan assert merge behavior.

Beritahu saya pilihan Anda.

- Test end-to-end (PowerShell example):

```powershell
# login user/admin (optional)
# create asset as user
# check admin notification
# admin approve
# check riwayat
```

---

Jika mau, saya bisa otomatis memperbarui semua pemanggilan `logRiwayat()` yang belum menambahkan `record_id` agar konsisten — mau saya lakukan itu sekarang?
