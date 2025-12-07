# Cara Testing API Pemeliharaan Aset

## Prerequisites

1. Server harus berjalan di `http://localhost:4000`
2. Database MySQL sudah terkoneksi
3. User admin sudah dibuat (username: `admin`, password: `admin123`)

## 1. Login dan Dapatkan Cookies

```powershell
curl -X POST -H "Content-Type: application/json" -d "{`"username`":`"admin`",`"password`":`"admin123`"}" http://localhost:4000/user/login -c test-cookies.txt
```

**Response:**

```json
{
  "message": "Login berhasil",
  "role": "admin",
  "beban": ["MLM"],
  "nama": "admin",
  "username": "admin",
  "id": 38
}
```

## 2. Input Data Aset Baru

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"TEST/2025/001`",`"NamaAset`":`"Laptop Testing`",`"Grup`":`"KOMPUTER`",`"StatusAset`":`"aktif`",`"Pengguna`":`"IT Staff`",`"Lokasi`":`"Kantor Pusat`",`"Keterangan`":`"Laptop untuk testing aplikasi`"}" http://localhost:4000/aset
```

**Field Wajib:**

- `AsetId` - ID unik aset
- `NamaAset` - Nama aset
- `Grup` - Pilihan: `BANGUNAN`, `DISTRIBUSI JARINGAN`, `HEADEND`, `KENDARAAN`, `KOMPUTER`, `PERALATAN & INVENTARIS KANTOR`, `TANAH`
- `StatusAset` - Default: `aktif` (pilihan: `aktif`, `rusak`, `diperbaiki`, `dipinjam`, `dijual`)

**Response:**

```json
{
  "message": "Aset berhasil ditambahkan",
  "asset": {
    "id": 118,
    "AsetId": "TEST/2025/001",
    "NamaAset": "Laptop Testing",
    "Grup": "KOMPUTER",
    "StatusAset": "aktif",
    ...
  }
}
```

## 3. Edit/Update Data Aset

```powershell
curl -X PUT -H "Content-Type: application/json" -b test-cookies.txt -d "{`"NilaiAset`":18000000,`"Keterangan`":`"Laptop testing - sudah di update dengan nilai baru`"}" http://localhost:4000/aset/TEST%2F2025%2F001
```

**Field yang Bisa Diupdate:**

- `NamaAset`, `Spesifikasi`, `Grup`, `NilaiAset`, `TglPembelian`, `MasaManfaat`
- `StatusAset`, `Pengguna`, `Lokasi`, `Keterangan`
- `beban_id`, `departemen_id`, `AkunPerkiraan`

**Response:**

```json
{
  "message": "Aset berhasil diupdate",
  "updated": {
    "id": 118,
    "NilaiAset": 18000000,
    "Keterangan": "Laptop testing - sudah di update dengan nilai baru",
    ...
  }
}
```

## 4. Catat Perbaikan Aset

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"TEST/2025/001`",`"tanggal_perbaikan`":`"2025-12-07`",`"deskripsi`":`"Ganti harddisk dengan SSD 1TB`",`"biaya`":2500000,`"teknisi`":`"Bagus IT`",`"status`":`"selesai`"}" http://localhost:4000/perbaikan
```

**Field Wajib:**

- `AsetId` - ID aset yang diperbaiki
- `tanggal_perbaikan` - Tanggal perbaikan (format: YYYY-MM-DD)

**Field Opsional:**

- `deskripsi` - Deskripsi perbaikan
- `biaya` - Biaya perbaikan
- `teknisi` - Nama teknisi
- `status` - Status perbaikan (default: `pending`, pilihan: `pending`, `selesai`)

**Response:**

```json
{
  "message": "Perbaikan ditambahkan",
  "perbaikan": {
    "id": 2,
    "aset_id": 118,
    "AsetId": "TEST/2025/001",
    "tanggal_perbaikan": "2025-12-07",
    "deskripsi": "Ganti harddisk dengan SSD 1TB",
    "biaya": "2500000.00",
    ...
  }
}
```

**Catatan:** Setiap perbaikan akan mengurangi `jumlah` aset sebanyak 1.

## 5. Tandai Aset Rusak

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"TEST/2025/001`",`"TglRusak`":`"2025-12-07`",`"Kerusakan`":`"Keyboard tidak berfungsi beberapa tombol`",`"jumlah_rusak`":1,`"StatusRusak`":`"temporary`",`"catatan`":`"Perlu ganti keyboard baru`"}" http://localhost:4000/rusak
```

**Field Wajib:**

- `AsetId` - ID aset yang rusak
- `TglRusak` - Tanggal rusak (format: YYYY-MM-DD)

**Field Opsional:**

- `Kerusakan` - Deskripsi kerusakan
- `jumlah_rusak` - Jumlah yang rusak (default: 1)
- `StatusRusak` - Status kerusakan (default: `temporary`, pilihan: `temporary`, `permanent`)
- `catatan` - Catatan tambahan

**Response:**

```json
{
  "message": "Data kerusakan ditambahkan",
  "rusak": {
    "id": 1,
    "aset_id": 118,
    "AsetId": "TEST/2025/001",
    "TglRusak": "2025-12-07",
    "Kerusakan": "Keyboard tidak berfungsi beberapa tombol",
    ...
  }
}
```

**Catatan:** Setiap kerusakan akan mengurangi `jumlah` aset sesuai `jumlah_rusak`.

## 6. Catat Peminjaman Aset

**PENTING:** Jika mendapat error "Unknown column 'user_id'", restart server dengan cara:

1. Tekan `Ctrl+C` di terminal server
2. Jalankan ulang: `node index.js` atau `npm start`
3. Login ulang untuk refresh cookies

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"TEST/2025/001`",`"tanggal_pinjam`":`"2025-12-07`",`"tanggal_kembali`":`"2025-12-14`",`"peminjam`":`"Andi Marketing`",`"keperluan`":`"Presentasi ke client`"}" http://localhost:4000/dipinjam
```

**Field Wajib:**

- `AsetId` - ID aset yang dipinjam
- `tanggal_pinjam` - Tanggal pinjam (format: YYYY-MM-DD)
- `peminjam` - Nama peminjam

**Field Opsional:**

- `tanggal_kembali` - Tanggal rencana kembali
- `keperluan` / `catatan` - Keperluan peminjaman
- `jumlah_dipinjam` - Jumlah yang dipinjam (default: 1)
- `status` - Status peminjaman (default: `dipinjam`, pilihan: `dipinjam`, `dikembalikan`)

**Response:**

```json
{
  "message": "Data peminjaman ditambahkan",
  "dipinjam": {
    "id": 1,
    "aset_id": 118,
    "Peminjam": "Andi Marketing",
    "TglPinjam": "2025-12-07",
    ...
  }
}
```

## 7. Catat Penjualan Aset

**PENTING:** Jika mendapat error "Unknown column 'user_id'", restart server dengan cara:

1. Tekan `Ctrl+C` di terminal server
2. Jalankan ulang: `node index.js` atau `npm start`
3. Login ulang untuk refresh cookies

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"TEST/2025/001`",`"tanggal_jual`":`"2025-12-07`",`"harga_jual`":10000000,`"pembeli`":`"PT Maju Jaya`",`"catatan`":`"Dijual karena sudah lama`"}" http://localhost:4000/dijual
```

