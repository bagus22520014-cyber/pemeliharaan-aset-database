# Copilot Instructions — pemeliharaan-aset-database

## Quick summary

- Node.js + Express API for comprehensive asset lifecycle management backed by MySQL.
- Entrypoint: `index.js`. DB helper: `db.js`. All routes live under `routes/`.
- Images stored under `assets/imgs/` and served at `/assets/imgs/<filename>`.
- Authorization: header/cookie based (see `routes/middleware/auth.js`): `x-role`, `x-beban`, `x-username` headers or `role`/`beban`/`username` cookies.

## Big picture / architecture

- **Core system**: Asset records with transaction history (`riwayat`), and multi-tenant access control via `beban` (department codes).
- **index.js** registers 11 routers: `aset`, `user`, `perbaikan`, `riwayat`, `notification`, `rusak`, `dipinjam`, `dijual`, `mutasi`, `beban`, `departemen`.
- **Route modules** (all follow similar patterns):
  - `routes/aset.js` — primary CRUD for assets, image upload/replace, Keterangan updates.
  - `routes/perbaikan.js` — repair transactions.
  - `routes/rusak.js` — broken asset tracking.
  - `routes/dipinjam.js` — asset lending with return date tracking.
  - `routes/dijual.js` — asset sales records.
  - `routes/mutasi.js` — asset mutations/movements (departemen & ruangan changes).
  - `routes/riwayat.js` — audit trail for all changes, cross-references `tabel_ref` and `record_id`.
  - `routes/notification.js` — user notifications, filterable by `beban`.
  - `routes/beban.js`, `routes/departemen.js` — master data for departments.
  - `routes/user.js` — authentication (login returns cookies), user management.
- **Database layer**: `db.js` (mysql2 pool, callback-based queries).
- **Migration & helper scripts**: `scripts/` (20+ migration/seed/utility scripts).

## Primary conventions to follow (project specific)

- **Role-based access** (see `routes/middleware/auth.js`):
  - `admin`: full access to all resources across all `beban`.
  - `user`: restricted to resources matching their `beban` list (supports multiple beban per user, e.g., `["BNT-MEDIA", "BNT-NET"]`).
  - Auth resolution order: `x-role`/`x-beban`/`x-username` headers → `role`/`beban`/`username` cookies. Prefer headers in automated tests.
  - `beban` can be single string, comma-separated, or JSON array; parsed via `toBebanArray()`.
  - Middleware: `requireAdmin`, `requireUserOrAdmin`, `getRoleFromRequest`, `getBebanListFromRequest`, `buildBebanFilterSQL`.
- **Audit trail** (`riwayat` table):
  - All create/update/delete operations log to `riwayat` via `logRiwayat()` helper (present in all transaction routes).
  - Stores: `jenis_aksi` (e.g., "create", "update_nilai"), `user_id`, `role`, `aset_id`, `perubahan` (JSON), `tabel_ref`, `record_id`.
  - Used by `routes/riwayat.js` to provide audit history, filterable by `aset_id`, `user_id`, `tabel_ref`.
- **Fields**:
  - `Keterangan` for notes (not `Kekurangan`; use migration script if old data exists).
  - `Gambar` stores full path `/assets/imgs/<filename>` (run `scripts/prefixGambarPaths.js` if plain filenames exist).
  - `StatusAset` enum: `aktif`, `rusak`, `diperbaiki`, `dipinjam`, `dijual` (default `aktif`).
- **File upload**:
  - Multer in `routes/aset.js`: field `Gambar`, only `image/*` types, 5MB limit.
  - On image replace: deletes old file from filesystem before saving new.
- **Mapping & API shapes**:
  - Every route defines `mapRow()` to normalize DB rows → JSON (date formatting, null coalescing, field renaming).
  - Always return mapped format; never raw DB rows.
- **Error handling**: returns 500 with raw DB errors (basic logging to console). No structured error handling yet.

## Typical developer workflows & commands

- **Run server** (dev/test):
  - `npm start` or `node index.js` (defaults to PORT 4000 if `PORT` env not set).
  - Server logs all routes on startup via `printRoutes()` and `printRouterDetails()`.
- **DB environment**:
  - Required `.env` values: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.
- **Create admin user** (for initial setup):
  - `node scripts/seedAdmin.js` — creates default `admin` user (username/password: `admin`).
- **Migration helpers** (critical for schema evolution):
  - Initialize `aset` table: `npm run migrate:init-aset` or `node scripts/initAsetTable.js`.
    - **Dangerous mode**: `APPLY_SCHEMA=true node scripts/initAsetTable.js` adds missing columns (backup first!).
  - Add `perbaikan` table: `npm run migrate:add-perbaikan` or `node scripts/addPerbaikanTable.js`.
  - Add `riwayat` audit table: `node scripts/addRiwayatTable.js`.
  - Add `notification` table: `node scripts/addNotificationTable.js`.
  - Add new columns to `aset`: `node scripts/addColumns.js` (adds `StatusAset` enum).
  - Migrate `Kekurangan` → `Keterangan`: `node scripts/migrateKekuranganToKeterangan.js` (optional `DROP_KEKURANGAN=true`).
  - Fix `Gambar` paths: `node scripts/prefixGambarPaths.js` (adds `/assets/imgs/` prefix to plain filenames).
- **User management**:
  - List users: `node scripts/listUsers.js`.
  - Seed sample users: `npm run seed:sample-users` or `node scripts/seedSampleUsers.js`.
  - Seed users by beban: `npm run seed:users-beban` or `node scripts/seedUsersByBeban.js`.
  - Add beban to existing user: `npm run user:add-beban` or `node scripts/addBebanToUser.js`.
  - Show assets accessible by user: `npm run show:user-assets` or `node scripts/showAccessibleAssetsForUser.js`.
