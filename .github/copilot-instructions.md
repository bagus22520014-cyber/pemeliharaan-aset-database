# Copilot / AI Agent Instructions for pemeliharaan-aset-database

Minimal Node.js + Express API that stores data in MySQL. These notes help contributors and AI agents be productive without changing established patterns.

Quick facts

- Entry: `index.js` — exports `app` and starts the server with `app.listen()`.
- Modules: ESM (`"type": "module"` in `package.json`) — use `import` / `export` consistently.
- DB: `db.js` creates a pooled connection via `mysql2.createPool()` and reads credentials from `.env`.
- Routes: `routes/*.js` are Express Routers `export default router;` and are mounted in `index.js`.
- Auth: Role-only authorization via `x-role`/`role` headers (see `routes/middleware/auth.js`).
- Auth: Role-only authorization via `x-role`/`role` headers or `role` cookie (see `routes/middleware/auth.js`). The server sets a `role` cookie on successful login so browsers will automatically include the role on subsequent requests.
- Auth: Role-only authorization via `x-role`/`role` headers or `role` cookie (see `routes/middleware/auth.js`). The server sets a `role` cookie on successful login so browsers will automatically include the role on subsequent requests. It also sets a `beban` cookie so users are filtered to assets belonging to their `Beban`.
- Naming: DB table columns and JSON properties use PascalCase (e.g., `NamaAset`, `TglPembelian`). Keep this consistent.

Key patterns & conventions

- Raw SQL queries only — use positional placeholders (`?`) and `db.query(q, values, cb)`. Avoid introducing an ORM without a design PR.
- Error handling: DB errors are directly returned via `res.status(500).json(err)`; keep this unless refactoring across the codebase.
- Authorization: Use provided middleware `requireAdmin` / `requireUserOrAdmin` for route protection.
- Backwards compatibility: login supports `POST /user` and `POST /user/login`.
- Backwards compatibility: login supports `POST /user` and `POST /user/login`. Login responses set a `role` cookie (1 day) to persist auth for subsequent requests; clients that use curl/postman should set the header or use cookie flags (`-c` and `-b`) for testing.

Developer workflows & commands

- Install: `npm ci` or `npm install`.
- Start: `npm start` (`node index.js`).
- Seed admin: `node scripts/seedAdmin.js` (inserts `admin/admin` if not present).
- List users: `node scripts/listUsers.js`.
- Debug: `node --inspect index.js` or `node --inspect-brk index.js`.

Quick examples