**Field Wajib:**

- `AsetId` - ID aset yang dijual
- `tanggal_jual` - Tanggal jual (format: YYYY-MM-DD)

**Field Opsional:**

- `harga_jual` / `HargaJual` - Harga jual
- `pembeli` / `Pembeli` - Nama pembeli
- `jumlah_dijual` - Jumlah yang dijual (default: 1)
- `catatan` / `alasan` - Catatan atau alasan penjualan

**Response:**

```json
{
  "message": "Data penjualan ditambahkan",
  "dijual": {
    "id": 1,
    "aset_id": 118,
    "TglDijual": "2025-12-07",
    "HargaJual": 10000000,
    ...
  }
}
```

## 8. Cek Riwayat Aset

### Cek Semua Riwayat

```powershell
curl -b test-cookies.txt http://localhost:4000/riwayat
```

### Cek Riwayat Berdasarkan Aset ID (database ID)

```powershell
curl -b test-cookies.txt http://localhost:4000/riwayat?aset_id=118
```

### Cek Riwayat Berdasarkan User ID

```powershell
curl -b test-cookies.txt http://localhost:4000/riwayat?user_id=38
```

### Cek Riwayat Berdasarkan Tabel Referensi

```powershell
curl -b test-cookies.txt http://localhost:4000/riwayat?tabel_ref=perbaikan
```

