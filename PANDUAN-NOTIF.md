PANDUAN NOTIFIKASI — pemeliharaan-aset-database

Tujuan

- Panduan ini menjelaskan alur, skema, API, contoh penggunaan, pemeriksaan DB, debugging, dan cleanup untuk sistem notifikasi aplikasi.

Ringkasan singkat alur

- Saat user membuat pengajuan (mutasi/perbaikan/rusak/dipinjam/dijual) oleh user biasa -> sistem membuat riwayat input dan memanggil `notifyAdminsForApproval()` untuk memberi tahu admin.
- Saat admin mengambil keputusan (approve/reject) -> sistem memanggil `notifySubmitterOfDecision()` untuk membuat satu notifikasi yang ditujukan hanya kepada submitter (pengaju).
- Saat admin membuat langsung (auto-approve) beberapa route dapat menerapkan efek domain (contoh: `dijual` men-set `NilaiAset=0`).

Lokasi kode terkait

- `routes/notification.js` — API endpoint untuk membaca/menandai/hapus notifikasi.
- `routes/middleware/approval.js` — helper notifikasi (`notifySubmitterOfDecision`, `notifyAdminsForApproval`).
- `routes/approval.js` — logika pusat approve/reject yang memanggil helper dan menerapkan efek (mutasi apply, set NilaiAset=0, set StatusAset dsb.).
- `routes/mutasi.js`, `routes/dijual.js`, `routes/perbaikan.js`, `routes/rusak.js`, `routes/dipinjam.js` — membuat pengajuan dan menulis riwayat.

Skema tabel `notification` (ringkasan kolom penting)

- `id` (PK)
- `user_id` (nullable) — target user id; NULL berarti broadcast (visible ke admin / sesuai filter beban)
- `beban` (nullable) — optional beban target (string)
- `type` / `tipe` — "success", "info", "warning", "danger" (dipakai pada UI)
- `judul` / `message` / `pesan` — isi notifikasi
- `link` — path/URL untuk klik
- `tabel_ref`, `record_id`, `AsetId` — referensi ke entitas yang memicu notifikasi
- `approver_user_id`, `approver_username`, `approver_role` — info approver bila notifikasi berasal dari keputusan
- `dibaca`, `waktu_dibuat`, `waktu_dibaca` — status dan timestamp

API endpoints (opsional headers: `x-username`, `x-role`, `x-beban` / cookies)

- GET `/notification`

  - Deskripsi: ambil notifikasi untuk user saat ini (atau admin melihat semua yang user-specific/NULL).
  - Query: `limit` (default 50), `dibaca=true|false`
  - Headers: `x-username`, `x-role`, `x-beban` (untuk simulasi)
  - Response: `{ total, notifications: [...] }`

- GET `/notification/unread-count`

  - Deskripsi: hitung notifikasi belum dibaca untuk user (memperhitungkan beban jika bukan admin).

- PUT `/notification/:id/read`

  - Deskripsi: tandai notifikasi tertentu sudah dibaca (hanya target user atau admin untuk semua).
  - Headers: `x-username`, `x-role`.

- PUT `/notification/read-all`

  - Deskripsi: tandai semua notifikasi (yang visible ke user) sudah dibaca.

- DELETE `/notification/:id`
  - Deskripsi: hapus notifikasi (user hanya bisa menghapus miliknya, admin bisa menghapus semua).

Format notifikasi standar (contoh dari keputusan approve mutasi)

- `type`/`tipe`: `success`
- `judul`: `Pengajuan Disetujui` atau `Pengajuan Ditolak`
- `pesan`: `Pengajuan mutasi untuk aset <AsetId> telah disetujui oleh <approver_username>`
- `tabel_ref`: `mutasi`
- `record_id`: <mutasi_id>
- `AsetId`: <AsetId>
- `approver_*`: diisi dengan info approver

Contoh curl / E2E (langkah demi langkah)

1. Buat asset (admin) — contoh payload lihat `test-aset-mlg.json`

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" -d @test-aset-mlg.json http://localhost:4000/aset
```

2. Buat mutasi sebagai user (atau gunakan debug helper untuk menyertakan submitter)

- Normal flow (user membuat mutasi):

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: user1" -H "x-role: user" -H "x-beban: MLG-MEDIA" -d '{"aset_id":<numeric_asset_id>,"TglMutasi":"2025-12-13","departemen_tujuan_id":1,"ruangan_tujuan":"Ruang Uji","alasan":"Test"}' http://localhost:4000/mutasi
```

