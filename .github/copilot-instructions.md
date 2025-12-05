# Copilot Instructions — pemeliharaan-aset-database

## Quick summary

- Minimal Node.js + Express API for managing asset records backed by MySQL.
- Entrypoint: `index.js`. DB helper: `db.js`. All routes live under `routes/`.
- Images are stored under `assets/imgs/` and served by Express as `/assets/imgs/<filename>`.
- Authorization is header/cookie based (see `routes/middleware/auth.js`): `x-role` and `x-beban` headers or `role`/`beban` cookies.

## Big picture / architecture

- `index.js` sets up routes, static file serving, and prints route details.
- `routes/` contains major API endpoints:
  - `routes/aset.js` — create/read/update/delete assets, image upload & replace, Keterangan updates.
  - `routes/perbaikan.js` — perbaikan (repairs) CRUD with role/beban restrictions.
  - `routes/user.js` — login endpoint; returns `role` and `beban` via cookies.
- Database layer: `db.js` (mysql2 pool). Queries are callback-based.
- Migration & helper scripts: `scripts/` (create tables, add columns, migrate data, seed admin user, fix image paths).

## Primary conventions to follow (project specific)

- Role-based access:
  - `admin` role: full access for read and write across all endpoints.
  - `user` role: restricted access; queries filtered by `Beban`.
  - The code reads `x-role` / `role` header or cookie, and `x-beban` / cookie for the user context — prefer supplying `x-role` / `x-beban` in automated requests for clarity.
- Fields:
  - Use `Keterangan` for textual notes; `Kekurangan` was previously used and may still exist in DBs — migration scripts exist to migrate that data.
  - `Gambar` expects a URL-style path `/assets/imgs/<filename>`. Scripts exist to fix plain filenames.
- File upload:
  - Multer is used in `routes/aset.js` — form field `Gambar`, only file types `image/*`, limit 5MB.
- Mapping & API shapes:
  - Each route uses a `mapRow` function to normalize DB rows to JSON; prefer returning JSON in the mapped format instead of raw rows.
- Error handling coarsely returns 500 with raw DB errors; take care when crafting changes.

## Typical developer workflows & commands

- Run server (dev/test):
  - `npm start` or `node index.js` (defaults to PORT 4000 if not specified).
- DB environment:
  - Provide `.env` values: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`.
- Create admin user (for management):
  - `node scripts/seedAdmin.js` — this creates a default `admin` user with username/password `admin`.
- Migration helpers:
  - Create `aset` table: `npm run migrate:init-aset` (or `node scripts/initAsetTable.js`).
    - To apply default schema changes automatically, use `APPLY_SCHEMA=true node scripts/initAsetTable.js`.
  - Add `perbaikan` table: `npm run migrate:add-perbaikan`.
  - Add new columns to `aset`: `node scripts/addColumns.js`.
  - Migrate `Kekurangan` -> `Keterangan`: `node scripts/migrateKekuranganToKeterangan.js` (optional `DROP_KEKURANGAN=true`).
  - Ensure `Gambar` paths have full path: `node scripts/prefixGambarPaths.js`.
- Database checks: Use `scripts/listUsers.js` to inspect user accounts.

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

- `routes/aset.js`: asset CRUD, file upload handling, Gambar lifecycle, and Keterangan migration patterns.
- `routes/perbaikan.js`: joins with `aset` for role-based access; useful pattern for access control.
- `routes/user.js`: authentication/login flow that sets cookies for `role` & `beban` used across app.
- `scripts/`: all migration/maintenance scripts (apply schema, create triggers, seed admin, migrate fields, prefix image paths).

## Common pitfalls

- `Kekurangan` may still exist in older DBs; prefer `Keterangan` and use migration script to copy old content.
- Some enums (like `Grup` and `Beban`) are defined strongly in SQL; adding new values requires ALTER scripts.
- The code uses `x-role` header and cookie as interchangeable — tests can use either, but keep the pattern consistent.

## Final note

- When in doubt, follow existing patterns in `routes/*` (mapRow, role checks, use of `db.query`), and add scripts to `scripts/` for any database schema changes.

---

If you'd like, I can refine this further (shorter/more terse instructions, or more examples) or merge it into an existing `.github` file (if you have one), let me know your preferences.
