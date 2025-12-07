# Implementasi Sistem Lokasi untuk Transaksi Aset

## Overview

Sistem telah diupdate agar operasi **perbaikan**, **rusak**, **dipinjam**, dan **dijual** menggunakan jumlah dari `aset_lokasi` instead of directly from `aset`.

## Migration Completed ✓

✅ **Database Schema Updated**

- Kolom `lokasi_id` telah ditambahkan ke tabel: `perbaikan`, `rusak`, `dipinjam`, `dijual`
- Foreign key constraint telah ditambahkan
- Script: `scripts/addLokasiIdToTransactions.js`

## Implementation Status

### 1. Perbaikan (routes/perbaikan.js) ✓ COMPLETED

**Changes:**

- POST endpoint now requires `lokasi_id`
- Validates lokasi exists and has sufficient stock
- Decreases `jumlah` from `aset_lokasi` based on `lokasi_id`
- Updates total `jumlah` in `aset` table using SUM from `aset_lokasi`
- Response includes `lokasi` and `lokasi_id` information

**API Usage:**

```bash
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{
    "AsetId": "0008/BNT-MEDIA/2025",
    "lokasi_id": 22,
    "tanggal_perbaikan": "2025-12-07",
    "deskripsi": "Ganti hard disk",
    "biaya": 500000,
    "teknisi": "John Doe",
    "status": "pending"
  }' \
  http://localhost:4000/perbaikan
```

**Response:**

```json
{
  "message": "Perbaikan ditambahkan",
  "perbaikan": {
    "id": 10,
    "aset_id": 124,
    "AsetId": "0008/BNT-MEDIA/2025",
    "NamaAset": "Access Point Ubiquiti",
    "tanggal_perbaikan": "2025-12-07",
    "deskripsi": "Ganti hard disk",
    "biaya": 500000,
    "teknisi": "John Doe",
    "status": "pending",
    "lokasi": "Lantai 1",
    "lokasi_id": 22
  }
}
```

### 2. Rusak (routes/rusak.js) - NEEDS UPDATE

**Required Changes:**

1. Add `lokasi_id` validation in POST endpoint
2. Check stock in `aset_lokasi` before inserting
3. Update INSERT query to include `lokasi_id`
4. Decrease `jumlah` from `aset_lokasi` instead of `aset`
5. Update total in `aset` using SUM from `aset_lokasi`

**Template Code:**

```javascript
// In POST /rusak endpoint
if (!data || !data.AsetId || !data.TglRusak || !data.lokasi_id) {
  return res.status(400).json({
    message: "AsetId, TglRusak, dan lokasi_id diperlukan",
  });
}

// Check lokasi exists and has stock
db.query(
  "SELECT * FROM aset_lokasi WHERE id = ? AND AsetId = ?",
  [data.lokasi_id, data.AsetId],
  (errLok, lokasiRows) => {
    if (errLok) return res.status(500).json(errLok);
    if (!lokasiRows || lokasiRows.length === 0) {
      return res.status(404).json({ message: "Lokasi tidak ditemukan" });
    }
    const lokasi = lokasiRows[0];
    const jumlahRusak = parseInt(data.jumlah_rusak) || 1;
    if (lokasi.jumlah < jumlahRusak) {
      return res.status(400).json({
        message: "Stok di lokasi tidak mencukupi",
        available: lokasi.jumlah,
        requested: jumlahRusak,
      });
    }

    // INSERT rusak with lokasi_id
    const q = `INSERT INTO rusak (aset_id, TglRusak, Kerusakan, jumlah_rusak, StatusRusak, catatan, lokasi_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const vals = [
      asetDbId,
      data.TglRusak,
      data.Kerusakan ?? null,
      jumlahRusak,
      data.StatusRusak ?? "temporary",
      data.catatan ?? null,
      data.lokasi_id,
    ];

    db.query(q, vals, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      const rusakId = result.insertId;

      // Update lokasi
      db.query(
        "UPDATE aset_lokasi SET jumlah = GREATEST(jumlah - ?, 0) WHERE id = ?",
        [jumlahRusak, data.lokasi_id],
        (errUpdateLok) => {
          if (errUpdateLok) {
            console.error("[rusak] Error updating lokasi:", errUpdateLok);
            return res.status(500).json(errUpdateLok);
          }

          // Update aset total
          db.query(
            "UPDATE aset SET jumlah = (SELECT COALESCE(SUM(jumlah), 0) FROM aset_lokasi WHERE AsetId = ?), StatusAset = 'rusak' WHERE AsetId = ?",
            [data.AsetId, data.AsetId],
            (errUpdate) => {
              if (errUpdate) {
                console.error("[rusak] Error updating aset:", errUpdate);
              }
              // Continue to response...
            }
          );
        }
      );
    });
  }
);
```

### 3. Dipinjam (routes/dipinjam.js) - NEEDS UPDATE

**Required Changes:**
Same pattern as rusak, but:

- Field: `jumlah_dipinjam` instead of `jumlah_rusak`
- StatusAset: `'dipinjam'`
- Include: `Peminjam`, `TglPinjam`, `TglKembali`, `StatusPeminjaman`

**API Example:**

```bash
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{
    "AsetId": "0008/BNT-MEDIA/2025",
    "lokasi_id": 23,
    "Peminjam": "Ahmad",
    "TglPinjam": "2025-12-07",
    "TglKembali": "2025-12-14",
    "jumlah_dipinjam": 2,
    "catatan": "Untuk event"
  }' \
  http://localhost:4000/dipinjam
