# Panduan Khusus: Persetujuan Mutasi (Apply-on-Approve)

Tujuan

- Menjelaskan perilaku baru: ketika sebuah record `mutasi` _disetujui_, sistem otomatis menerapkan perubahan tujuan ke tabel `aset` (update `departemen_id` dan `Lokasi`). Jika `mutasi` ditolak, tidak ada perubahan pada `aset`.

Ringkasan Perilaku

- Sumber data mutasi: kolom `departemen_tujuan_id` dan `ruangan_tujuan` pada tabel `mutasi`.
- Saat admin melakukan `approve` pada `mutasi`:
  - Sistem membaca `mutasi` yang disetujui.
  - Meng-update `aset.departemen_id = departemen_tujuan_id` dan `aset.Lokasi = ruangan_tujuan` untuk `aset.id = mutasi.aset_id`.
  - Menyimpan entri audit baru di tabel `riwayat` dengan `jenis_aksi = 'apply_mutasi'` yang menyimpan perubahan dari->ke.
- Saat `mutasi` ditolak: tidak ada perubahan pada tabel `aset`.

Prasyarat

- Lakukan backup database sebelum melakukan uji atau perubahan di lingkungan produksi.
- Jalankan server pada `http://localhost:4000` (sesuaikan `PORT` jika berbeda).

API dan Lokasi Kode

- Approval endpoint (admin): POST `/approval/:tabelRef/:recordId/:action` — contoh untuk mutasi: POST `/approval/mutasi/123/approve`.
- Implementasi utama berada di: [routes/approval.js](routes/approval.js) dan [routes/mutasi.js](routes/mutasi.js).

Langkah Uji Manual (contoh cepat)

1. Buat mutasi (client atau curl) — lihat API mutasi; contoh minimal (sesuaikan fields dan auth):

- Contoh membuat mutasi (sederhana, gunakan API yang ada di proyek):
  - POST `/mutasi` dengan body JSON berisi `aset_id`, `departemen_asal_id`, `departemen_tujuan_id`, `ruangan_asal`, `ruangan_tujuan`.

2. Periksa status awal aset (catat nilai sebelum approve):

- Query:

```sql
SELECT id, AsetId, departemen_id, Lokasi, StatusAset FROM aset WHERE id = <aset_id>;
```

3. Approve mutasi (sebagai admin):

- Contoh curl:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -H "x-username: admin" -H "x-role: admin" \
  http://localhost:4000/approval/mutasi/<mutasi_id>/approve
```

- Respon yang diharapkan: JSON berisi message konfirmasi dan status `disetujui`.

4. Verifikasi perubahan pada `aset`:

- Query verifikasi:

```sql
SELECT id, AsetId, departemen_id, Lokasi FROM aset WHERE id = <aset_id>;
```

- Diharapkan: `departemen_id` dan `Lokasi` telah berubah sesuai nilai `departemen_tujuan_id` dan `ruangan_tujuan` pada record `mutasi`.

5. Verifikasi entri riwayat (audit):

- Query riwayat untuk mutasi yang diaplikasikan:

```sql
SELECT * FROM riwayat WHERE tabel_ref = 'mutasi' AND record_id = <mutasi_id> ORDER BY created_at DESC LIMIT 5;
```

- Carilah entri dengan `jenis_aksi = 'apply_mutasi'` atau perubahan yang menunjukkan objek `apply_mutasi` dengan `from` dan `to`.

Tes Penolakan (reject)

- Jika admin menolak:

```bash
curl -X POST -H "x-username: admin" -H "x-role: admin" http://localhost:4000/approval/mutasi/<mutasi_id>/reject
```

- Verifikasi: `aset` tidak berubah (jalankan query verifikasi di atas) dan riwayat memiliki entri approval ditolak.

Rollback & Revert

- Jika perlu membatalkan perubahan setelah apply, lakukan manual rollback dan catat riwayat:

```sql
-- Contoh revert manual: set kembali ke nilai lama (isi dengan nilai sebelumnya)
UPDATE aset SET departemen_id = <old_dep>, Lokasi = '<old_lokasi>' WHERE id = <aset_id>;

