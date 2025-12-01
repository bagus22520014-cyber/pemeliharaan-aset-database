# Pemeliharaan Aset Database

This project is a minimal Node.js/Express API for managing assets with a MySQL backend.

## Upload images

Files are stored in `assets/imgs/` and served at `/assets/imgs/<filename>`.

- Create asset with image (user or admin):

```bash
curl -v -X POST -b cookies.txt -F "AsetId=0008/SRG-NET/2019" \
  -F "NamaAset=Perangkat OLT" -F "Beban=SRG-NET" -F "Gambar=@./olt.jpg" \
  http://localhost:4000/aset
```

- Replace image for existing asset (admin only):

```bash
curl -v -X PUT -b admin-cookies.txt -F "Gambar=@./olt2.jpg" \
  http://localhost:4000/aset/0008%2FSRG-NET%2F2019/gambar
```

- Verify asset and image:

```bash
curl -v -b cookies.txt http://localhost:4000/aset/0008%2FSRG-NET%2F2019
# The JSON `Gambar` points to /assets/imgs/<filename>
```

## Notes

- Admin required for update/delete/image replace. Users can create assets.
- Image uploads are limited to 5MB and must be image MIME types (image/\*).

## Stored image path in DB

`Gambar` now stores the full URL path `/assets/imgs/<filename>` (so clients don't need to prefix it).

If you have existing filename-only values in `Gambar` and want to update them to the full path, run this script:

```bash
node scripts/prefixGambarPaths.js
```

## Schema changes / Migration

To add the new column `StatusAset` to your `aset` table, run the migration script:

```bash
node scripts/addColumns.js
```

This will add:

- `StatusAset` ENUM('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif'

If you prefer SQL directly, run the SQL below:

```sql
ALTER TABLE aset
  ADD COLUMN StatusAset ENUM('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif';
```

If you need to create the entire `aset` table from scratch (use with care), run the new init script that will create the table if missing, or report missing/incorrect columns:

```bash
node scripts/initAsetTable.js
# Use APPLY_SCHEMA=true to automatically add missing columns (dangerous - backup first)
APPLY_SCHEMA=true node scripts/initAsetTable.js
```

## Perbaikan (Repairs)

New `perbaikan` endpoints let you track repair/maintenance records for assets. There is also a migration script to create the table:

```bash
node scripts/addPerbaikanTable.js
```

Endpoints (role-aware):

- Create a perbaikan (user or admin):

```bash
curl -v -X POST -H "x-role: admin" -H "Content-Type: application/json" -d '{"AsetId":"0001/HO/2019","tanggal":"2025-11-30","vendor":"Vendor ABC","PurchaseOrder":"PO-123","bagian":"IT","nominal":500000}' http://localhost:4000/perbaikan
```

- List all perbaikan (admin):

```bash
curl -v -H "x-role: admin" http://localhost:4000/perbaikan
```

- List perbaikan for a given asset by `AsetId` (two ways):

1. Query parameter:

```bash
curl -v -H "x-role: admin" "http://localhost:4000/perbaikan?asetId=0001/HO/2019"
```

2. Dedicated route (URL-encode the `/`):

```bash
curl -v -H "x-role: admin" "http://localhost:4000/perbaikan/aset/0001%2FHO%2F2019"
```

Note: If you are a `user` role, you must have the same `beban` as the `aset` to see perbaikan for that `AsetId`.

- Get perbaikan by `id`:

```bash
curl -v -H "x-role: admin" http://localhost:4000/perbaikan/1
```

- Update perbaikan (admin only, partial updates allowed):

```bash
curl -v -X PUT -H "x-role: admin" -H "Content-Type: application/json" -d '{"vendor":"New Vendor","nominal":600000}' http://localhost:4000/perbaikan/1
```

- Delete perbaikan (admin only):

```bash
curl -v -X DELETE -H "x-role: admin" http://localhost:4000/perbaikan/1
```

### Update Keterangan for an asset (admin)

If you just want to update `Keterangan`, there's now a dedicated endpoint:

```bash
curl -v -X PUT -H "x-role: admin" -H "Content-Type: application/json" -d '{"Keterangan":"Perbaikan selesai: ganti fan, diuji dan OK"}' "http://localhost:4000/aset/0001%2FHO%2F2019/keterangan"
```
