# Panduan Manajemen Lokasi Aset

Panduan ini menjelaskan cara mengelola distribusi lokasi aset menggunakan endpoint `/aset-lokasi`.

## Daftar Isi

- [Melihat Semua Lokasi](#melihat-semua-lokasi)
- [Melihat Lokasi untuk Aset Tertentu](#melihat-lokasi-untuk-aset-tertentu)
- [Menambah Lokasi Baru](#menambah-lokasi-baru)
- [Mengedit Lokasi](#mengedit-lokasi)
- [Menghapus Lokasi](#menghapus-lokasi)
- [Contoh Lengkap](#contoh-lengkap)

---

## Melihat Semua Lokasi

Menampilkan semua alokasi lokasi aset yang terdaftar.

**Endpoint:** `GET /aset-lokasi`

**Contoh:**

```bash
curl -b test-cookies.txt http://localhost:4000/aset-lokasi
```

**Response:**

```json
[
  {
    "id": 14,
    "AsetId": "0001/BNT-MEDIA/2025",
    "beban": "BNT-MEDIA",
    "NamaAset": "fyyyuiui",
    "lokasi": "a",
    "jumlah": 3,
    "keterangan": "Dipindah ke ruang server utama",
    "created_at": "2025-12-07T01:20:41Z",
    "updated_at": "2025-12-07T01:53:14Z"
  }
]
```

---

## Melihat Lokasi untuk Aset Tertentu

Menampilkan detail distribusi lokasi untuk satu aset tertentu.

**Endpoint:** `GET /aset-lokasi/aset/:asetId`

**Contoh:**

```bash
curl -b test-cookies.txt http://localhost:4000/aset-lokasi/aset/0001%2FBNT-MEDIA%2F2025
```

**Response:**

```json
{
  "AsetId": "0001/BNT-MEDIA/2025",
  "NamaAset": "fyyyuiui",
  "total_aset": 10,
  "total_allocated": 10,
  "available": 0,
  "locations": [
    {
      "id": 14,
      "AsetId": "0001/BNT-MEDIA/2025",
      "beban": "BNT-MEDIA",
      "NamaAset": "fyyyuiui",
      "lokasi": "a",
      "jumlah": 3,
      "keterangan": "Dipindah ke ruang server utama",
      "created_at": "2025-12-07T01:20:41Z",
      "updated_at": "2025-12-07T01:53:14Z"
    },
    {
      "id": 15,
      "AsetId": "0001/BNT-MEDIA/2025",
      "beban": "BNT-MEDIA",
      "NamaAset": "fyyyuiui",
      "lokasi": "B",
      "jumlah": 2,
      "keterangan": null,
      "created_at": "2025-12-07T01:20:41Z",
      "updated_at": "2025-12-07T01:53:18Z"
    },
    {
      "id": 16,
      "AsetId": "0001/BNT-MEDIA/2025",
      "beban": "BNT-MEDIA",
      "NamaAset": "fyyyuiui",
      "lokasi": "c",
      "jumlah": 5,
      "keterangan": null,
      "created_at": "2025-12-07T01:53:27Z",
      "updated_at": "2025-12-07T01:53:27Z"
    }
  ]
}
```

**Penjelasan Field:**

- `total_aset`: Total jumlah aset yang tersedia
- `total_allocated`: Total yang sudah dialokasikan ke lokasi
- `available`: Sisa aset yang belum dialokasikan (total_aset - total_allocated)
- `locations`: Array berisi detail setiap lokasi

---

## Menambah Lokasi Baru

Menambahkan alokasi lokasi baru untuk aset.

**Endpoint:** `POST /aset-lokasi`

**Field yang diperlukan:**

- `AsetId` (required): ID aset yang akan dialokasikan
- `lokasi` (required): Nama tempat/lokasi
- `jumlah` (required): Jumlah unit yang dialokasikan ke lokasi ini
- `keterangan` (optional): Catatan tambahan

**Contoh 1: Tanpa keterangan**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "AsetId": "0001/BNT-MEDIA/2025",
    "lokasi": "Ruang Server",
    "jumlah": 5
  }' \
  http://localhost:4000/aset-lokasi
```

**Contoh 2: Dengan keterangan**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "AsetId": "0001/BNT-MEDIA/2025",
    "lokasi": "Gudang Lantai 2",
    "jumlah": 3,
    "keterangan": "Stok cadangan untuk maintenance"
  }' \
  http://localhost:4000/aset-lokasi
```

**Response:**

```json
{
  "id": 16,
  "AsetId": "0001/BNT-MEDIA/2025",
  "lokasi": "Ruang Server",
  "jumlah": 5,
  "keterangan": null,
  "message": "Location allocation created successfully"
}
```

---

## Mengedit Lokasi

Mengubah informasi lokasi yang sudah ada.

**Endpoint:** `PUT /aset-lokasi/:id`

**Field yang bisa diupdate:**

- `lokasi` (required): Nama tempat/lokasi baru
- `jumlah` (required): Jumlah unit baru
- `keterangan` (optional): Catatan tambahan

**Langkah 1: Dapatkan ID lokasi**

```bash
# Lihat dulu ID lokasi yang ingin diubah
curl -b test-cookies.txt http://localhost:4000/aset-lokasi/aset/0001%2FBNT-MEDIA%2F2025
```

**Langkah 2: Update lokasi**

```bash
# Misal ID lokasi adalah 14
curl -X PUT \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "lokasi": "Ruang Server Utama",
    "jumlah": 3,
    "keterangan": "Dipindah ke ruang server utama"
  }' \
  http://localhost:4000/aset-lokasi/14
```

**Response:**

```json
{
  "id": 14,
  "AsetId": "0001/BNT-MEDIA/2025",
  "lokasi": "Ruang Server Utama",
  "jumlah": 3,
  "keterangan": "Dipindah ke ruang server utama",
  "message": "Location allocation updated successfully"
}
```

**Contoh: Update hanya jumlah**

```bash
curl -X PUT \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "lokasi": "a",
    "jumlah": 5
  }' \
  http://localhost:4000/aset-lokasi/14
```

---

## Menghapus Lokasi

Menghapus alokasi lokasi aset.

**Endpoint:** `DELETE /aset-lokasi/:id`

**Contoh:**

```bash
# Hapus lokasi dengan ID 16
curl -X DELETE \
  -b test-cookies.txt \
  http://localhost:4000/aset-lokasi/16
```

**Response:**

```json
{
  "message": "Location allocation deleted successfully"
}
```

---

## Contoh Lengkap

### Skenario: Distribusi 10 unit aset ke 3 lokasi

**1. Login terlebih dahulu**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}' \
  http://localhost:4000/user/login \
  -c test-cookies.txt
```

**2. Tambah lokasi pertama: Ruang Server (3 unit)**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "AsetId": "0001/BNT-MEDIA/2025",
    "lokasi": "Ruang Server",
    "jumlah": 3
  }' \
  http://localhost:4000/aset-lokasi
```

**3. Tambah lokasi kedua: Gudang (2 unit)**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "AsetId": "0001/BNT-MEDIA/2025",
    "lokasi": "Gudang",
    "jumlah": 2
  }' \
  http://localhost:4000/aset-lokasi
```

**4. Tambah lokasi ketiga: Lantai 3 (5 unit)**

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{
    "AsetId": "0001/BNT-MEDIA/2025",
    "lokasi": "Lantai 3",
    "jumlah": 5,
    "keterangan": "Ruang meeting dan workspace"
  }' \
  http://localhost:4000/aset-lokasi
```

**5. Cek distribusi lengkap**

```bash
curl -b test-cookies.txt \
  http://localhost:4000/aset-lokasi/aset/0001%2FBNT-MEDIA%2F2025
```

**Response:**

```json
{
  "AsetId": "0001/BNT-MEDIA/2025",
  "NamaAset": "fyyyuiui",
  "total_aset": 10,
  "total_allocated": 10,
  "available": 0,
  "locations": [
    {
      "id": 14,
      "lokasi": "Ruang Server",
      "jumlah": 3,
      "keterangan": null
    },
    {
      "id": 15,
      "lokasi": "Gudang",
      "jumlah": 2,
      "keterangan": null
    },
    {
      "id": 16,
      "lokasi": "Lantai 3",
      "jumlah": 5,
      "keterangan": "Ruang meeting dan workspace"
    }
  ]
}
```

**6. Update lokasi: Pindahkan 1 unit dari Gudang ke Ruang Server**

```bash
# Update Ruang Server jadi 4 unit
curl -X PUT \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{"lokasi":"Ruang Server","jumlah":4}' \
  http://localhost:4000/aset-lokasi/14

# Update Gudang jadi 1 unit
curl -X PUT \
  -H "Content-Type: application/json" \
  -b test-cookies.txt \
  -d '{"lokasi":"Gudang","jumlah":1}' \
  http://localhost:4000/aset-lokasi/15
```

---

## Input Aset dengan Lokasi dalam Satu Perintah

### Cara 1: Input Aset + Tambah 2 Lokasi Sekaligus (PowerShell)

```powershell
# Input aset baru
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0005/BNT-MEDIA/2025`",`"NamaAset`":`"Switch Network`",`"Grup`":`"DISTRIBUSI JARINGAN`",`"beban_id`":26,`"jumlah`":10}" http://localhost:4000/aset; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0005/BNT-MEDIA/2025`",`"lokasi`":`"Ruang Server`",`"jumlah`":6}" http://localhost:4000/aset-lokasi; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0005/BNT-MEDIA/2025`",`"lokasi`":`"Gudang`",`"jumlah`":4}" http://localhost:4000/aset-lokasi
```

**Penjelasan:**

1. Command pertama: Input aset dengan total jumlah 10 unit
2. Command kedua: Alokasi 6 unit ke "Ruang Server"
3. Command ketiga: Alokasi 4 unit ke "Gudang"
4. Semua command dijalankan berurutan dengan separator `;`

### Cara 2: Menggunakan Bash/Git Bash

```bash
# Input aset + 2 lokasi dalam 1 command
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{"AsetId":"0005/BNT-MEDIA/2025","NamaAset":"Switch Network","Grup":"DISTRIBUSI JARINGAN","beban_id":26,"jumlah":10}' \
  http://localhost:4000/aset; \
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{"AsetId":"0005/BNT-MEDIA/2025","lokasi":"Ruang Server","jumlah":6}' \
  http://localhost:4000/aset-lokasi; \
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{"AsetId":"0005/BNT-MEDIA/2025","lokasi":"Gudang","jumlah":4}' \
  http://localhost:4000/aset-lokasi
```

### Cara 3: Edit Multiple Lokasi Sekaligus (PowerShell)

```powershell
# Edit 3 lokasi dalam 1 command
curl -X PUT -H "Content-Type: application/json" -b test-cookies.txt -d "{`"lokasi`":`"Ruang Server A`",`"jumlah`":3,`"keterangan`":`"Server utama`"}" http://localhost:4000/aset-lokasi/14; curl -X PUT -H "Content-Type: application/json" -b test-cookies.txt -d "{`"lokasi`":`"Gudang Lantai 2`",`"jumlah`":2,`"keterangan`":`"Stok cadangan`"}" http://localhost:4000/aset-lokasi/15; curl -X PUT -H "Content-Type: application/json" -b test-cookies.txt -d "{`"lokasi`":`"Ruang Meeting`",`"jumlah`":5,`"keterangan`":`"Operasional`"}" http://localhost:4000/aset-lokasi/16
```

### Template untuk Copy-Paste (PowerShell)

```powershell
# TEMPLATE - Ganti nilai sesuai kebutuhan
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"ASET_ID`",`"NamaAset`":`"NAMA_ASET`",`"Grup`":`"GRUP`",`"beban_id`":BEBAN_ID,`"jumlah`":TOTAL}" http://localhost:4000/aset; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"ASET_ID`",`"lokasi`":`"LOKASI_1`",`"jumlah`":JUMLAH_1}" http://localhost:4000/aset-lokasi; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"ASET_ID`",`"lokasi`":`"LOKASI_2`",`"jumlah`":JUMLAH_2}" http://localhost:4000/aset-lokasi
```

**Contoh Pengisian:**

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0010/MLG-MEDIA/2025`",`"NamaAset`":`"Laptop Dell`",`"Grup`":`"KOMPUTER`",`"beban_id`":27,`"jumlah`":15}" http://localhost:4000/aset; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0010/MLG-MEDIA/2025`",`"lokasi`":`"Kantor Pusat`",`"jumlah`":10}" http://localhost:4000/aset-lokasi; curl -X POST -H "Content-Type: application/json" -b test-cookies.txt -d "{`"AsetId`":`"0010/MLG-MEDIA/2025`",`"lokasi`":`"Kantor Cabang`",`"jumlah`":5}" http://localhost:4000/aset-lokasi
```

### Verifikasi Hasil

Setelah input, cek hasilnya:

```bash
curl -b test-cookies.txt http://localhost:4000/aset-lokasi/aset/0010%2FMLG-MEDIA%2F2025
```

**Response yang diharapkan:**

```json
{
  "AsetId": "0010/MLG-MEDIA/2025",
  "NamaAset": "Laptop Dell",
  "total_aset": 15,
  "total_allocated": 15,
  "available": 0,
  "locations": [
    {
      "lokasi": "Kantor Pusat",
      "jumlah": 10
    },
    {
      "lokasi": "Kantor Cabang",
      "jumlah": 5
    }
  ]
}
```

### Catatan Penting untuk Multiple Commands

1. **PowerShell**: Gunakan backtick (`` ` ``) untuk escape quote: `` {`"key`":`"value`"} ``
2. **Bash**: Gunakan single quote: `'{"key":"value"}'`
3. **Separator**: Gunakan `;` (semicolon) untuk memisahkan command
4. **Total Validasi**: Pastikan jumlah lokasi = jumlah total aset
5. **Urutan Eksekusi**: Command dijalankan berurutan dari kiri ke kanan

---

## Catatan Penting

### Hak Akses

- **Admin**: Bisa melihat dan mengelola semua lokasi aset
- **User biasa**: Hanya bisa melihat dan mengelola lokasi aset di beban mereka sendiri

### Validasi

- Total alokasi tidak boleh melebihi `jumlah` aset yang tersedia
- Jumlah per lokasi harus lebih besar dari 0
- Field `lokasi` dan `jumlah` wajib diisi saat menambah atau edit

### Tips

1. Gunakan `GET /aset-lokasi/aset/:asetId` untuk melihat ID sebelum edit/hapus
2. Perhatikan field `available` untuk mengetahui sisa aset yang belum dialokasikan
3. URL encode AsetId di URL (misal: `0001/BNT-MEDIA/2025` → `0001%2FBNT-MEDIA%2F2025`)
4. Keterangan bersifat opsional, bisa dikosongkan atau dihilangkan dari request

---

## Error Handling

### Error: "Allocation exceeds available asset quantity"

```json
{
  "error": "Allocation exceeds available asset quantity",
  "available": 10,
  "total_allocated": 8,
  "requested": 5
}
```

**Solusi:** Kurangi jumlah yang dialokasikan atau tingkatkan jumlah aset terlebih dahulu.

### Error: "Allocation not found or access denied"

```json
{
  "error": "Allocation not found or access denied"
}
```

**Solusi:** Pastikan ID lokasi benar dan Anda memiliki akses ke aset tersebut.

### Error: "Asset not found"

```json
{
  "error": "Asset not found"
}
```

**Solusi:** Pastikan AsetId yang digunakan sudah terdaftar di database.

---

**Dibuat:** 7 Desember 2025  
**Versi API:** 1.0