-- Tambahkan riwayat revert
INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id)
VALUES (
  'revert_mutasi', <admin_user_id>, 'admin', <aset_id>,
  JSON_OBJECT('revert_from', JSON_OBJECT('departemen_id', <bad_dep>, 'Lokasi', '<bad_lokasi>'), 'revert_to', JSON_OBJECT('departemen_id', <old_dep>, 'Lokasi', '<old_lokasi>')),
  'mutasi', <mutasi_id>
);
```

Catatan Operasional

- Audit: perubahan hasil approve dicatat dalam `riwayat` dengan `jenis_aksi='apply_mutasi'`.
- Notifikasi: implementasi approval akan tetap memicu notifikasi kepada submitter (lihat mekanisme notifikasi di `routes/middleware/approval.js`).
- Behavior backward-compatibility: logika ini hanya dijalankan saat `approval` berstatus `disetujui`.

Troubleshooting

- Jika `aset` tidak berubah setelah approval:
  - Cek response dari endpoint approval untuk error.
  - Periksa log server (console) untuk error DB saat update.
  - Pastikan `mutasi` record memiliki `aset_id`, `departemen_tujuan_id`, atau `ruangan_tujuan` yang valid.

Tautan Kode Terkait

- [routes/approval.js](routes/approval.js)
- [routes/mutasi.js](routes/mutasi.js)

Butuh contoh `curl` yang lebih lengkap (dengan body mutasi dan nilai nyata)?

---

Panduan ini singkat dan praktis — ingin saya tambahkan checklist verifikasi otomatis (script SQL / Node) atau contoh payload lengkap untuk `POST /mutasi`?

**Penjelasan Kode (ringkas)**

- **`routes/approval.js` — peran utama**: endpoint approval umum untuk banyak `tabel_ref`.

  - Endpoints utama:
    - `GET /approval/pending` — list pengajuan yang berstatus `diajukan`.
    - `GET /approval/:tabelRef/:recordId` — lihat detil record yang diajukan.
    - `POST /approval/:tabelRef/:recordId/:action` — approve atau reject (action = `approve`|`reject`).
  - Interaksi penting:

    - Menggunakan helper dari `routes/middleware/approval.js`: `updateApprovalStatus`, `logApprovalAction`, `notifySubmitterOfDecision`, `getPendingApprovals`.
    - Saat approve, logic mencoba meng-_merge_ informasi approval ke entri `riwayat` input yang paling relevan; bila tidak ada, akan membuat entri riwayat baru.
    - Menetapkan `StatusAset` untuk beberapa jenis transaksi (mis. `rusak`, `dipinjam`, `dijual`, dan khusus `perbaikan` -> `aktif`).
    - Perubahan penting yang ditambahkan: ketika `tabelRef === 'mutasi'` dan action adalah `approve`, kode sekarang:
      1. Membaca record `mutasi` (kolom `aset_id`, `departemen_tujuan_id`, `ruangan_tujuan`).
      2. Membaca nilai lama dari `aset` (`departemen_id`, `Lokasi`).
      3. Menjalankan `UPDATE aset SET departemen_id = ?, Lokasi = ? WHERE id = ?` untuk menerapkan mutasi.
      4. Menyisipkan entri `riwayat` baru dengan `jenis_aksi = 'apply_mutasi'` yang berisi objek `from` dan `to` untuk audit.

  - Catatan implementasi: semua langkah apply dilakukan hanya saat status berubah menjadi `disetujui`; jika `reject`, kode tidak mengubah tabel `aset`.

- **`routes/mutasi.js` — peran utama**: CRUD untuk pengajuan mutasi dan penyiapan data mutasi.
  - Endpoints utama:
    - `GET /mutasi` — daftar mutasi (admin melihat semua; user terbatas ke beban mereka).
    - `GET /mutasi/:id` dan `GET /mutasi/aset/:asetId` — baca mutasi spesifik.
    - `POST /mutasi` — buat pengajuan mutasi. Menentukan `approval_status` awal berdasarkan role (`admin` => `disetujui`, user => `diajukan`).
    - `PUT /mutasi/:id` — update mutasi (admin only).
    - `DELETE /mutasi/:id` — hapus mutasi (admin only).
  - Interaksi penting:
    - Saat membuat mutasi, fungsi `logRiwayat('mutasi_input', ...)` menyimpan payload input ke tabel `riwayat` sehingga approval later dapat di-_merge_.
    - Jika pengaju bukan `admin`, helper `notifyAdminsForApproval()` dikirim untuk memberi tahu admin.
    - `mutasi.js` tidak menerapkan perubahan ke `aset` pada saat create — penerapan dilakukan oleh mekanisme approval (di `approval.js`) saat admin menyetujui.

**Cuplikan kode relevan (ringkas)**

1. Update `aset` saat approve mutasi (disederhanakan):

```sql
UPDATE aset SET departemen_id = ?, Lokasi = ? WHERE id = ?;
```

2. Insert riwayat apply_mutasi (disederhanakan):

```sql
INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id)
VALUES ('apply_mutasi', <admin_id>, 'admin', <aset_id>, '<json_perubahan>', 'mutasi', <mutasi_id>);
```

Jika mau, saya bisa menambahkan cuplikan payload JSON lengkap untuk `POST /mutasi` dan contoh end-to-end curl (create -> approve -> verify).

---

## Contoh Test End-to-End: Aset `0001/MLG-NET/2025`

### Persiapan

1. **Cek data awal aset** (catat nilai `id`, `departemen_id`, dan `Lokasi`):

```sql
SELECT id, AsetId, NamaAset, departemen_id, Lokasi, StatusAset
FROM aset
WHERE AsetId = '0001/MLG-NET/2025';
```

**Contoh hasil**:

- `id`: 123
- `departemen_id`: 5 (misalnya IT)
- `Lokasi`: "Ruang Server A"

2. **Cek daftar departemen** (untuk tahu ID tujuan):

```sql
SELECT id, kode, nama FROM departemen;
```

**Contoh**:

- `id=5, kode=IT, nama=Information Technology`
- `id=7, kode=FIN, nama=Finance`

### Langkah 1: Buat Mutasi (sebagai user atau admin)

**Login sebagai user** (jika belum):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"bagus","password":"bagus123"}' \
  http://localhost:4000/user/login \
  -c cookies-bagus.txt
```

