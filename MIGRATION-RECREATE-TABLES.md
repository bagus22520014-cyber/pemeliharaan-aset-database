# Panduan Migrasi Tabel Database

## Deskripsi

Script `recreateTables.js` digunakan untuk membuat ulang (drop dan create) tabel-tabel utama dalam database dengan struktur yang telah diperbaiki dan disesuaikan dengan implementasi routes terbaru.

## ⚠️ PERINGATAN

**Script ini akan menghapus semua data** di tabel berikut:

- `riwayat`
- `perbaikan`
- `rusak`
- `dipinjam`
- `dijual`

**Pastikan Anda sudah melakukan backup database sebelum menjalankan script ini!**

## Tabel yang Akan Dibuat Ulang

### 1. Tabel `riwayat`

Menyimpan audit trail / history dari semua perubahan aset.

**Struktur:**

- `id` (INT, PK, AUTO_INCREMENT)
- `jenis_aksi` (VARCHAR) - Jenis aksi: 'input', 'edit', 'delete', 'perbaikan_input', dll
- `user_id` (INT, FK → user.id) - User yang melakukan aksi
- `role` (VARCHAR) - Role user saat melakukan aksi
- `aset_id` (INT, FK → aset.id) - Aset yang terkait
- `perubahan` (JSON) - Detail perubahan (format: `{field: {before: value, after: value}}`)
- `tabel_ref` (VARCHAR) - Nama tabel yang direferensi ('aset', 'perbaikan', 'rusak', dll)
- `record_id` (INT) - ID record di tabel yang direferensi (NULL untuk aksi di tabel aset)
- `created_at` (TIMESTAMP)

**Foreign Keys:**

- `user_id` → `user(id)` ON DELETE SET NULL
- `aset_id` → `aset(id)` ON DELETE CASCADE

**Indexes:**

- `idx_aset_id`, `idx_user_id`, `idx_tabel_ref`, `idx_created_at`

### 2. Tabel `perbaikan`

Menyimpan data perbaikan aset.

**Struktur:**

- `id` (INT, PK, AUTO_INCREMENT)
- `aset_id` (INT, FK → aset.id) - **Gunakan aset_id INT, bukan AsetId VARCHAR**
- `tanggal_perbaikan` (DATE) - Tanggal perbaikan dilakukan
- `deskripsi` (TEXT) - Deskripsi kerusakan/perbaikan
- `biaya` (DECIMAL) - Biaya perbaikan
- `teknisi` (VARCHAR) - Nama teknisi
- `status` (ENUM: 'pending', 'selesai', 'batal') - Status perbaikan
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Foreign Keys:**

- `aset_id` → `aset(id)` ON DELETE CASCADE

**Indexes:**

- `idx_aset_id`, `idx_status`

### 3. Tabel `rusak`

Menyimpan data kerusakan aset.

**Struktur:**

- `id` (INT, PK, AUTO_INCREMENT)
- `aset_id` (INT, FK → aset.id)
- `TglRusak` (DATE) - Tanggal aset rusak
- `Kerusakan` (TEXT) - Deskripsi kerusakan
- `jumlah_rusak` (INT) - Jumlah unit yang rusak
- `StatusRusak` (ENUM: 'temporary', 'permanent') - Status kerusakan
- `catatan` (TEXT) - Catatan tambahan
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Foreign Keys:**

- `aset_id` → `aset(id)` ON DELETE CASCADE

**Indexes:**

- `idx_aset_id`

### 4. Tabel `dipinjam`

Menyimpan data peminjaman aset.

**Struktur:**

- `id` (INT, PK, AUTO_INCREMENT)
- `aset_id` (INT, FK → aset.id)
- `Peminjam` (VARCHAR) - Nama peminjam
- `TglPinjam` (DATE) - Tanggal pinjam
- `TglKembali` (DATE, NULL) - Tanggal kembali (NULL jika belum dikembalikan)
- `jumlah_dipinjam` (INT) - Jumlah unit yang dipinjam
- `StatusPeminjaman` (ENUM: 'dipinjam', 'dikembalikan') - Status peminjaman
- `catatan` (TEXT) - Catatan tambahan
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Foreign Keys:**

- `aset_id` → `aset(id)` ON DELETE CASCADE

**Indexes:**

- `idx_aset_id`

### 5. Tabel `dijual`

Menyimpan data penjualan aset.

**Struktur:**

- `id` (INT, PK, AUTO_INCREMENT)
- `aset_id` (INT, FK → aset.id)
- `TglDijual` (DATE) - Tanggal penjualan
- `HargaJual` (INT) - Harga jual
- `Pembeli` (VARCHAR) - Nama pembeli
- `jumlah_dijual` (INT) - Jumlah unit yang dijual
- `catatan` (TEXT) - Catatan tambahan
- `created_at` (TIMESTAMP)
- `updated_at` (TIMESTAMP)

**Foreign Keys:**

- `aset_id` → `aset(id)` ON DELETE CASCADE

**Indexes:**

- `idx_aset_id`

## Cara Menggunakan

### 1. Backup Database (WAJIB!)

```bash
# Backup database menggunakan mysqldump
mysqldump -u root -p pemeliharaan-aset > backup_$(date +%Y%m%d_%H%M%S).sql

# Atau backup via phpMyAdmin / tools lainnya
```

### 2. Jalankan Script

```bash
# Dari root directory project
node scripts/recreateTables.js
```

### 3. Output yang Diharapkan

