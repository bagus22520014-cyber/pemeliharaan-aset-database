**Panduan Khusus — Approval & Efek Samping Transaksi**

Panduan singkat ini menjelaskan perilaku approval untuk transaksi penting (`mutasi`, `dijual`, `perbaikan`, `rusak`, `dipinjam`) dan langkah E2E untuk verifikasi.

- **Tujuan**: menjelaskan apa yang berubah otomatis saat pengajuan dibuat atau disetujui, serta perintah `curl` dan query verifikasi.

**Ringkasan Perilaku**

- `mutasi`: saat dibuat → tidak mengubah aset. Saat disetujui → `aset.departemen_id` dan `aset.Lokasi` di-update ke target; entry riwayat `apply_mutasi` ditambahkan.
- `dijual`: saat dibuat → `aset.StatusAset` di-set ke `dijual`; jika dibuat oleh `admin` (auto-`disetujui`) atau jika pengajuan kemudian disetujui, maka `aset.NilaiAset` di-set ke `0`.
- `perbaikan`: saat dibuat → `aset.StatusAset` di-set ke `diperbaiki` (pada create yang diajukan); saat disetujui → `aset.StatusAset` di-set ke `aktif`.
- `rusak` / `dipinjam`: create mengubah `StatusAset` ke `rusak`/`dipinjam`; approval mengunci/konfirmasi status sesuai tipe.

**Catatan penting**

- Endpoint approval mengharapkan JSON body. Jika tidak mengirim body, kirim body kosong `{}` pada `POST /approval/:tabelRef/:recordId/approve` untuk menghindari error destructuring.
- Beberapa perubahan (kode route) memerlukan restart server agar patch aktif. Restart dengan:

```bash
npm start
```

**E2E: Mutasi (create → approve → verifikasi)**

1. Buat mutasi (user atau admin):

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" \
  -d '{"AsetId":"0001/MLG-NET/2025","departemen_tujuan_id":3,"ruangan_tujuan":"Ruang Arsip"}' \
  http://localhost:4000/mutasi
```

2. Approve mutasi (admin):

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" \
  -d '{}' \
  http://localhost:4000/approval/mutasi/<id>/approve
```

3. Verifikasi aset terupdate:

```sql
SELECT id, AsetId, departemen_id, Lokasi FROM aset WHERE AsetId = '0001/MLG-NET/2025';
```

4. Verifikasi riwayat apply_mutasi:

```sql
SELECT * FROM riwayat WHERE tabel_ref='mutasi' AND record_id = <id> ORDER BY created_at DESC;
```

**E2E: Dijual (create auto-approve as admin → verify NilaiAset=0)**

1. Buat `dijual` sebagai admin (auto-disetujui):

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" \
  -d '{"AsetId":"0003/MLG-NET/2025","tanggal_jual":"2025-12-20","harga_jual":500000,"pembeli":"Toko Test","alasan":"test dijual"}' \
  http://localhost:4000/dijual
```

2. (Jika dibuat oleh user biasa) Approve sebagai admin:

```bash
curl -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" -d '{}' http://localhost:4000/approval/dijual/<id>/approve
```

3. Verifikasi `NilaiAset` menjadi 0:

```sql
SELECT id, AsetId, NilaiAset FROM aset WHERE AsetId = '0003/MLG-NET/2025';
```

**Verification tips & troubleshooting**

- Jika approval endpoint memberi TypeError saat Anda tidak mengirim body, sertakan `{}` sebagai body.
- Jika mutasi create gagal karena FK departemen, pastikan `departemen_tujuan_id` valid. Daftar departemen: `GET /departemen`.
- Untuk melihat riwayat pengajuan/approval: `GET /riwayat?tabel_ref=mutasi&record_id=<id>` atau sesuaikan `tabel_ref`.

**Lokasi file & kode relevan**

- Route approval pusat: [routes/approval.js](routes/approval.js#L1)
- Mutasi route: [routes/mutasi.js](routes/mutasi.js#L1)
- Dijual route: [routes/dijual.js](routes/dijual.js#L1)
- Middleware approval helpers: [routes/middleware/approval.js](routes/middleware/approval.js#L1)

**Tambahan**

- Jika ingin audit tambahan saat `dijual` disetujui (mis. riwayat `apply_dijual`), saya bisa tambahkan riwayat insert di `routes/approval.js` — mau saya tambahkan sekarang?

---

Panduan ini singkat dan praktis — beri tahu jika Anda mau versi lebih lengkap (gambar alur, matrix role, atau steps CI tests).