```

### 4. Dijual (routes/dijual.js) - NEEDS UPDATE

**Required Changes:**
Same pattern, with fields:

- `TglDijual`, `HargaJual`, `Pembeli`, `jumlah_dijual`
- StatusAset: `'dijual'`

**API Example:**

```bash
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{
    "AsetId": "0008/BNT-MEDIA/2025",
    "lokasi_id": 24,
    "TglDijual": "2025-12-07",
    "HargaJual": 2000000,
    "Pembeli": "PT ABC",
    "jumlah_dijual": 3,
    "catatan": "Unit lama"
  }' \
  http://localhost:4000/dijual
```

## Benefits of This System

### 1. Location-Based Inventory

- Track exact location of each transaction
- Know which location has available stock
- Better asset distribution management

### 2. Automatic Synchronization

- `aset_lokasi.jumlah` decreases when transaction created
- `aset.jumlah` automatically updated from SUM of all locations
- No manual reconciliation needed

### 3. Stock Validation

- System prevents transactions if location stock insufficient
- Clear error messages with available vs requested quantities
- Prevents negative inventory

## How It Works

### Flow Diagram:

```
1. User requests transaction (perbaikan/rusak/dipinjam/dijual)
   └─> Must provide: AsetId + lokasi_id

2. System validates:
   ├─> Check aset exists
   ├─> Check lokasi exists and belongs to aset
   └─> Check lokasi has sufficient stock

3. Create transaction record:
   └─> INSERT into [perbaikan|rusak|dipinjam|dijual] with lokasi_id

4. Update inventories (in order):
   ├─> Step 1: UPDATE aset_lokasi SET jumlah = jumlah - X WHERE id = lokasi_id
   └─> Step 2: UPDATE aset SET jumlah = SUM(aset_lokasi.jumlah)

5. Log riwayat:
   └─> Include lokasi information in perubahan field

6. Return response:
   └─> Include lokasi and lokasi_id in response
```

### Database Relations:

```
aset (parent)
  ├─> aset_lokasi (distribution)
  │     ├─> id = 20, lokasi="Lantai 1", jumlah=5
  │     ├─> id = 21, lokasi="Lantai 2", jumlah=7
  │     └─> id = 22, lokasi="Lantai 3", jumlah=3
  │
  └─> perbaikan/rusak/dipinjam/dijual (transactions)
        └─> lokasi_id references aset_lokasi.id