```
⚠️  PERHATIAN: Script ini akan DROP dan RECREATE tabel!
📋 Tabel yang akan dibuat ulang:
   - riwayat
   - perbaikan
   - rusak
   - dipinjam
   - dijual

🗑️  Dropping existing tables...

✅ Koneksi database berhasil
✅ Dropped riwayat
✅ Dropped perbaikan
✅ Dropped rusak
✅ Dropped dipinjam
✅ Dropped dijual
✅ All tables dropped

🔧 Creating new tables...

✅ riwayat table created
✅ perbaikan table created
✅ rusak table created
✅ dipinjam table created
✅ dijual table created

🎉 All tables successfully recreated!
```

## Perubahan Utama dari Struktur Lama

### 1. **Tidak Ada Kolom `user_id` di Tabel Transaksi**

Tabel `perbaikan`, `rusak`, `dipinjam`, `dijual` **TIDAK** memiliki kolom `user_id` lagi.

- Tracking user dilakukan via tabel `riwayat`
- Routes tidak perlu menyimpan user_id di tabel transaksi

### 2. **Menggunakan `aset_id` (INT) sebagai Foreign Key**

Semua tabel sekarang menggunakan `aset_id INT` yang merujuk ke `aset.id`, **bukan** `AsetId VARCHAR`.

**Sebelum:**

```sql
-- ❌ SALAH
INSERT INTO perbaikan (AsetId, ...) VALUES ('0001/MLM/2025', ...);
```

**Sekarang:**

```sql
-- ✅ BENAR
-- 1. Dapatkan aset.id terlebih dahulu
SELECT id FROM aset WHERE AsetId = '0001/MLM/2025'; -- returns: 123

-- 2. Gunakan aset.id sebagai FK
INSERT INTO perbaikan (aset_id, ...) VALUES (123, ...);
```

### 3. **Field Names yang Berubah**

#### Tabel `perbaikan`:

| Lama            | Baru                |
| --------------- | ------------------- |
| `tanggal`       | `tanggal_perbaikan` |
| `PurchaseOrder` | ❌ Dihapus          |
| `vendor`        | ❌ Dihapus          |
| `bagian`        | ❌ Dihapus          |
| `nominal`       | `biaya`             |
| -               | `deskripsi` (baru)  |
| -               | `teknisi` (baru)    |
| -               | `status` (baru)     |

#### Tabel `riwayat`:

- `record_id` sekarang berfungsi untuk melacak ID record di tabel relasi
- `record_id` = NULL untuk aksi di tabel `aset`
- `record_id` = ID dari record untuk aksi di tabel `perbaikan`, `rusak`, dll

## Verifikasi Setelah Migrasi

### 1. Cek Struktur Tabel

```bash
# Via node.js
node -e "import('mysql2').then(m => {
  const c = m.default.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME
  });
  c.query('DESCRIBE perbaikan', (e, r) => {
    if(e) console.error(e);
    else console.table(r);
    c.end();
  });
})"
```

### 2. Test API Endpoints

```bash
# Test GET endpoints (harus return empty array)
curl -H "x-role: admin" http://localhost:4000/perbaikan
curl -H "x-role: admin" http://localhost:4000/rusak
curl -H "x-role: admin" http://localhost:4000/dipinjam
curl -H "x-role: admin" http://localhost:4000/dijual
curl -H "x-role: admin" http://localhost:4000/riwayat

# Test POST dengan data baru
curl -X POST http://localhost:4000/perbaikan \
  -H "Content-Type: application/json" \
  -H "x-role: admin" \
  -H "x-username: admin" \
  -d '{
    "AsetId": "0001/MLM/2025",
    "tanggal_perbaikan": "2025-12-06",
    "deskripsi": "Ganti layar",
    "biaya": 500000,
    "teknisi": "Budi",
    "status": "pending"
  }'
```

## Troubleshooting

### Error: "Unknown column 'user_id'"

Routes masih menggunakan struktur lama. Pastikan routes sudah diupdate untuk tidak menggunakan `user_id` di tabel transaksi.

### Error: "Unknown column 'Beban'"

Routes masih query `Beban` dari tabel `aset`. Gunakan JOIN dengan tabel `beban`:

```sql
SELECT a.id, b.kode as beban_kode
FROM aset a
LEFT JOIN beban b ON a.beban_id = b.id
WHERE a.AsetId = ?
```

### Error: "Unknown column 'AsetId' in 'field list'"

Tabel sekarang menggunakan `aset_id` (INT FK), bukan `AsetId` (VARCHAR). Update query untuk:

1. Ambil `aset.id` terlebih dahulu dari `AsetId`
2. Gunakan `aset.id` sebagai FK

### Error: "Unknown column 'tanggal'"

Tabel `perbaikan` sekarang menggunakan `tanggal_perbaikan`. Update routes untuk menggunakan field name yang benar.

## Rollback

Jika terjadi masalah, restore dari backup:

```bash
# Restore database
mysql -u root -p pemeliharaan-aset < backup_20251206_120000.sql
```

## Catatan Penting

1. **Semua routes harus diupdate** untuk menggunakan struktur tabel baru
2. **Tidak ada lagi kolom `user_id`** di tabel transaksi (perbaikan, rusak, dipinjam, dijual)
3. **`aset_id` adalah FK INTEGER**, bukan `AsetId` VARCHAR
4. **Field names telah berubah** - cek mapping di atas
5. **`record_id` di riwayat** sekarang berfungsi dengan benar untuk tracking

## Script Terkait

- `scripts/addMissingTables.js` - Untuk create tabel pertama kali (tanpa drop)
- `scripts/recreateTables.js` - **Script ini** - untuk recreate dengan drop existing data

## Support

Jika mengalami masalah:

1. Pastikan backup sudah dibuat
2. Cek log error di console
3. Verifikasi environment variables (`.env`)
4. Test routes satu per satu setelah migrasi
