# Panduan E2E: Mutasi — Create → Approve → Verify

Ringkasan

- Panduan ini menunjukkan langkah end-to-end untuk membuat pengajuan `mutasi`, menyetujui (admin), dan memverifikasi bahwa perubahan diterapkan ke tabel `aset` serta tercatat di `riwayat`.

Prasyarat

- Server berjalan: `http://localhost:4000`.
- Akses DB untuk verifikasi (opsional).
- Header auth sederhana didukung: `x-username` dan `x-role`.
- Backup database bila di lingkungan produksi.

Langkah singkat (inti)

1. Cari numeric `aset.id` berdasarkan `AsetId` string:

```bash
curl -sS -H "Accept: application/json" -H "x-username: admin" -H "x-role: admin" \
  "http://localhost:4000/aset?AsetId=0001/MLG-NET/2025"
```

- Catat `id` dari objek hasil (mis. `66`).

2. Buat mutasi (contoh sebagai admin — langsung `disetujui`):

```bash
curl -sS -X POST -H "Content-Type: application/json" \
  -H "x-username: admin" -H "x-role: admin" \
  -d '{
    "aset_id": 66,
    "TglMutasi": "2025-12-12",
    "departemen_asal_id": 2,
    "departemen_tujuan_id": 3,
    "ruangan_asal": "Ruang Lama",
    "ruangan_tujuan": "Ruang Baru",
    "alasan": "Relokasi",
    "catatan": "E2E test"
  }' \
  http://localhost:4000/mutasi
```

- Response: objek `{ "id": <mutasi_id>, "message": "Mutasi created successfully" }`.

3. (Jika `approval_status` = `diajukan`) Approve sebagai admin:

```bash
curl -sS -X POST -H "Content-Type: application/json" \
  -H "x-username: admin" -H "x-role: admin" -d '{}' \
  http://localhost:4000/approval/mutasi/<MUTASI_ID>/approve
```

- Response: konfirmasi berisi `status: "disetujui"`.

4. Verifikasi aset berubah (SQL):

```sql
SELECT id, AsetId, departemen_id, Lokasi FROM aset WHERE AsetId = '0001/MLG-NET/2025';
```

- Diharapkan: `departemen_id` dan `Lokasi` sesuai `departemen_tujuan_id` dan `ruangan_tujuan`.

5. Verifikasi riwayat (audit):

```bash
curl -sS -H "Accept: application/json" -H "x-username: admin" -H "x-role: admin" \
  "http://localhost:4000/riwayat?tabel_ref=mutasi&record_id=<MUTASI_ID>"
```

- Cari `jenis_aksi = 'apply_mutasi'` dan periksa field `perubahan` berisi `from` dan `to`.

Catatan penting

- Jika server baru saja di-patch (kode approval berubah), restart server sebelum menguji.
- Approval endpoint kadang mengharuskan request body (kode meng-destructure `req.body.alasan`), kirim `{}` jika tidak ada `alasan`.

Contoh alur minimal (curl sekali jalan)

- Dapat dijalankan interaktif; ganti placeholder:

```bash
# 1) cari id numeric (ambil angka dari output)
curl -sS -H "Accept: application/json" -H "x-username: admin" -H "x-role: admin" "http://localhost:4000/aset?AsetId=0001/MLG-NET/2025"

# 2) create mutasi (ganti 66 dengan id nyata)
curl -sS -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" \
  -d '{"aset_id":66,"TglMutasi":"2025-12-12","departemen_asal_id":2,"departemen_tujuan_id":3,"ruangan_asal":"a","ruangan_tujuan":"Ruang Arsip","alasan":"E2E","catatan":"test"}' \
  http://localhost:4000/mutasi

# 3) approve (ganti <MUTASI_ID>)
curl -sS -X POST -H "Content-Type: application/json" -H "x-username: admin" -H "x-role: admin" -d '{}' http://localhost:4000/approval/mutasi/<MUTASI_ID>/approve

# 4) verify aset
curl -sS -H "Accept: application/json" -H "x-username: admin" -H "x-role: admin" "http://localhost:4000/aset?AsetId=0001/MLG-NET/2025"
```

Rollback manual (jika perlu)

- Kembalikan nilai lama pada `aset` lewat SQL, lalu catat riwayat `revert_mutasi`:

```sql
UPDATE aset SET departemen_id = <OLD_DEP>, Lokasi = '<OLD_LOKASI>' WHERE id = <ASSET_ID>;

INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id)
VALUES ('revert_mutasi', <ADMIN_ID>, 'admin', <ASSET_ID>, JSON_OBJECT('revert_from', JSON_OBJECT('departemen_id', <BAD_DEP>, 'Lokasi', '<BAD_LOKASI>'), 'revert_to', JSON_OBJECT('departemen_id', <OLD_DEP>, 'Lokasi', '<OLD_LOKASI>')), 'mutasi', <MUTASI_ID>);
```

Troubleshooting cepat

- "User tidak ditemukan" saat create: kirim header valid `x-username` yang ada di tabel `user` atau gunakan cookie login.
- FK error saat `departemen_tujuan_id` invalid: cek `GET /departemen` sebagai admin lalu gunakan `id` valid.
- Jika approval tidak menerapkan perubahan: restart server lalu ulangi approve (server harus menjalankan versi kode yang memanggil apply logic).

Otomasi cepat (PowerShell) — contoh pendek

- Jika mau saya bisa tambahkan script `scripts/e2e-mutasi.ps1` yang menjalankan langkah-langkah di atas dan mem-parsing responses; konfirmasi kalau ingin saya buat.

---

File ini dibuat sebagai panduan praktis untuk pengujian end-to-end mutasi.