**Buat mutasi** (contoh: pindah dari IT ke Finance, dari Ruang Server A ke Ruang Arsip):

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b cookies-bagus.txt \
  -d '{
    "aset_id": 123,
    "TglMutasi": "2025-12-12",
    "departemen_asal_id": 5,
    "departemen_tujuan_id": 7,
    "ruangan_asal": "Ruang Server A",
    "ruangan_tujuan": "Ruang Arsip",
    "alasan": "Relokasi aset untuk efisiensi ruang",
    "catatan": "Test mutasi approval flow"
  }' \
  http://localhost:4000/mutasi
```

**Response yang diharapkan**:

```json
{
  "id": 45,
  "message": "Mutasi created successfully"
}
```

**Catat `mutasi_id`** (contoh: `45`) untuk langkah berikutnya.

### Langkah 2: Verifikasi Status Sebelum Approval

**Cek status mutasi**:

```bash
curl -X GET \
  -b cookies-bagus.txt \
  http://localhost:4000/mutasi/45
```

**Expected**: `approval_status: "diajukan"` (jika dibuat oleh user).

**Cek aset** (seharusnya **belum berubah**):

```sql
SELECT id, AsetId, departemen_id, Lokasi
FROM aset
WHERE AsetId = '0001/MLG-NET/2025';
```

**Expected**: masih `departemen_id=5, Lokasi="Ruang Server A"`.

### Langkah 3: Approve Mutasi (sebagai admin)

**Login sebagai admin**:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin"}' \
  http://localhost:4000/user/login \
  -c admin-cookies.txt
```