```

## Testing Guide

### Step 1: Check Current Locations

```bash
curl -b test-cookies.txt \
  http://localhost:4000/aset-lokasi/aset/0008%2FBNT-MEDIA%2F2025
```

**Expected Response:**

```json
{
  "AsetId": "0008/BNT-MEDIA/2025",
  "NamaAset": "Access Point Ubiquiti",
  "total_aset": 15,
  "total_allocated": 15,
  "available": 0,
  "locations": [
    { "id": 22, "lokasi": "Lantai 1", "jumlah": 5 },
    { "id": 23, "lokasi": "Lantai 2", "jumlah": 7 },
    { "id": 24, "lokasi": "Lantai 3", "jumlah": 3 }
  ]
}
```

### Step 2: Create Transaction with Location

```bash
curl -X POST -H "Content-Type: application/json" -b test-cookies.txt \
  -d '{
    "AsetId": "0008/BNT-MEDIA/2025",
    "lokasi_id": 22,
    "tanggal_perbaikan": "2025-12-07",
    "deskripsi": "Test repair",
    "status": "pending"
  }' \
  http://localhost:4000/perbaikan
```

### Step 3: Verify Location Updated

```bash
curl -b test-cookies.txt \
  http://localhost:4000/aset-lokasi/aset/0008%2FBNT-MEDIA%2F2025
```

**Expected:**

- Lantai 1 (id: 22) should now have `jumlah: 4` (decreased by 1)
- `total_aset` should be 14
- `total_allocated` should be 14

### Step 4: Check Aset Total

```bash
curl -b test-cookies.txt \
  http://localhost:4000/aset/0008%2FBNT-MEDIA%2F2025
```

**Expected:**

- `jumlah` field should be 14 (sum of all locations)

## Error Handling

### 1. Missing lokasi_id

```json
{
  "message": "AsetId, tanggal_perbaikan, dan lokasi_id diperlukan"
}
```

### 2. Location Not Found

```json
{
  "message": "Lokasi tidak ditemukan"
}
```

### 3. Insufficient Stock

```json
{
  "message": "Stok di lokasi tidak mencukupi",
  "available": 2,
  "requested": 5
}
```

### 4. Location Doesn't Belong to Asset

```json
{
  "message": "Lokasi tidak ditemukan"
}
```

## Migration & Rollback

### Apply Migration:

```bash
node scripts/addLokasiIdToTransactions.js
```

### Rollback (if needed):

```sql
ALTER TABLE perbaikan DROP FOREIGN KEY fk_perbaikan_lokasi;
ALTER TABLE perbaikan DROP COLUMN lokasi_id;

ALTER TABLE rusak DROP FOREIGN KEY fk_rusak_lokasi;
ALTER TABLE rusak DROP COLUMN lokasi_id;

ALTER TABLE dipinjam DROP FOREIGN KEY fk_dipinjam_lokasi;
ALTER TABLE dipinjam DROP COLUMN lokasi_id;

ALTER TABLE dijual DROP FOREIGN KEY fk_dijual_lokasi;
ALTER TABLE dijual DROP COLUMN lokasi_id;
```

## Next Steps

### Immediate (Required):

1. ✓ Update routes/perbaikan.js - **DONE**
2. ⚠️ Update routes/rusak.js - **PENDING**
3. ⚠️ Update routes/dipinjam.js - **PENDING**
4. ⚠️ Update routes/dijual.js - **PENDING**

### Future Enhancements:

1. Add lokasi filter in GET endpoints
2. Add "return to location" feature for dipinjam
3. Add location history/transfer tracking
4. Dashboard showing distribution per location
5. Low stock alerts per location

## Notes

- Old transactions (before migration) will have `lokasi_id = NULL`
- System still works for old data (legacy support)
- New transactions MUST include `lokasi_id`
- Frontend needs to be updated to:
  1. Fetch available locations for an asset
  2. Show dropdown to select location
  3. Display available stock per location
  4. Pass `lokasi_id` in POST requests

---

**Last Updated:** December 7, 2025  
**Status:** Perbaikan implemented, others pending
