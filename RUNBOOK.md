# RUNBOOK — Pemeliharaan Aset Database

This runbook contains operational steps for migrations, backups, and recovery.

## Backup Database (MySQL)

- Full logical backup (recommended before running migrations):

```powershell
mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS --single-transaction --routines --triggers $DB_NAME > backup-$(Get-Date -Format yyyyMMdd_HHmmss).sql
```

- Verify checksum / upload backup to safe storage (S3/secure NAS).

## Restore (logical)

```powershell
mysql -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME < backup-file.sql
```

## Running Migrations

- All migration scripts live under `scripts/`.
- Recommended flow (staging):
  1. Ensure a fresh backup exists.
  2. Set environment variables to point to staging DB (see "Environment Variables" below).
  3. Run migration scripts in order (see "Migration Ordering").
  4. Check `scripts/verifyMaintenanceMigration.js` output for tables/constraints.
  5. Run integration tests with `TEST_INTEGRATION=1 npm test`.

## Environment Variables (examples)

- `DB_HOST` — database host
- `DB_PORT` — database port (default 3306)
- `DB_USER` — DB user with migration privileges
- `DB_PASS` — DB password
- `DB_NAME` — target database name
- `DB_CONN_LIMIT` — connection pool size (recommended 10-30)
- `DB_QUEUE_LIMIT` — pool queue limit (recommended 0-50)
- `NODE_ENV` — `production|staging|development`
- `WORKER_BATCH` — notification/generator batch size (default 200)

## Test DB (integration)

- A docker-compose file for local integration tests is provided as `docker-compose.test.yml`.
- To run a local test DB and execute tests inside the compose network:

```bash
docker-compose -f docker-compose.test.yml up --build --remove-orphans
# or run the app container service command which runs `npm test` inside compose
```

- Alternatively, export test DB env vars and run tests locally:

```bash
export DB_HOST=127.0.0.1
export DB_PORT=3307
export DB_USER=test
export DB_PASS=test
export DB_NAME=pemeliharaan_test
TEST_INTEGRATION=1 npm test
```

## DB Connection Pooling

- `db.js` reads `DB_CONN_LIMIT`/`DB_QUEUE_LIMIT` to configure the mysql2 pool. For production, prefer a pool size between 10 and 30 depending on app concurrency and instance size. Keep `DB_QUEUE_LIMIT` small to avoid long-running queue waits.

## Migration Ordering

- Apply migrations in the order they are numbered or documented. For this feature set use the following sequence:
  1. `scripts/migrate_maintenance_initial.js` — create base tables
  2. `scripts/migrate_maintenance_finalize.js` — add FKs and indexes
  3. `scripts/add_performance_indexes.js` — add performance indexes (priority, composite indexes)
  4. `scripts/fixSignedness.js` — (if required) fix INT signed/unsigned mismatches
  5. `scripts/verifyMaintenanceMigration.js` — run verification

## Rollback

- Individual rollback scripts (when available) live in `scripts/` (e.g., `rollbackMaintenanceSchema.js`).
- If a rollback script is not present, restore from backup and re-run migrations on a fresh clone of the DB schema in staging to confirm the rollback.

## Worker & Cron

- Workers: `scripts/generateSchedules.js` and `scripts/sendNotifications.js`.
- Run daily via cron or systemd timer (recommend 05:00 local). Configure `WORKER_BATCH` and limit concurrency to avoid DB pressure. Example systemd unit should set `DB_CONN_LIMIT` appropriate for the instance.

```cron
0 5 * * * /usr/bin/node /path/to/repo/scripts/generateSchedules.js >> /var/log/maintenance/generate.log 2>&1
15 5 * * * /usr/bin/node /path/to/repo/scripts/sendNotifications.js >> /var/log/maintenance/notify.log 2>&1
```

## CI

- A GitHub Actions workflow is included at `.github/workflows/ci.yml` which runs lint and tests. It uses a MySQL service container for the test DB.

## Local .env and testing

- A `.env.example` is included at the repo root with recommended variables. Copy it to `.env` in the service directory before running locally:

```powershell
cp ..\.env.example .env
```

- For integration tests, use the provided `docker-compose.test.yml` to start a disposable MySQL instance:

```powershell
docker compose -f docker-compose.test.yml up -d
# wait for DB to become healthy, then run tests
cd pemeliharaan-aset-database
BASE_URL=http://localhost:4000 DB_HOST=127.0.0.1 DB_PORT=3307 DB_USER=test DB_PASS=test DB_NAME=pemeliharaan_test npm test
```

## CI

- A GitHub Actions workflow `.github/workflows/ci.yml` runs `npm ci`, `npm run lint`, and `npm test` for the `pemeliharaan-aset-database` package. Integration tests are excluded from CI by default; to enable them, provide a hosted test DB or add a service container to the workflow.

## Worker & Cron

- Workers: `scripts/generateSchedules.js` and `scripts/sendNotifications.js`.
- Run daily via cron or systemd timer (recommend 05:00 local):

```cron
0 5 * * * /usr/bin/node /path/to/repo/scripts/generateSchedules.js >> /var/log/maintenance/generate.log 2>&1
15 5 * * * /usr/bin/node /path/to/repo/scripts/sendNotifications.js >> /var/log/maintenance/notify.log 2>&1
```

## Alerts / Metrics

- The app emits structured metric logs prefixed with `[METRIC]` (JSON). Collect with your log aggregator (e.g., ELK / Datadog). Suggested metrics:

  - `generateSchedules.run` — labels: `status:{success|failure}`, `rules`.
  - `sendNotifications.run` — labels: `status:{success|failure}`.
  - `maintenance.claim_conflict` — increment when claim returns 409 (high spikes indicate contention).

- Configure alerts for:
  - Worker failures (sendNotifications.run.status=failure) > 1 in 24h.
  - Generate job failures > 1 in 24h.
  - Claim conflict rate > threshold (e.g., 10% of attempts) — indicates performance or scale issues.

## Pre-deploy Checklist for Breaking Changes

- Add API version header or path (see API docs) when introducing breaking changes.
- Create migration scripts and run in staging, run integration tests, verify riwayat/audit logs.
- Notify clients and schedule rollout.
