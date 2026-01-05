import db from "../db.js";

async function run() {
  // Convert referencing columns to signed INT to match existing parent tables
  const stmts = [
    `ALTER TABLE beban_users MODIFY COLUMN beban_id INT NOT NULL`,
    `ALTER TABLE beban_users MODIFY COLUMN user_id INT NOT NULL`,

    `ALTER TABLE maintenance_rules MODIFY COLUMN asset_id INT NOT NULL`,
    `ALTER TABLE maintenance_rules MODIFY COLUMN created_by INT NULL`,

    `ALTER TABLE maintenance_schedules MODIFY COLUMN asset_id INT NOT NULL`,
    `ALTER TABLE maintenance_schedules MODIFY COLUMN claimed_by INT NULL`,

    `ALTER TABLE maintenance_logs MODIFY COLUMN asset_id INT NOT NULL`,
    `ALTER TABLE maintenance_logs MODIFY COLUMN performed_by INT NULL`,

    `ALTER TABLE notification_logs MODIFY COLUMN asset_id INT NULL`,
    `ALTER TABLE notification_logs MODIFY COLUMN user_id INT NULL`,
    `ALTER TABLE notification_logs MODIFY COLUMN beban_id INT NULL`,
  ];

  try {
    for (const s of stmts) {
      try {
        console.log("Executing:", s);
        await db.promise().execute(s);
      } catch (err) {
        console.warn("Ignore error:", err.message);
      }
    }
    console.log("Signedness fixes applied.");
    process.exit(0);
  } catch (err) {
    console.error("Failed:", err);
    process.exit(1);
  }
}

run();