- List users (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Get -Uri http://localhost:4000/user
  ```
- Login (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:4000/user/login -Body (ConvertTo-Json @{username='admin';password='admin'}) -ContentType 'application/json'
  ```
- Add asset (cURL):
  ```bash
  curl -X POST http://localhost:4000/aset -H 'Content-Type: application/json' -H 'x-role: user' -d '{"AsetId":"A001","AccurateId":"AC-123","NamaAset":"Mesin","Spesifikasi":"Spec","Grup":"GroupA","Beban":"BebanX","AkunPerkiraan":"A1","NilaiAset":1000,"TglPembelian":"2025-11-01","MasaManfaat":5}'
  ```

Integration & dependencies

- Only external runtime dependency: MySQL (`mysql2`), plus small Node packages (express, dotenv, cors).
- Environment variables: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT`.

Editing & PR guidance

- Preserve PascalCase DB column and property names in JSON payloads to avoid breaking clients.
- Keep raw SQL patterns with `?` placeholders. If you refactor queries, include a migration plan.
- If changing authentication (e.g., add hashing or tokens), open a design PR with migration steps and tests.
- New routers: export them with `export default router;` and mount in `index.js`.

Files to consult

- `index.js` — server & route mounting
- `db.js` — pooled DB connection & dotenv
- `routes/aset.js` — CRUD + auth mapping
- `routes/user.js` — login behavior and user listing
- `routes/middleware/auth.js` — role extraction + middleware
- `scripts/seedAdmin.js` & `scripts/listUsers.js` — development helpers

Ask me to expand any of the above sections (example PR template, tests, or a README) and I’ll add them.

# Copilot / AI Agent Instructions for pemeliharaan-aset-database

Minimal, local Node.js/Express API with MySQL. These notes focus on what an AI or contributor needs to be productive: architecture, patterns, and CLI/IDE workflows.

Quick facts

- Entry: `index.js` — app exports `app` and calls `app.listen(...)`.
- Modules: ESM (`"type": "module"`) — use `import`/`export` consistently.
- DB: `db.js` creates a pooled connection via `mysql2.createPool()` and reads creds from `.env`.
- Routes: `routes/*.js` are Express Routers `export default router;`, mounted in `index.js`.
- Auth: Role-only auth via HTTP headers `x-role` or `role` (see `routes/middleware/auth.js`).
- Naming: DB column names and JSON payloads use PascalCase (e.g., `NamaAset`, `TglPembelian`). Preserve these field names.

Key patterns & conventions (what to follow)

- SQL style: Use raw SQL with positional placeholders `?` and `db.query(q, values, cb)`. Follow the `routes/*` examples.
- Error handling: DB errors are returned directly using `res.status(500).json(err)`. Keep this behavior unless a change has a clear compatibility plan.
- Authorization: Use `requireAdmin` and `requireUserOrAdmin` from `routes/middleware/auth.js` for role restrictions. Tests and examples should set `x-role` header accordingly.
- Authorization: Use `requireAdmin` and `requireUserOrAdmin` from `routes/middleware/auth.js` for role restrictions. Asset reads are now restricted to authenticated `user` or `admin` roles; create is allowed for both `user` and `admin`; update/delete are `admin` only. `GET /user` is admin-only.
- Backwards compat: `routes/user.js` supports both `POST /user` and `POST /user/login` for login.

Developer workflows

- Install: `npm ci` or `npm install`.
- Start server: `npm start` (calls `node index.js`).
- Run scripts: `node scripts/seedAdmin.js` to seed an admin user (admin/admin), `node scripts/listUsers.js` to list users.
- Debugging: `node --inspect index.js` or `node --inspect-brk index.js`.
- Environment: `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `PORT` come from `.env`.

Quick test examples

- Get users (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Get -Uri http://localhost:4000/user
  ```
- Login (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:4000/user/login -Body (ConvertTo-Json @{username='admin';password='admin'}) -ContentType 'application/json'
  ```
- Add asset (curl):
  ```bash
  curl -X POST http://localhost:4000/aset -H 'Content-Type: application/json' -H 'x-role: user' -d '{"AsetId":"A001","AccurateId":"AC-123","NamaAset":"Mesin","Spesifikasi":"Spec","Grup":"GrupA","Beban":"BebanX","AkunPerkiraan":"A1","NilaiAset":1000,"TglPembelian":"2025-11-01","MasaManfaat":5}'
  ```

Integration & external dependencies

- MySQL via `mysql2`. No other external services.

When to propose larger design changes

- Migrate to an ORM, introduce password hashing, or change error-handling contract: open a design PR that includes migration steps, client compatibility notes, and a clear test plan.
- Renaming DB columns or switching JSON casing requires a compatibility plan and versioning (breaking change).

Editing & PR guidelines

- Preserve PascalCase DB column names and JSON property names in API payloads.
- Preserve raw SQL query patterns (`?` placeholders) unless the PR introduces a full migration plan.
- Ensure role-protected routes are still guarded with `requireAdmin` / `requireUserOrAdmin`.
- Mount new routers in `index.js` and export routers using `export default router;`.
- Tests: there are no automated tests; consider adding integration tests that mock or use a local MySQL instance.

Important files to consult

- `index.js` — server & route mounting
- `db.js` — pooled db connection and dotenv behavior
- `routes/aset.js` — CRUD + auth mapping
- `routes/user.js` — login behavior and user list
- `routes/middleware/auth.js` — role extraction + middleware
- `scripts/seedAdmin.js` & `scripts/listUsers.js` — simple admin seeding and inspection helpers

If you'd like: I can also add a lightweight `README.md` example, a PR checklist, or example integration tests that target the current SQL queries. Tell me which you'd prefer next.

# Copilot / AI Agent Instructions for pemeliharaan-aset-database

This repository is a minimal Node.js/Express API backed by MySQL (mysql2). These instructions help AI coders quickly understand patterns, conventions, and development workflows so changes are consistent and safe.

Quick facts

- Entry: `index.js` — app exported as default and server is started using `app.listen(...)`.
- Package: `package.json` uses ESM (`"type": "module"`) — use `import`/`export` consistently.
- DB: `db.js` uses `mysql2.createPool()` and environment variables from `.env` (DB_HOST, DB_USER, DB_PASS, DB_NAME).
- Routes: `routes/*.js` are Express Routers exported as `export default router;` and mounted in `index.js`.
- Auth: No token system; role-based access is done via header `x-role` or `role` in `routes/middleware/auth.js`.
- Naming: DB column names and JSON payloads use PascalCase (e.g., `NamaAset`, `TglPembelian`). Preserve these field names.

Key patterns and conventions

- SQL style: Use raw SQL with positional placeholders `?` and `db.query(q, values, cb)` (no ORM). Example pattern:
  const q = 'SELECT \* FROM user WHERE username = ? AND password = ?';
  db.query(q, [username, password], (err, result) => { ... });
- Error handling: DB errors are returned directly with `res.status(500).json(err)` across the repo. Only change this with a design/compatibility PR.
- Authorization: Routes expect a role header. See `requireAdmin` and `requireUserOrAdmin` in `routes/middleware/auth.js`. Example: POST `/aset` requires `user` or `admin` role, PUT/DELETE `/aset/:id` require `admin`.
- Route compatibility: `routes/user.js` accepts both `POST /user` and `POST /user/login` for login for backward compatibility.

Developer workflows (commands & scripts)

- Install: `npm ci` or `npm install`.
- Start: `npm start` (runs `node index.js`).
- Seed admin: `node scripts/seedAdmin.js` (inserts `admin/admin` user if not present); list users: `node scripts/listUsers.js`.
- Debugging: `node --inspect index.js` or `node --inspect-brk index.js` to attach a debugger.

Testing / quick checks (examples)

- Check users (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Get -Uri http://localhost:4000/user
  ```
- Login (PowerShell):
  ```powershell
  Invoke-RestMethod -Method Post -Uri http://localhost:4000/user/login -Body (ConvertTo-Json @{username='admin';password='admin'}) -ContentType 'application/json'
  ```
- Add asset (cURL):
  ```bash
  curl -X POST http://localhost:4000/aset -H 'Content-Type: application/json' -H 'x-role: user' -d '{"AsetId": "A001", "NamaAset":"Mesin", "AccurateId": "AC-123", "Spesifikasi":"Spec", "Grup":"GrupA", "Beban": "BebanX", "AkunPerkiraan": "A1", "NilaiAset":1000, "TglPembelian":"2025-11-01", "MasaManfaat":5 }'
  ```

Integration & external dependencies

- MySQL via `mysql2` and `.env` configuration. No other external APIs or microservices; all data is local DB-driven.

When to propose larger changes

- Keep raw SQL; migrating to an ORM or changing authentication should be proposed in a design PR and include migration steps, tests, and client compatibility checks.
- Avoid renaming DB columns or changing JSON property casing without explicit backwards-compatibility plans.

Editing guidelines & code review focuses (help AI edit safely)

- Maintain PascalCase field names and use `?` placeholders for SQL queries.
- Preserve `res.status(500).json(err)` for DB errors unless replacing with a planned change.
- When adding routes: mount them in `index.js` and follow the existing router patterns; only introduce middleware if consistent with `routes/middleware/auth.js`.
- Confirm role checks for protected operations. Use `x-role` header for integration tests; be explicit in unit tests/mocks.

Example file map to consult

- `index.js` — server & router mounting.
- `db.js` — pooled DB configuration.
- `routes/aset.js` — asset CRUD patterns & auth requirements.
- `routes/user.js` — login paths and user listing.
- `routes/middleware/auth.js` — auth helpers & role checks.
- `scripts/seedAdmin.js` — easy local seeding for development.

If anything else is unclear or you'd like me to add an example PR template, tests, or more route examples, tell me which piece you'd like expanded and I'll update this doc. ✅

# Copilot / AI Agent Instructions for pemeliharaan-aset-database

This repository is a minimal Node.js Express API that persists data in a MySQL database. The project is intentionally lightweight and currently contains: `db.js`, `routes/aset.js`, and `routes/user.js`.

Quick facts (what helps you be immediately productive):

- DB: MySQL via `mysql2` (pooled connection) — connection details come from `.env` and `db.js` uses `mysql.createPool()`.
- Server: Express 5 APIs are used in route files. The app entry file (`index.js`/`server.js`) is missing from the repo; routes are exported as default router objects.
- Module syntax: Route files use `import`/`export default` (ESM), but `package.json` currently sets `"type": "commonjs"` — this is inconsistent and will break a normal `node` run. Check and align `type` with imports (or convert to require/exports).
- Environment: The repo includes an `.env` file (DB credentials, PORT). Treat `.env` as local-only; do not commit secrets.

Key patterns and conventions

- Routes are implemented as Express routers and exported as the default export (e.g., `export default router;`). Example from `routes/aset.js`:

  - GET all assets: Selects all rows from `aset` table and returns them as JSON.
  - POST insert asset: Expects request body to contain columns: `AsetId, AccurateId, NamaAset, Spesifikasi, Grup, Beban, AkunPerkiraan, NilaiAset, TglPembelian, MasaManfaat` and uses positional placeholders `?` in SQL.

- Query style: raw SQL with positional parameter placeholders (`?`) and `db.query(q, values, callback)`. Preserve this approach unless a rewrite to an ORM is requested.

- Error responses: Consistently return HTTP 500 on DB errors with `res.status(500).json(err)` (exposes DB error object). Do not change this contract unless explicitly asked; provide optional suggestions if needed.

- Authentication: `routes/user.js` has a `POST /login` that checks `username` and `password` in plain text: `SELECT * FROM user WHERE username = ? AND password = ?`. Passwords are checked directly against stored values. Avoid changing auth behavior unless asked to introduce hashing.

- Naming: Columns use Indonesian and PascalCase (e.g., `NamaAset`, `TglPembelian`). Keep column/property names stable. API input/outbound JSON uses the same field names as DB columns.

Files to consult for behavior/implementation examples

- `db.js` — createPool + environment variables.
- `routes/aset.js` — CRUD patterns for `aset` table (GET, POST). See use of placeholders and returned JSON shapes.
- `routes/user.js` — login and user routes.
  - POST `/user` and POST `/user/login` both accept `{ username, password }` and return `{
message: 'Login berhasil', role, username, id }` on success. `role` will be normalized to lowercase.
  - GET `/user` returns an array of users with `username` and `role` only (passwords omitted).
- `.env` — shows DB variables and the default `PORT` (4000).

What to change carefully (and why):

- Module type: Since files use ESM `import`/`export`, either change `package.json` to include `"type": "module"` or convert imports to CommonJS (`require`) — pick the approach consistent across the repo when implementing changes.
- Start/entrypoint: There’s no server entry file. When adding one, follow the route export patterns:
  - Typical usage: `import express from 'express'; import asetRouter from './routes/aset.js'; import userRouter from './routes/user.js'; app.use('/aset', asetRouter); app.use('/user', userRouter); app.listen(process.env.PORT || 4000)`.
- Database: When adding migrations or seed scripts, use the `pemeliharaan-aset` database name that appears in `.env` and the table/column patterns noted above.

Debugging / Developer commands

- Install: `npm ci` or `npm install`.
- Start (once entry file exists) with ESM: `node index.js` or `node server.js` if `package.json` has `"type": "module"`; for windows PowerShell use `npm run start` or `node .\index.js`.
- Add a start script: `npm set-script start "node index.js"` (or edit `package.json`).
- DB: Make sure MySQL server is running and the connection from `.env` is reachable.
- Debug: Use `node --inspect index.js` or `node --inspect-brk index.js` to attach a debugger for breaking on start.

Security and conventions to preserve

- The repository uses direct SQL queries and returns errors directly as JSON. If modifying this behavior, include a rationale and a migration plan.
- Column and property casing is PascalCase; preserve that naming convention for JSON input/output to avoid breaking any clients.

Examples (brief):

- Mounting routers in `index.js` (example to create):

  import express from 'express';
  import dotenv from 'dotenv';
  import asetRouter from './routes/aset.js';
  import userRouter from './routes/user.js';
  dotenv.config();
  const app = express();
  app.use(express.json());
  app.use('/aset', asetRouter);
  app.use('/user', userRouter);
  app.listen(process.env.PORT ?? 4000);

- A DB query style example to follow (from `routes/user.js`):

  const q = 'SELECT \* FROM user WHERE username = ? AND password = ?';
  db.query(q, [username, password], (err, result) => {
  if (err) return res.status(500).json(err);
  if (result.length === 0) return res.status(401).json({ message: 'Login gagal' });
  return res.json({ message: 'Login berhasil', role: result[0].role, username: result[0].username, id: result[0].id });
  });

When to open a PR vs a small local change

- Small changes like a missing `package.json` script or fixing `type` -> `module` can be made directly in a small PR.
- Larger changes such as switching to hashed passwords, introducing a new ORM, or reworking error handling should be proposed as a design PR that includes migration notes and tests.

Testing and CI

- No tests or CI configurations are included. If adding tests, prefer lightweight integration tests that run with a local or in-memory MySQL instance or mock `mysql2`.

If you have questions for contributors

- Ask clarifying questions before converting modules from ESM to CommonJS or before altering authentication behavior.

Thanks, and request me to expand this document with commands or pattern examples if you'd like more detail or expanded conventions.

Dev helpers & example SQL

- Seed an admin user for local development (plain-text password):

```sql
INSERT INTO `user` (`username`, `password`, `role`) VALUES ('admin', 'admin', 'admin');
```

- Confirm behavior: POST `/user` or `/user/login` expects `{ username, password }` and returns `{ message, role, username, id }` on success.