**Tabel Referensi yang Tersedia:**

- `aset` - Perubahan pada tabel aset
- `perbaikan` - Log perbaikan
- `rusak` - Log kerusakan
- `dipinjam` - Log peminjaman
- `dijual` - Log penjualan

### Kombinasi Filter

```powershell
curl -b test-cookies.txt "http://localhost:4000/riwayat?aset_id=118&tabel_ref=perbaikan&limit=10"
```

**Response:**

```json
[
  {
    "id": 7,
    "jenis_aksi": "rusak_input",
    "user_id": 38,
    "username": "admin",
    "role": "admin",
    "aset_id": 118,
    "AsetId": "TEST/2025/001",
    "NamaAset": "Laptop Testing",
    "tabel_ref": "rusak",
    "record_id": 1,
    "perubahan": null
  },
  {
    "id": 5,
    "jenis_aksi": "edit",
    "user_id": 38,
    "username": "admin",
    "role": "admin",
    "aset_id": 118,
    "AsetId": "TEST/2025/001",
    "NamaAset": "Laptop Testing",
    "tabel_ref": "aset",
    "record_id": null,
    "perubahan": {
      "NilaiAset": {
        "before": null,
        "after": 18000000
      },
      "Keterangan": {
        "before": "Laptop untuk testing aplikasi",
        "after": "Laptop testing - sudah di update dengan nilai baru"
      }
    }
  }
]
```

## 9. Operasi Lainnya

### Lihat Detail Aset

```powershell
curl -b test-cookies.txt http://localhost:4000/aset/TEST%2F2025%2F001
```

### Lihat Semua Aset

```powershell
curl -b test-cookies.txt http://localhost:4000/aset
```

### Lihat Semua Perbaikan

```powershell
curl -b test-cookies.txt http://localhost:4000/perbaikan
```

### Lihat Perbaikan Berdasarkan Aset

```powershell
curl -b test-cookies.txt http://localhost:4000/perbaikan/aset/TEST%2F2025%2F001
```

### Lihat Semua Data Rusak

```powershell
curl -b test-cookies.txt http://localhost:4000/rusak
```

### Lihat Semua Peminjaman

```powershell
curl -b test-cookies.txt http://localhost:4000/dipinjam
```

### Lihat Semua Penjualan

```powershell
curl -b test-cookies.txt http://localhost:4000/dijual
```

## Catatan Penting

1. **URL Encoding:** Untuk AsetId yang mengandung karakter khusus (seperti `/`), gunakan URL encoding:

   - `/` menjadi `%2F`
   - Contoh: `TEST/2025/001` menjadi `TEST%2F2025%2F001`

2. **PowerShell Escaping:** Untuk JSON di PowerShell, gunakan backtick (`` ` ``) untuk escape quotes:

   - `"field"` menjadi `` `"field`" ``

3. **Cookies:** Semua request setelah login harus menyertakan cookies dengan parameter `-b test-cookies.txt`

4. **Role-based Access:**

   - Admin: Akses penuh ke semua data
   - User: Hanya bisa akses data sesuai dengan `beban` yang dimiliki

5. **Perubahan Jumlah Aset:**

   - Setiap operasi perbaikan, rusak, dipinjam, atau dijual akan mengurangi `jumlah` aset
   - Pastikan `jumlah` aset mencukupi sebelum melakukan operasi

6. **Riwayat Otomatis:**
   - Semua operasi (input, edit, perbaikan, rusak, dipinjam, dijual) akan tercatat otomatis di tabel `riwayat`
   - Riwayat menyimpan perubahan field (before/after) untuk operasi edit
