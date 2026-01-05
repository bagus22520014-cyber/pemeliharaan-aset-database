import db from "../db.js";

async function run() {
  // Drop constraints then drop tables in reverse order of creation
  const dropConstraints = [
    `ALTER TABLE notification_logs DROP FOREIGN KEY fk_nl_beban`,
    `ALTER TABLE notification_logs DROP FOREIGN KEY fk_nl_user`,
    `ALTER TABLE notification_logs DROP FOREIGN KEY fk_nl_asset`,
    `ALTER TABLE notification_logs DROP FOREIGN KEY fk_nl_schedule`,

    `ALTER TABLE maintenance_logs DROP FOREIGN KEY fk_ml_performedby`,
    `ALTER TABLE maintenance_logs DROP FOREIGN KEY fk_ml_asset`,
    `ALTER TABLE maintenance_logs DROP FOREIGN KEY fk_ml_schedule`,

    `ALTER TABLE maintenance_schedules DROP FOREIGN KEY fk_ms_claimedby`,
    `ALTER TABLE maintenance_schedules DROP FOREIGN KEY fk_ms_asset`,
    `ALTER TABLE maintenance_schedules DROP FOREIGN KEY fk_ms_rule`,

    `ALTER TABLE maintenance_rules DROP FOREIGN KEY fk_mr_createdby`,
    `ALTER TABLE maintenance_rules DROP FOREIGN KEY fk_mr_asset`,

    `ALTER TABLE beban_users DROP FOREIGN KEY fk_bebanusers_user`,
    `ALTER TABLE beban_users DROP FOREIGN KEY fk_bebanusers_beban`,
  ];

  const dropTables = [
    `DROP TABLE IF EXISTS notification_logs`,
    `DROP TABLE IF EXISTS maintenance_logs`,
    `DROP TABLE IF EXISTS maintenance_schedules`,
    `DROP TABLE IF EXISTS maintenance_rules`,
    `DROP TABLE IF EXISTS beban_users`,
  ];

  try {
    for (const d of dropConstraints) {
      try {
        console.log(
          "Dropping constraint:",
          d.split("DROP FOREIGN KEY")[0].trim()
        );
        await db.promise().execute(d);
      } catch (err) {
        console.warn("Ignore drop constraint error:", err.message);
      }
    }

    for (const t of dropTables) {
      try {
        console.log("Dropping table:", t);
        await db.promise().execute(t);
      } catch (err) {
        console.warn("Ignore drop table error:", err.message);
      }
    }

    console.log("Rollback completed.");
    process.exit(0);
  } catch (err) {
    console.error("Rollback failed:", err);
    process.exit(1);
  }
}

run();