- Debug helper (admin membuat mutasi + riwayat dengan submitter):

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" -d '{"aset_id":80,"TglMutasi":"2025-12-13","departemen_tujuan_id":1,"ruangan_tujuan":"Ruang Uji","submitter_username":"user1","alasan":"Test"}' http://localhost:4000/debug/create-mutasi-with-submit
```

3. Approve pengajuan (admin) — kirim body `{}` jika endpoint mengharuskan body

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" -d '{}' http://localhost:4000/approval/mutasi/<mutasi_id>/approve
```

4. Cek notifikasi untuk submitter

```bash
curl -H "x-username: user1" -H "x-role: user" http://localhost:4000/notification
```

5. Tandai notifikasi sebagai dibaca (submitter)

```bash
curl -X PUT -H "x-username: user1" -H "x-role: user" http://localhost:4000/notification/<notification_id>/read
```

Pemeriksaan DB (via API atau SQL)

- Cek riwayat yang menyatakan `mutasi_input` dan `apply_mutasi`:

  - API: `GET /riwayat?aset_id=<aset_numeric_id>`
  - SQL: `SELECT * FROM riwayat WHERE aset_id = <id> ORDER BY created_at DESC`

- Cek notifikasi:

  - API: `GET /notification` (sebagai user)
  - SQL: `SELECT * FROM notification WHERE user_id = <submitter_id> ORDER BY waktu_dibuat DESC`

- Contoh cleanup SQL untuk test rows

```sql
DELETE FROM notification WHERE id = 12; -- contoh notification id
DELETE FROM riwayat WHERE id IN (246,247); -- contoh riwayat ids
DELETE FROM mutasi WHERE id = 56; -- contoh mutasi id
DELETE FROM aset WHERE id = 80; -- optional: hapus asset test
```

Debugging & tips

- Jika submitter tidak menerima notifikasi:

  - Periksa apakah riwayat input (`mutasi_input`) tercatat dan berisi `user_id` pengaju.
  - Jika tidak, approval code mencoba fallback mencari riwayat terakhir; pastikan ada riwayat terkait `tabel_ref` & `record_id`.
  - Pastikan `notifySubmitterOfDecision()` dipanggil — cek logs pada `routes/approval.js`.
  - Periksa filter role/beban saat mengambil notifikasi: user normal hanya melihat notifikasi yang `user_id` sama atau `beban` cocok.

- Jika admin tidak melihat notifikasi yang bersifat broadcast:
  - Admin melihat notifikasi user-agnostic (user_id IS NULL) hanya jika query tidak membatasi berdasarkan beban; admin bypass beban filtering.

Best practices

- Selalu buat riwayat `mutasi_input`/`perbaikan_input` dengan `user_id` saat membuat pengajuan agar fallback tidak diperlukan.
- Gunakan debug helper (`/debug/create-mutasi-with-submit`) untuk membuat test payload dengan submitter.
- Jangan broadcast sensitif info; prefer target user_id untuk keputusan.

Contoh pesan notifikasi (format teks)

- Approve mutasi: `[Pengajuan Disetujui] Pengajuan mutasi untuk aset <AsetId> telah disetujui oleh <approver_username>`
- Reject mutasi: `[Pengajuan Ditolak] Pengajuan mutasi untuk aset <AsetId> ditolak. Alasan: <alasan>`

Penutup

- Panduan ini fokus pada aspek notifikasi: bagaimana dipicu, apa yang dicatat, API yang tersedia, contoh E2E, pemeriksaan DB, debugging, dan pembersihan test data.
- File sumber kode utama untuk referensi: `routes/notification.js`, `routes/approval.js`, `routes/middleware/approval.js`, `routes/mutasi.js`.

Jika mau, saya bisa:

- Tambahkan contoh skrip `curl` yang menjalankan seluruh E2E secara otomatis.
- Tambahkan helper SQL atau endpoint cleanup khusus untuk test data.
