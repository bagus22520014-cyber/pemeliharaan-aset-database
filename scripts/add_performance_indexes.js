import db from "../db.js";

async function run() {
  try {
    // add priority to maintenance_rules (if missing)
    const [rcols] = await db
      .promise()
      .query("SHOW COLUMNS FROM maintenance_rules LIKE 'priority'");
    if (!rcols || rcols.length === 0) {
      await db
        .promise()
        .execute(
          "ALTER TABLE maintenance_rules ADD COLUMN priority INT NOT NULL DEFAULT 0"
        );
      console.log("Added column maintenance_rules.priority");
    } else {
      console.log("maintenance_rules.priority exists");
    }

    // indexes for maintenance_schedules
    await db
      .promise()
      .execute(
        "CREATE INDEX IF NOT EXISTS idx_ms_status_due ON maintenance_schedules (status, due_date)"
      )
      .catch(() => {});
    await db
      .promise()
      .execute(
        "CREATE INDEX IF NOT EXISTS idx_ms_asset_rule_due ON maintenance_schedules (asset_id, rule_id, due_date)"
      )
      .catch(() => {});

    // indexes for notification_logs
    await db
      .promise()
      .execute(
        "CREATE INDEX IF NOT EXISTS idx_nl_user_send ON notification_logs (user_id, send_date)"
      )
      .catch(() => {});
    await db
      .promise()
      .execute(
        "CREATE INDEX IF NOT EXISTS idx_nl_beban_send ON notification_logs (beban_id, send_date)"
      )
      .catch(() => {});

    console.log("Indexes ensured.");
    process.exit(0);
  } catch (err) {
    console.error("Failed to add indexes:", err);
    process.exit(1);
  }
}

run();
