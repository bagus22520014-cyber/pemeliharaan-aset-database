# Panduan Penggunaan API - Pemeliharaan Aset Database

## Daftar Isi

- [Autentikasi](#autentikasi)
- [Endpoint User](#endpoint-user)
- [Endpoint Beban (Cost Center)](#endpoint-beban-cost-center)
- [Endpoint Departemen](#endpoint-departemen)
- [Endpoint Aset](#endpoint-aset)
- [Endpoint Perbaikan](#endpoint-perbaikan)
- [Endpoint Rusak](#endpoint-rusak)
- [Endpoint Dipinjam](#endpoint-dipinjam)
- [Endpoint Dijual](#endpoint-dijual)
- [Endpoint Mutasi](#endpoint-mutasi)
- [Endpoint Riwayat (Audit Log)](#endpoint-riwayat-audit-log)
- [Endpoint Notification](#endpoint-notification)
- [Skenario Penggunaan](#skenario-penggunaan)
- [Tips & Best Practices](#tips--best-practices)

---

## Autentikasi

API ini menggunakan 2 metode autentikasi:

- **Header**: `x-role` dan `x-beban`
- **Cookie**: `role` dan `beban`

### Role:

- `admin`: Akses penuh untuk semua operasi
- `user`: Akses terbatas, hanya data dengan Beban yang sesuai

### Contoh Login:

```powershell
# PowerShell
$response = curl -X POST http://localhost:4000/user/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin"}' `
  -c cookies.txt

# Setelah login, gunakan cookies
curl -b cookies.txt http://localhost:4000/aset
```

```bash
# Bash
curl -X POST http://localhost:4000/user/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  -c cookies.txt

# Setelah login
curl -b cookies.txt http://localhost:4000/aset
```

### Alternatif Menggunakan Header:

```powershell
curl -H "x-role: admin" http://localhost:4000/aset
```

---

## Endpoint User

### 1. Login

```
POST /user/login
POST /user
```

**Request Body:**

```json
{
  "username": "admin",
  "password": "admin"
}
```

**Response:**

```json
{
  "message": "Login successful",
  "user": {
    "username": "admin",
    "nama": "Administrator",
    "role": "admin",
    "beban": ["ALL"]
  }
}
```

_Cookie `role` dan `beban` akan di-set otomatis_

---

### 2. Get User Info (Admin Only)

```
GET /user
```

**Response:**

```json
{
  "username": "admin",
  "nama": "Administrator",
  "role": "admin",
  "beban": ["ALL"]
}
```

---

### 3. Get All Users (Admin Only)

```
GET /user/all
```

**Response:**

```json
[
  {
    "id": 1,
    "username": "admin",
    "nama": "Administrator",
    "role": "admin",
    "beban": ["ALL"]
  },
  {
    "id": 2,
    "username": "user1",
    "nama": "User Satu",
    "role": "user",
    "beban": ["MLM", "SRG-NET"]
  }
]
```

---

### 4. Create User (Admin Only)

```
POST /user/create
```

**Request Body:**

```json
{
  "username": "user_baru",
  "nama": "Nama User Baru",
  "password": "password123",
  "role": "user",
  "beban": ["MLM", "SRG-NET"]
}
```

**Response:**

```json
{
  "message": "User created successfully",
  "userId": 5
}
```

---

### 5. Update Password

```
PUT /user/:username/password
```

**Request Body:**

```json
{
  "oldPassword": "password_lama",
  "newPassword": "password_baru"
}
```

**Response:**

```json
{
  "message": "Password updated successfully"
}
```

---

### 6. Update User Beban (Admin Only)

```
PUT /user/:username/beban
```

**Request Body:**

```json
{
  "beban": ["MLM", "SRG-NET", "PKB-NET"]
}
```

**Response:**

```json
{
  "message": "User beban updated successfully"
}
```

---

## Endpoint Beban (Cost Center)

### 1. Get All Beban

```
GET /beban
```

**Query Parameters:**

- `aktif` (optional): `true` atau `false` untuk filter status

**Response:**

```json
[
  {
    "id": 1,
    "kode": "MLM",
    "aktif": true,
    "created_at": "2025-12-06T09:48:25.000Z",
    "updated_at": "2025-12-06T09:48:25.000Z"
  },
  {
    "id": 2,
    "kode": "SRG-NET",
    "aktif": true,
    "created_at": "2025-12-06T09:48:25.000Z",
    "updated_at": "2025-12-06T09:48:25.000Z"
  }
]
```

---

### 2. Get Beban by ID

```
GET /beban/:id
```

**Response:**

```json
{
  "id": 1,
  "kode": "MLM",
  "aktif": true,
  "created_at": "2025-12-06T09:48:25.000Z",
  "updated_at": "2025-12-06T09:48:25.000Z"
}
```

---

### 3. Get Beban by Kode

```
GET /beban/kode/:kode
```

**Example:**

```powershell
curl -H "x-role: admin" http://localhost:4000/beban/kode/MLM
```

---

### 4. Create Beban (Admin Only)

```
POST /beban
```

**Request Body:**

```json
{
  "kode": "JKT-NET",
  "aktif": true
}
```

**Response:**

```json
{
  "message": "Beban created successfully",
  "id": 34
}
```

---

### 5. Update Beban (Admin Only)

```
PUT /beban/:id
```

**Request Body:**

```json
{
  "kode": "JKT-NET",
  "aktif": false
}
```

**Response:**

```json
{
  "message": "Beban updated successfully"
}
```

---

### 6. Delete Beban (Admin Only)

```
DELETE /beban/:id
```

**Response:**

```json
{
  "message": "Beban deleted successfully"
}
```

---

## Endpoint Departemen

### 1. Get All Departemen

```
GET /departemen
```

**Query Parameters:**

- `aktif` (optional): `true` atau `false`

**Response:**

```json
[
  {
    "id": 1,
    "kode": "FAT",
    "nama": "FAT",
    "aktif": true,
    "created_at": "2025-12-06T09:51:16.000Z",
    "updated_at": "2025-12-06T09:51:16.000Z"
  },
  {
    "id": 2,
    "kode": "HRDGA",
    "nama": "HRD dan GA",
    "aktif": true,
    "created_at": "2025-12-06T09:51:16.000Z",
    "updated_at": "2025-12-06T09:51:16.000Z"
  }
]
```

---

### 2. Get Departemen by ID

```
GET /departemen/:id
```

---

### 3. Create Departemen (Admin Only)

```
POST /departemen
```

**Request Body:**

```json
{
  "kode": "FIN",
  "nama": "Finance & Accounting",
  "aktif": true
}
```

**Response:**

```json
{
  "message": "Departemen created successfully",
  "id": 7
}
```

---

### 4. Update Departemen (Admin Only)

```
PUT /departemen/:id
```

**Request Body:**

```json
{
  "kode": "FIN",
  "nama": "Finance Department",
  "aktif": true
}
```

---

### 5. Delete Departemen (Admin Only)

```
DELETE /departemen/:id
```

---

## Endpoint Aset

### 1. Get All Aset

```
GET /aset
```

**Query Parameters:**

- `StatusAset`: `aktif`, `rusak`, `dipinjam`, `dijual`
- `Grup`: filter by grup
- `page` & `limit`: untuk pagination

**Response:**

```json
[
  {
    "id": 100,
    "AsetId": "0010/MLM/2025",
    "AccurateId": "ACC010",
    "NamaAset": "UPS APC 1500VA",
    "Spesifikasi": "APC Smart-UPS 1500VA LCD",
    "Grup": "",
    "beban_id": 1,
    "beban": {
      "id": 1,
      "kode": "MLM",
      "aktif": true
    },
    "departemen_id": 1,
    "departemen": {
      "id": 1,
      "kode": "FAT",
      "nama": "FAT"
    },
    "AkunPerkiraan": "",
    "NilaiAset": 6000000,
    "TglPembelian": "2025-01-31",
    "MasaManfaat": 48,
    "StatusAset": "aktif",
    "Pengguna": null,
    "Lokasi": "Malang",
    "Keterangan": "UPS untuk server",
    "Gambar": null
  }
]
```

---

### 2. Create Aset

```
POST /aset
```

**Content-Type:** `multipart/form-data` (untuk upload gambar) atau `application/json`

**Form Data:**

```
AsetId: 0020/MLM/2025
AccurateId: ACC020
NamaAset: Router Mikrotik RB4011
Spesifikasi: Mikrotik RB4011 10 Port Gigabit
Grup: Network
beban_id: 1
departemen_id: 1
NilaiAset: 5000000
TglPembelian: 2025-02-01
MasaManfaat: 36
StatusAset: aktif
Lokasi: Malang
Keterangan: Router untuk backbone
Gambar: [file upload - optional]
```

**PowerShell Example:**

```powershell
curl -X POST http://localhost:4000/aset `
  -H "x-role: admin" `
  -F "AsetId=0020/MLM/2025" `
  -F "AccurateId=ACC020" `
  -F "NamaAset=Router Mikrotik RB4011" `
  -F "Spesifikasi=Mikrotik RB4011 10 Port Gigabit" `
  -F "Grup=Network" `
  -F "beban_id=1" `
  -F "departemen_id=1" `
  -F "NilaiAset=5000000" `
  -F "TglPembelian=2025-02-01" `
  -F "MasaManfaat=36" `
  -F "StatusAset=aktif" `
  -F "Lokasi=Malang" `
  -F "Keterangan=Router untuk backbone" `
  -F "Gambar=@./router.jpg"
```

**Response:**

```json
{
  "message": "Aset berhasil ditambahkan",
  "asset": {
    "id": 110,
    "AsetId": "0020/MLM/2025",
    "NamaAset": "Router Mikrotik RB4011"
  }
}
```

---

### 3. Get Aset by ID

```
GET /aset/:id
```

**Response:** (dengan data distribusi lokasi)

```json
{
  "id": 102,
  "AsetId": "0015/MLM/2025",
  "AccurateId": "ACC015",
  "NamaAset": "UPS APC 1500VA",
  "beban_id": 1,
  "beban": {
    "id": 1,
    "kode": "MLM",
    "aktif": true
  },
  "departemen_id": 1,
  "departemen": {
    "id": 1,
    "kode": "FAT",
    "nama": "FAT"
  }
}
```

---

### 4. Update Aset (Admin Only)

```
PUT /aset/:id
```

**Content-Type:** `multipart/form-data`

**Form Data:** (sama seperti POST, semua field optional)

---

### 5. Delete Aset (Admin Only)

```
DELETE /aset/:id
```

**Response:**

```json
{
  "message": "Asset deleted successfully"
}
```

---

### 6. Update Gambar Aset (Admin Only)

```
PUT /aset/:id/gambar
```

**Content-Type:** `multipart/form-data`

**Form Data:**

```
Gambar: [file upload]
```

**PowerShell Example:**

```powershell
curl -X PUT http://localhost:4000/aset/0020%2FMLM%2F2025/gambar `
  -H "x-role: admin" `
  -F "Gambar=@./router_new.jpg"
```

---

### 7. Update Keterangan Aset (Admin Only)

```
PUT /aset/:id/keterangan
```

**Request Body:**

```json
{
  "Keterangan": "UPS untuk server production dan backup"
}
```

---

## Endpoint Perbaikan

### 1. Get All Perbaikan

```
GET /perbaikan
```

**Query Parameters:**

- `StatusPerbaikan`: `pending`, `in_progress`, `completed`, `cancelled`

**Response:**

```json
[
  {
    "id": 1,
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "beban_kode": "MLM",
    "TglPerbaikan": "2025-02-10",
    "Kerusakan": "Baterai lemah",
    "Perbaikan": "Ganti baterai baru",
    "Biaya": 500000,
    "Teknisi": "John Doe",
    "StatusPerbaikan": "completed",
    "catatan": "Perbaikan selesai dalam 2 jam"
  }
]
```

---

### 2. Get Perbaikan by Aset ID

```
GET /perbaikan/aset/:asetId
```

---

### 3. Get Perbaikan by ID

```
GET /perbaikan/:id
```

---

### 4. Create Perbaikan

```
POST /perbaikan
```

**Request Body:**

```json
{
  "aset_id": 100,
  "TglPerbaikan": "2025-02-15",
  "Kerusakan": "Fan rusak",
  "Perbaikan": "Ganti fan cooling",
  "Biaya": 150000,
  "Teknisi": "Jane Smith",
  "StatusPerbaikan": "pending",
  "catatan": "Menunggu part"
}
```

---

### 5. Update Perbaikan (Admin Only)

```
PUT /perbaikan/:id
```

---

### 6. Delete Perbaikan (Admin Only)

```
DELETE /perbaikan/:id
```

---

## Endpoint Rusak

### 1. Get All Rusak

```
GET /rusak
```

**Response:**

```json
[
  {
    "id": 1,
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "beban_kode": "MLM",
    "TglRusak": "2025-02-20",
    "Kerusakan": "Kerusakan total - tidak bisa diperbaiki",
    "jumlah_rusak": 1,
    "StatusRusak": "permanent",
    "catatan": "Unit akan di-dispose"
  }
]
```

---

### 2. Get Rusak by Aset ID

```
GET /rusak/aset/:asetId
```

---

### 3. Get Rusak by ID

```
GET /rusak/:id
```

---

### 4. Create Rusak

```
POST /rusak
```

**Request Body:**

```json
{
  "aset_id": 100,
  "TglRusak": "2025-02-20",
  "Kerusakan": "Kerusakan total akibat petir",
  "jumlah_rusak": 1,
  "StatusRusak": "permanent",
  "catatan": "Unit tidak dapat diperbaiki"
}
```

---

### 5. Update Rusak (Admin Only)

```
PUT /rusak/:id
```

---

### 6. Delete Rusak (Admin Only)

```
DELETE /rusak/:id
```

---

## Endpoint Dipinjam

### 1. Get All Dipinjam

```
GET /dipinjam
```

**Query Parameters:**

- `StatusPeminjaman`: `dipinjam`, `dikembalikan`

**Response:**

```json
[
  {
    "id": 1,
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "beban_kode": "MLM",
    "Peminjam": "Budi Santoso",
    "TglPinjam": "2025-02-01",
    "TglKembali": null,
    "jumlah_dipinjam": 1,
    "StatusPeminjaman": "dipinjam",
    "catatan": "Untuk keperluan project A"
  }
]
```

---

### 2. Get Dipinjam by Aset ID

```
GET /dipinjam/aset/:asetId
```

---

### 3. Get Dipinjam by ID

```
GET /dipinjam/:id
```

---

### 4. Create Dipinjam

```
POST /dipinjam
```

**Request Body:**

```json
{
  "aset_id": 100,
  "Peminjam": "Ahmad Fauzi",
  "TglPinjam": "2025-02-15",
  "jumlah_dipinjam": 1,
  "StatusPeminjaman": "dipinjam",
  "catatan": "Project instalasi client"
}
```

---

### 5. Update Dipinjam (Admin Only)

```
PUT /dipinjam/:id
```

**Request Body (untuk mengembalikan):**

```json
{
  "TglKembali": "2025-02-20",
  "StatusPeminjaman": "dikembalikan",
  "catatan": "Dikembalikan dalam kondisi baik"
}
```

---

### 6. Delete Dipinjam (Admin Only)

```
DELETE /dipinjam/:id
```

---

## Endpoint Dijual

### 1. Get All Dijual

```
GET /dijual
```

**Response:**

```json
[
  {
    "id": 1,
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "beban_kode": "MLM",
    "TglDijual": "2025-03-01",
    "HargaJual": 800000,
    "Pembeli": "PT Maju Jaya",
    "jumlah_dijual": 1,
    "catatan": "Unit bekas, kondisi 80%"
  }
]
```

---

### 2. Get Dijual by Aset ID

```
GET /dijual/aset/:asetId
```

---

### 3. Get Dijual by ID

```
GET /dijual/:id
```

---

### 4. Create Dijual

```
POST /dijual
```

**Request Body:**

```json
{
  "aset_id": 100,
  "TglDijual": "2025-03-01",
  "HargaJual": 800000,
  "Pembeli": "PT Maju Jaya",
  "jumlah_dijual": 1,
  "catatan": "Dijual karena upgrade ke model baru"
}
```

---

### 5. Update Dijual (Admin Only)

```
PUT /dijual/:id
```

---

### 6. Delete Dijual (Admin Only)

```
DELETE /dijual/:id
```

---

## Endpoint Mutasi

### 1. Get All Mutasi

```
GET /mutasi
```

**Response:**

```json
[
  {
    "id": 1,
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "beban_kode": "MLM",
    "TglMutasi": "2025-03-15",
    "departemen_asal_id": 1,
    "departemen_asal_kode": "FAT",
    "departemen_asal_nama": "FAT",
    "departemen_tujuan_id": 2,
    "departemen_tujuan_kode": "HRDGA",
    "departemen_tujuan_nama": "HRD dan GA",
    "ruangan_asal": "Server Room Lt 2",
    "ruangan_tujuan": "Ruang GA Lt 1",
    "alasan": "Restrukturisasi departemen",
    "catatan": "Unit dalam kondisi baik"
  }
]
```

---

### 2. Get Mutasi by Aset ID

```
GET /mutasi/aset/:asetId
```

---

### 3. Get Mutasi by ID

```
GET /mutasi/:id
```

---

### 4. Create Mutasi

```
POST /mutasi
```

**Request Body:**

```json
{
  "aset_id": 100,
  "TglMutasi": "2025-03-15",
  "departemen_asal_id": 1,
  "departemen_tujuan_id": 2,
  "ruangan_asal": "Server Room Lt 2",
  "ruangan_tujuan": "Ruang GA Lt 1",
  "alasan": "Restrukturisasi departemen",
  "catatan": "Unit dalam kondisi baik"
}
```

**Response:**

```json
{
  "id": 1,
  "message": "Mutasi created successfully"
}
```

**Note:**

- `departemen_asal_id` dan `ruangan_asal` bersifat opsional - jika tidak diisi, akan otomatis diambil dari data aset saat ini (`aset.departemen_id` dan `aset.Lokasi`)
- `departemen_tujuan_id` bersifat opsional (nullable)
- `ruangan_asal` dan `ruangan_tujuan` untuk mencatat perpindahan ruangan detail
- Minimal salah satu dari perpindahan departemen atau ruangan harus diisi

---

### 5. Update Mutasi (Admin Only)

```
PUT /mutasi/:id
```

**Request Body:**

```json
{
  "TglMutasi": "2025-03-16",
  "departemen_tujuan_id": 3,
  "ruangan_tujuan": "Ruang IT Lt 1",
  "catatan": "Update lokasi tujuan"
}
```

---

### 6. Delete Mutasi (Admin Only)

```
DELETE /mutasi/:id
```

---

## Endpoint Riwayat (Audit Log)

### 1. Get All Riwayat

```
GET /riwayat
```

**Response:**

```json
[
  {
    "id": 2,
    "jenis_aksi": "input",
    "user_id": 38,
    "username": "admin",
    "role": "admin",
    "aset_id": 102,
    "AsetId": "0015/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "tabel_ref": "aset",
    "record_id": null,
    "perubahan": null,
    "created_at": "2025-12-06T10:10:15.000Z"
  },
  {
    "id": 1,
    "jenis_aksi": "input",
    "user_id": 38,
    "username": "admin",
    "role": "admin",
    "aset_id": 100,
    "AsetId": "0010/MLM/2025",
    "NamaAset": "UPS APC 1500VA",
    "tabel_ref": "aset",
    "record_id": null,
    "perubahan": null,
    "created_at": "2025-12-06T09:57:44.000Z"
  }
]
```

---

### 2. Get Riwayat by Aset ID

```
GET /riwayat/aset/:asetId
```

**Example:**

```powershell
curl -H "x-role: admin" http://localhost:4000/riwayat/aset/0015%2FMLM%2F2025
```

---

### 3. Get Riwayat by Username (Admin Only)

```
GET /riwayat/user/:username
```

**Example:**

```powershell
curl -H "x-role: admin" http://localhost:4000/riwayat/user/admin
```

---

## Endpoint Notification

### 1. Get All Notifications

```
GET /notification
```

**Query Parameters:**

- `is_read`: `true` atau `false`

**Response:**

```json
[
  {
    "id": 1,
    "user_id": 38,
    "beban_kode": "MLM",
    "message": "Aset 0015/MLM/2025 memerlukan perbaikan",
    "type": "perbaikan",
    "is_read": false,
    "created_at": "2025-12-06T11:00:00.000Z"
  }
]
```

---

### 2. Get Unread Count

```
GET /notification/unread-count
```

**Response:**

```json
{
  "unread_count": 5
}
```

---

### 3. Mark as Read

```
PUT /notification/:id/read
```

**Response:**

```json
{
  "message": "Notification marked as read"
}
```

---

### 4. Mark All as Read

```
PUT /notification/read-all
```

**Response:**

```json
{
  "message": "All notifications marked as read",
  "updated_count": 5
}
```

---

### 5. Delete Notification

```
DELETE /notification/:id
```

---

## Skenario Penggunaan

### Skenario 1: Setup Master Data (Admin)

```powershell
# 1. Login sebagai admin
$response = curl -X POST http://localhost:4000/user/login `
  -H "Content-Type: application/json" `
  -d '{"username":"admin","password":"admin"}' `
  -c cookies.txt

# 2. Buat Beban baru
curl -X POST http://localhost:4000/beban `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{"kode":"JKT-NET","aktif":true}'

# 3. Buat Departemen baru
curl -X POST http://localhost:4000/departemen `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{"kode":"IT","nama":"Information Technology","aktif":true}'

# 4. Buat user baru
curl -X POST http://localhost:4000/user/create `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{"username":"user_jkt","nama":"User Jakarta","password":"pass123","role":"user","beban":["JKT-NET"]}'
```

---

### Skenario 2: Input Aset Baru

```powershell
# Input aset baru
curl -X POST http://localhost:4000/aset `
  -b cookies.txt `
  -F "AsetId=0025/JKT-NET/2025" `
  -F "AccurateId=ACC025" `
  -F "NamaAset=Mikrotik RB4011" `
  -F "Spesifikasi=10 Port Gigabit" `
  -F "Grup=Network" `
  -F "beban_id=34" `
  -F "departemen_id=7" `
  -F "NilaiAset=50000000" `
  -F "TglPembelian=2025-02-01" `
  -F "MasaManfaat=36" `
  -F "StatusAset=aktif" `
  -F "Lokasi=Jakarta" `
  -F "Keterangan=Router backbone"
```

---

### Skenario 3: Workflow Perbaikan Aset

```powershell
# 1. Cek aset yang butuh perbaikan
curl -b cookies.txt http://localhost:4000/aset/0025%2FJKT-NET%2F2025

# 2. Buat record perbaikan
curl -X POST http://localhost:4000/perbaikan `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "aset_id": 105,
    "TglPerbaikan": "2025-02-10",
    "Kerusakan": "Port 8 mati",
    "Perbaikan": "Ganti port module",
    "Biaya": 500000,
    "Teknisi": "John Doe",
    "StatusPerbaikan": "pending"
  }'

# 3. Update status perbaikan (Admin)
curl -X PUT http://localhost:4000/perbaikan/1 `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "StatusPerbaikan": "completed",
    "catatan": "Perbaikan selesai, unit sudah ditest"
  }'

# 4. Cek riwayat perbaikan aset
curl -b cookies.txt http://localhost:4000/perbaikan/aset/0025%2FJKT-NET%2F2025
```

---

### Skenario 4: Peminjaman & Pengembalian Aset

```powershell
# 1. Record peminjaman aset
curl -X POST http://localhost:4000/dipinjam `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "aset_id": 105,
    "Peminjam": "Ahmad Fauzi - IT Support",
    "TglPinjam": "2025-02-15",
    "jumlah_dipinjam": 1,
    "StatusPeminjaman": "dipinjam",
    "catatan": "Untuk instalasi client baru"
  }'

# 2. Cek daftar aset yang sedang dipinjam
curl -b cookies.txt "http://localhost:4000/dipinjam?StatusPeminjaman=dipinjam"

# 3. Update pengembalian (Admin)
curl -X PUT http://localhost:4000/dipinjam/1 `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "TglKembali": "2025-02-20",
    "StatusPeminjaman": "dikembalikan",
    "catatan": "Dikembalikan kondisi baik"
  }'

# 4. Cek riwayat peminjaman
curl -b cookies.txt http://localhost:4000/dipinjam/aset/0025%2FJKT-NET%2F2025
```

---

### Skenario 5: Mutasi Aset (Pindah Departemen/Ruangan)

```powershell
# 1. Record mutasi aset - pindah departemen dan ruangan
curl -X POST http://localhost:4000/mutasi `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "aset_id": 105,
    "TglMutasi": "2025-03-15",
    "departemen_asal_id": 1,
    "departemen_tujuan_id": 2,
    "ruangan_asal": "Server Room Lt 2",
    "ruangan_tujuan": "Ruang GA Lt 1",
    "alasan": "Restrukturisasi departemen",
    "catatan": "Unit dipindahkan dalam kondisi baik"
  }'

# 2. Record mutasi aset - hanya pindah ruangan (dalam departemen yang sama)
curl -X POST http://localhost:4000/mutasi `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "aset_id": 105,
    "TglMutasi": "2025-04-01",
    "ruangan_asal": "Ruang GA Lt 1",
    "ruangan_tujuan": "Ruang Meeting Lt 2",
    "alasan": "Kebutuhan operasional",
    "catatan": "Perpindahan ruangan saja"
  }'

# 3. Cek riwayat mutasi aset tertentu
curl -b cookies.txt http://localhost:4000/mutasi/aset/0025%2FJKT-NET%2F2025

# 4. Cek semua mutasi
curl -b cookies.txt http://localhost:4000/mutasi

# 5. Update mutasi (Admin)
curl -X PUT http://localhost:4000/mutasi/1 `
  -b cookies.txt `
  -H "Content-Type: application/json" `
  -d '{
    "ruangan_tujuan": "Ruang IT Lt 1",
    "catatan": "Update lokasi tujuan final"
  }'
```

---

### Skenario 6: Audit & Monitoring (Admin)

```powershell
# 1. Cek semua aktivitas (riwayat)
curl -b cookies.txt http://localhost:4000/riwayat

# 2. Cek aktivitas user tertentu
curl -b cookies.txt http://localhost:4000/riwayat/user/user_jkt

# 3. Cek aktivitas untuk aset tertentu
curl -b cookies.txt http://localhost:4000/riwayat/aset/0025%2FJKT-NET%2F2025

# 4. Cek notifikasi
curl -b cookies.txt http://localhost:4000/notification

# 5. Cek jumlah notifikasi belum dibaca
curl -b cookies.txt http://localhost:4000/notification/unread-count

# 6. Mark all notifications as read
curl -X PUT http://localhost:4000/notification/read-all -b cookies.txt
```

---

## Tips & Best Practices

### 1. Authentikasi

- Simpan cookie setelah login untuk request selanjutnya
- Atau gunakan header `x-role` dan `x-beban` untuk testing
- Admin memiliki akses penuh, user hanya bisa akses data beban mereka

### 2. URL Encoding

- Untuk AsetId dengan slash (/) gunakan `%2F`:
  - `0025/JKT-NET/2025` → `0025%2FJKT-NET%2F2025`
- Untuk spasi gunakan `%20`:
  - `Server Room` → `Server%20Room`

### 3. File Upload

- Gunakan `multipart/form-data` untuk upload gambar
- Format: `-F "Gambar=@./path/to/file.jpg"`
- Max size: 5MB
- Allowed types: image/\*

### 4. Foreign Key Relationships

- `beban_id` harus ada di tabel `beban`
- `departemen_id` harus ada di tabel `departemen`

### 5. Validation

- `beban_id` harus ada di tabel `beban`
- `departemen_id` harus ada di tabel `departemen`

### 6. Lokasi Aset

- Field `Lokasi` di tabel `aset` adalah lokasi umum (kota/regional/ruangan)

### 7. Status Values

- **StatusAset**: `aktif`, `rusak`, `dipinjam`, `dijual`
- **StatusPerbaikan**: `pending`, `in_progress`, `completed`, `cancelled`
- **StatusPeminjaman**: `dipinjam`, `dikembalikan`
- **StatusRusak**: `temporary`, `permanent`

### 7. Date Format

- Gunakan format: `YYYY-MM-DD`
- Contoh: `2025-02-15`

### 8. Pagination

- Gunakan parameter `page` dan `limit`:
  - `GET /aset?page=1&limit=20`

### 9. Error Handling

- Status 400: Bad Request (validasi gagal)
- Status 401: Unauthorized (perlu login)
- Status 403: Forbidden (tidak punya akses)
- Status 404: Not Found (data tidak ditemukan)
- Status 500: Server Error

### 10. Role-based Access

- **Admin**: CRUD semua data
- **User**:
  - Read: hanya data dengan beban yang sesuai
  - Write: terbatas (tidak bisa delete)

---

## Endpoint Summary

| Endpoint                     | Method | Auth       | Description           |
| ---------------------------- | ------ | ---------- | --------------------- |
| `/user/login`                | POST   | -          | Login user            |
| `/user`                      | GET    | User/Admin | Get current user info |
| `/user/all`                  | GET    | Admin      | Get all users         |
| `/user/create`               | POST   | Admin      | Create new user       |
| `/user/:username/password`   | PUT    | User/Admin | Update password       |
| `/user/:username/beban`      | PUT    | Admin      | Update user beban     |
| `/beban`                     | GET    | User/Admin | Get all beban         |
| `/beban/:id`                 | GET    | User/Admin | Get beban by ID       |
| `/beban/kode/:kode`          | GET    | User/Admin | Get beban by kode     |
| `/beban`                     | POST   | Admin      | Create beban          |
| `/beban/:id`                 | PUT    | Admin      | Update beban          |
| `/beban/:id`                 | DELETE | Admin      | Delete beban          |
| `/departemen`                | GET    | User/Admin | Get all departemen    |
| `/departemen/:id`            | GET    | User/Admin | Get departemen by ID  |
| `/departemen`                | POST   | Admin      | Create departemen     |
| `/departemen/:id`            | PUT    | Admin      | Update departemen     |
| `/departemen/:id`            | DELETE | Admin      | Delete departemen     |
| `/aset`                      | GET    | User/Admin | Get all aset          |
| `/aset`                      | POST   | User/Admin | Create aset           |
| `/aset/:id`                  | GET    | User/Admin | Get aset by ID        |
| `/aset/:id`                  | PUT    | Admin      | Update aset           |
| `/aset/:id`                  | DELETE | Admin      | Delete aset           |
| `/aset/:id/gambar`           | PUT    | Admin      | Update aset image     |
| `/aset/:id/keterangan`       | PUT    | Admin      | Update aset notes     |
| `/perbaikan`                 | GET    | User/Admin | Get all repairs       |
| `/perbaikan/aset/:asetId`    | GET    | User/Admin | Get repairs by aset   |
| `/perbaikan/:id`             | GET    | User/Admin | Get repair by ID      |
| `/perbaikan`                 | POST   | User/Admin | Create repair         |
| `/perbaikan/:id`             | PUT    | Admin      | Update repair         |
| `/perbaikan/:id`             | DELETE | Admin      | Delete repair         |
| `/rusak`                     | GET    | User/Admin | Get all broken aset   |
| `/rusak/aset/:asetId`        | GET    | User/Admin | Get broken by aset    |
| `/rusak/:id`                 | GET    | User/Admin | Get broken by ID      |
| `/rusak`                     | POST   | User/Admin | Create broken record  |
| `/rusak/:id`                 | PUT    | Admin      | Update broken record  |
| `/rusak/:id`                 | DELETE | Admin      | Delete broken record  |
| `/dipinjam`                  | GET    | User/Admin | Get all borrowed      |
| `/dipinjam/aset/:asetId`     | GET    | User/Admin | Get borrowed by aset  |
| `/dipinjam/:id`              | GET    | User/Admin | Get borrowed by ID    |
| `/dipinjam`                  | POST   | User/Admin | Create borrow record  |
| `/dipinjam/:id`              | PUT    | Admin      | Update/return borrow  |
| `/dipinjam/:id`              | DELETE | Admin      | Delete borrow record  |
| `/dijual`                    | GET    | User/Admin | Get all sold aset     |
| `/dijual/aset/:asetId`       | GET    | User/Admin | Get sold by aset      |
| `/dijual/:id`                | GET    | User/Admin | Get sold by ID        |
| `/dijual`                    | POST   | User/Admin | Create sold record    |
| `/dijual/:id`                | PUT    | Admin      | Update sold record    |
| `/dijual/:id`                | DELETE | Admin      | Delete sold record    |
| `/mutasi`                    | GET    | User/Admin | Get all mutations     |
| `/mutasi/aset/:asetId`       | GET    | User/Admin | Get mutations by aset |
| `/mutasi/:id`                | GET    | User/Admin | Get mutation by ID    |
| `/mutasi`                    | POST   | User/Admin | Create mutation       |
| `/mutasi/:id`                | PUT    | Admin      | Update mutation       |
| `/mutasi/:id`                | DELETE | Admin      | Delete mutation       |
| `/riwayat`                   | GET    | User/Admin | Get all audit logs    |
| `/riwayat/aset/:asetId`      | GET    | User/Admin | Get logs by aset      |
| `/riwayat/user/:username`    | GET    | Admin      | Get logs by user      |
| `/notification`              | GET    | User/Admin | Get all notifications |
| `/notification/unread-count` | GET    | User/Admin | Get unread count      |
| `/notification/:id/read`     | PUT    | User/Admin | Mark as read          |
| `/notification/read-all`     | PUT    | User/Admin | Mark all as read      |
| `/notification/:id`          | DELETE | User/Admin | Delete notification   |

---

**Total Endpoints:** 79 endpoints

**Database Tables:** 11 tables

- `user` (autentikasi & otorisasi)
- `beban` (cost center master)
- `departemen` (department master)
- `aset` (main asset table)
- `perbaikan` (repairs)
- `rusak` (broken assets)
- `dipinjam` (borrowed assets)
- `dijual` (sold assets)
- `mutasi` (asset mutations/movements)
- `riwayat` (audit log)
- `notification` (user notifications)

---

## Contact & Support

Untuk pertanyaan atau issue, silahkan buka issue di repository atau hubungi admin sistem.

**Base URL:** `http://localhost:4000`

**Default Port:** 4000 (dapat diubah via environment variable `PORT`)