**Approve mutasi**:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  http://localhost:4000/approval/mutasi/45/approve
```

**Response yang diharapkan**:

```json
{
  "message": "Pengajuan mutasi berhasil disetujui",
  "tabel_ref": "mutasi",
  "record_id": "45",
  "status": "disetujui",
  "alasan": null
}
```

### Langkah 4: Verifikasi Perubahan Setelah Approval

**Cek aset** (seharusnya **sudah berubah**):

```sql
SELECT id, AsetId, departemen_id, Lokasi
FROM aset
WHERE AsetId = '0001/MLG-NET/2025';
```

**Expected**: sekarang `departemen_id=7, Lokasi="Ruang Arsip"`.

**Cek riwayat apply_mutasi**:

```sql
SELECT * FROM riwayat
WHERE tabel_ref = 'mutasi'
  AND record_id = 45
  AND jenis_aksi = 'apply_mutasi';
```

**Expected**: ada entri baru dengan `perubahan` JSON berisi:

```json
{
  "apply_mutasi": {
    "from": { "departemen_id": 5, "Lokasi": "Ruang Server A" },
    "to": { "departemen_id": 7, "Lokasi": "Ruang Arsip" }
  }
}
```

**Cek notifikasi user** (optional):

```bash
curl -X GET \
  -b cookies-bagus.txt \
  http://localhost:4000/notification
```

**Expected**: ada notifikasi bahwa mutasi telah disetujui.

### Test Reject (opsional)

**Buat mutasi kedua**:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b cookies-bagus.txt \
  -d '{
    "aset_id": 123,
    "TglMutasi": "2025-12-13",
    "departemen_asal_id": 7,
    "departemen_tujuan_id": 5,
    "ruangan_asal": "Ruang Arsip",
    "ruangan_tujuan": "Ruang Server B",
    "alasan": "Test reject flow"
  }' \
  http://localhost:4000/mutasi
```

**Catat `mutasi_id`** (misalnya `46`).

**Reject sebagai admin**:

```bash
curl -X POST \
  -H "Content-Type: application/json" \
  -b admin-cookies.txt \
  -d '{"alasan": "Tidak sesuai kebijakan"}' \
  http://localhost:4000/approval/mutasi/46/reject
```

**Verifikasi aset tidak berubah**:

```sql
SELECT id, AsetId, departemen_id, Lokasi
FROM aset
WHERE AsetId = '0001/MLG-NET/2025';
```

**Expected**: masih `departemen_id=7, Lokasi="Ruang Arsip"` (tidak berubah karena reject).

### Checklist Verifikasi

- ✅ Mutasi dibuat dengan status `diajukan` (user) atau `disetujui` (admin)
- ✅ Admin menerima notifikasi pengajuan (jika dibuat oleh user)
- ✅ Approve berhasil mengubah `aset.departemen_id` dan `aset.Lokasi`
- ✅ Entri `riwayat` dengan `jenis_aksi='apply_mutasi'` tercatat
- ✅ User menerima notifikasi keputusan approval
- ✅ Reject tidak mengubah data `aset`

### Troubleshooting

**Error: "aset_id dan TglMutasi wajib diisi"**

- Pastikan payload JSON berisi `aset_id` (integer ID dari tabel `aset`, bukan `AsetId` string).

**Error: "Akses ditolak: aset tidak ditemukan"**

- User mencoba mutasi aset di luar beban mereka. Pastikan user memiliki akses ke beban aset.

**Aset tidak berubah setelah approve**

- Cek log server untuk error DB.
- Pastikan `departemen_tujuan_id` valid (ada di tabel `departemen`).
- Verifikasi `mutasi.approval_status` sudah `disetujui`.
