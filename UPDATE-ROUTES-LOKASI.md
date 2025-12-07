# UPDATE BERHASIL: Routes Rusak, Dipinjam, Dijual

## Status: ✅ SEMUA ROUTE TELAH DIUPDATE

Ketiga route (rusak, dipinjam, dijual) sekarang sudah menggunakan sistem lokasi seperti perbaikan.

---

## Perubahan yang Dilakukan

### 1. routes/rusak.js ✅

- Tambah validasi `lokasi_id` wajib
- Cek stok di lokasi sebelum insert
- Kurangi jumlah dari `aset_lokasi` berdasarkan `lokasi_id`
- Update total di `aset` dengan SUM dari semua lokasi
- Response include info lokasi
- Riwayat mencatat lokasi asal

### 2. routes/dipinjam.js ✅

- Sama seperti rusak
- Field: `jumlah_dipinjam`
- StatusAset: 'dipinjam'

### 3. routes/dijual.js ✅

- Sama seperti rusak
- Field: `jumlah_dijual`
- StatusAset: 'dijual'

---

## Cara Testing (PowerShell)

### Persiapan

```powershell
# 1. Restart server (Ctrl+C di terminal server, lalu:)
node index.js

# 2. Login
curl -X POST -H "Content-Type: application/json" `
  -d "@login.json" `
  http://localhost:4000/user/login `
  -c test-cookies.txt

# 3. Cek lokasi aset 0001/MLG-NET/2025
curl -b test-cookies.txt `
  http://localhost:4000/aset-lokasi/aset/0001%2FMLG-NET%2F2025
```

### Test 1: Rusak dengan lokasi_id

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"lokasi_id`":25,`"TglRusak`":`"2025-12-07`",`"Kerusakan`":`"Layar pecah`",`"jumlah_rusak`":2,`"StatusRusak`":`"permanent`",`"catatan`":`"Tidak bisa diperbaiki`"}" `
  http://localhost:4000/rusak
```

**Expected Response:**

```json
{
  "message": "Data kerusakan ditambahkan",
  "rusak": {
    "id": 7,
    "aset_id": 125,
    "AsetId": "0001/MLG-NET/2025",
    "NamaAset": "asgglighgh",
    "TglRusak": "2025-12-06",
    "Kerusakan": "Layar pecah",
    "jumlah_rusak": 2,
    "StatusRusak": "permanent",
    "catatan": "Tidak bisa diperbaiki",
    "lokasi": "a",
    "lokasi_id": 25
  }
}
```

### Test 2: Dipinjam dengan lokasi_id

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"lokasi_id`":26,`"peminjam`":`"Budi Santoso`",`"tanggal_pinjam`":`"2025-12-07`",`"tanggal_kembali`":`"2025-12-14`",`"jumlah_dipinjam`":3,`"catatan`":`"Untuk presentasi client`"}" `
  http://localhost:4000/dipinjam
```

**Expected Response:**

```json
{
  "message": "Data peminjaman ditambahkan",
  "dipinjam": {
    "id": 5,
    "aset_id": 125,
    "AsetId": "0001/MLG-NET/2025",
    "NamaAset": "asgglighgh",
    "Peminjam": "Budi Santoso",
    "TglPinjam": "2025-12-06",
    "TglKembali": "2025-12-13",
    "jumlah_dipinjam": 3,
    "StatusPeminjaman": "dipinjam",
    "catatan": "Untuk presentasi client",
    "lokasi": "b",
    "lokasi_id": 26
  }
}
```

### Test 3: Dijual dengan lokasi_id

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"lokasi_id`":25,`"tanggal_jual`":`"2025-12-07`",`"harga_jual`":5000000,`"pembeli`":`"PT Jaya Makmur`",`"jumlah_dijual`":4,`"alasan`":`"Unit lama upgrade ke baru`"}" `
  http://localhost:4000/dijual
```

**Expected Response:**

```json
{
  "message": "Data penjualan ditambahkan",
  "dijual": {
    "id": 3,
    "aset_id": 125,
    "AsetId": "0001/MLG-NET/2025",
    "NamaAset": "asgglighgh",
    "TglDijual": "2025-12-06",
    "HargaJual": 5000000,
    "Pembeli": "PT Jaya Makmur",
    "jumlah_dijual": 4,
    "catatan": "Unit lama upgrade ke baru",
    "lokasi": "a",
    "lokasi_id": 25
  }
}
```

---

## Verifikasi Hasil

### 1. Cek Distribusi Lokasi Setelah Transaksi

```powershell
curl -b test-cookies.txt `
  http://localhost:4000/aset-lokasi/aset/0001%2FMLG-NET%2F2025 |
  ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected:**

- Lokasi "a" (id: 25): jumlah berkurang 2 (rusak) + 4 (dijual) = 6 unit total
- Lokasi "b" (id: 26): jumlah berkurang 3 (dipinjam)
- total_aset otomatis update sesuai SUM lokasi

### 2. Cek Total Aset

```powershell
curl -b test-cookies.txt http://localhost:4000/aset/0001%2FMLG-NET%2F2025
```

**Expected:**

- Field `jumlah` sama dengan sum dari semua lokasi
- Tidak ada inkonsistensi antara aset.jumlah dan sum(aset_lokasi.jumlah)

### 3. Cek Riwayat

```powershell
curl -b test-cookies.txt "http://localhost:4000/riwayat?aset_id=125" |
  ConvertFrom-Json | ConvertTo-Json -Depth 10
```

**Expected:**

- Setiap transaksi baru mencatat info lokasi di field `perubahan`
- Format: `{"lokasi": "a", "lokasi_id": 25, "jumlah_rusak": 2}`

---

## Error Testing

### Test: Lokasi tidak valid

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"lokasi_id`":999,`"TglRusak`":`"2025-12-07`"}" `
  http://localhost:4000/rusak
```

**Expected:**

```json
{ "message": "Lokasi tidak ditemukan" }
```

### Test: Stok tidak mencukupi

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"lokasi_id`":25,`"TglRusak`":`"2025-12-07`",`"jumlah_rusak`":999}" `
  http://localhost:4000/rusak
```

**Expected:**

```json
{
  "message": "Stok di lokasi tidak mencukupi",
  "available": 24,
  "requested": 999
}
```

### Test: Tanpa lokasi_id

```powershell
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt `
  -d "{`"AsetId`":`"0001/MLG-NET/2025`",`"TglRusak`":`"2025-12-07`"}" `
  http://localhost:4000/rusak
```

**Expected:**

```json
{ "message": "AsetId, TglRusak, dan lokasi_id diperlukan" }
```

---

## Summary Perubahan

| Route     | Status | lokasi_id Required | Kurangi dari | Update aset.jumlah |
| --------- | ------ | ------------------ | ------------ | ------------------ |
| perbaikan | ✅     | Ya                 | aset_lokasi  | SUM(aset_lokasi)   |
| rusak     | ✅     | Ya                 | aset_lokasi  | SUM(aset_lokasi)   |
| dipinjam  | ✅     | Ya                 | aset_lokasi  | SUM(aset_lokasi)   |
| dijual    | ✅     | Ya                 | aset_lokasi  | SUM(aset_lokasi)   |

---

## Next Steps

1. ✅ Restart server
2. ⏳ Test semua endpoint dengan contoh di atas
3. ⏳ Verifikasi lokasi berkurang sesuai transaksi
4. ⏳ Verifikasi total aset sinkron dengan sum lokasi
5. ⏳ Update frontend untuk tambah field `lokasi_id`

---

Dibuat: 7 Desember 2025, 11:35 WIB
Status: Code updated, ready for testing