- **Testing API** (see `API-DOCUMENTATION.md` and `CARA-TESTING-API.md`):
  - Login to get cookies: `curl -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}' http://localhost:4000/user/login -c cookies.txt`.
  - Authenticated requests: use `-b cookies.txt` or headers `-H "x-role: admin" -H "x-username: admin" -H "x-beban: MLM"`.
  - Test JSON files provided: `test-aset.json`, `test-perbaikan.json`, `login.json`, etc.

## Tips & notes for code changes

- Use the `APPLY_SCHEMA` mode of `initAsetTable.js` only when you need to add missing columns (it attempts to add missing columns but won't drop or change others). Always backup first.
- When altering `Gambar` handling, ensure static serving and file deletion logic in `routes/aset.js` remains consistent (deleting old file on replace and storing the image as `/assets/imgs/<filename>`).
- New features should retain `mapRow` normalization and role-based checks in route handlers.
- Logging: the app prints route and request debug info to console — use this to confirm flow when testing.

## Test & Debug examples (quick)

- Upload an asset image:
  - `curl -v -X POST -b cookies.txt -F "AsetId=0008/SRG-NET/2019" -F "NamaAset=Perangkat OLT" -F "Beban=SRG-NET" -F "Gambar=@./olt.jpg" http://localhost:4000/aset`
- Replace image for asset (admin only):
  - `curl -v -X PUT -b admin-cookies.txt -F "Gambar=@./olt2.jpg" http://localhost:4000/aset/0008%2FSRG-NET%2F2019/gambar`
- Authenticate with admin: login to obtain cookie:
  - `curl -v -X POST -H "Content-Type: application/json" -d '{"username":"admin","password":"admin"}' http://localhost:4000/user/login` (then bookmark cookie or follow-auth flows in tests)

## Integration points & dependencies

- Uses MySQL (mysql2 driver) with pooling via `db.js`.
- File uploads use `multer`; static files are served by Express.
- Uses `dotenv` for environment configuration.

## Where to look if you need to change behavior

- `routes/aset.js`: asset CRUD, file upload handling, Gambar lifecycle, Keterangan updates, and core asset patterns.
- `routes/perbaikan.js`: repair transactions with `logRiwayat()` pattern. **Best reference for transaction patterns**.
- `routes/rusak.js`, `routes/dipinjam.js`, `routes/dijual.js`, `routes/mutasi.js`: similar transaction patterns (broken assets, lending, sales, movements) — all use `logRiwayat()`.
- `routes/riwayat.js`: audit trail querying, joins with `user`, `aset`, `beban` for full context.
- `routes/notification.js`: user notifications, filterable by `beban` and read status (`dibaca`).
- `routes/user.js`: authentication/login flow that sets cookies for `role`, `beban`, `username` used across app.
- `routes/middleware/auth.js`: **critical for understanding access control** — contains all auth helpers: `getRoleFromRequest`, `getBebanListFromRequest`, `toBebanArray`, `buildBebanFilterSQL`, `isSameLocation`.
- `routes/beban.js`, `routes/departemen.js`: master data CRUD for organizational units.
- `scripts/`: all migration/maintenance scripts (20+ scripts for schema evolution, data migration, user seeding).

## Common pitfalls

- **Audit logging**: All transaction routes must call `logRiwayat()` after insert/update/delete. See `routes/perbaikan.js` for the pattern.
- **Beban filtering**: Users with multiple beban (e.g., `["BNT-MEDIA", "BNT-NET"]`) require special handling via `buildBebanFilterSQL()` which supports prefix matching (e.g., "BNT-%" matches both).
- **mapRow consistency**: Each route must define and use `mapRow()` for date formatting (`toISOString().split("T")[0]`) and null coalescing (`??`). Never return raw DB rows.
- **Field name legacy**: `Kekurangan` may still exist in older DBs; prefer `Keterangan` and use `scripts/migrateKekuranganToKeterangan.js`.
- **Image paths**: `Gambar` must store full path `/assets/imgs/<filename>`. Run `scripts/prefixGambarPaths.js` if plain filenames exist.
- **Enums**: `StatusAset`, `Grup`, `Beban` are SQL enums; adding new values requires ALTER scripts.
- **Auth headers vs cookies**: The code uses `x-role`/`x-beban`/`x-username` headers and cookies interchangeably. Tests should prefer headers for clarity.

## Integration points & dependencies

- Uses MySQL (mysql2 driver) with pooling via `db.js`.
- File uploads use `multer`; static files are served by Express.
- Uses `dotenv` for environment configuration.
- ES modules (`"type": "module"` in package.json) — all imports use `.js` extensions.

## Pattern examples from codebase

**Beban filtering for users** (from `routes/middleware/auth.js`):

```javascript
const beban = getBebanListFromRequest(req); // returns array
const { clause, params } = buildBebanFilterSQL("b.kode", beban);
query += ` WHERE ${clause}`;
db.query(query, params, ...);
```

**Audit logging pattern** (used in all transaction routes):

```javascript
function logRiwayat(
  jenisAksi,
  userId,
  role,
  asetId,
  perubahan,
  tabelRef,
  recordId,
  callback
) {
  const q = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
  const perubahanJson = perubahan ? JSON.stringify(perubahan) : null;
  db.query(
    q,
    [jenisAksi, userId, role, asetId, perubahanJson, tabelRef, recordId],
    callback
  );
}
```

## Final note

- When in doubt, follow existing patterns in `routes/*` (mapRow, role checks, use of `db.query`), and add scripts to `scripts/` for any database schema changes.
- Reference `routes/perbaikan.js` as the canonical example for transaction patterns with audit logging.
