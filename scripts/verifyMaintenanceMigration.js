import db from "../db.js";

async function run() {
  try {
    // Check tables exist and count rows
    const tables = [
      "beban_users",
      "maintenance_rules",
      "maintenance_schedules",
      "maintenance_logs",
      "notification_logs",
    ];

    for (const t of tables) {
      try {
        const [rows] = await db
          .promise()
          .query(`SELECT COUNT(*) as cnt FROM ${t}`);
        console.log(`${t}: exists, rows=${rows[0].cnt}`);
      } catch (err) {
        console.warn(`${t}: missing or error - ${err.message}`);
      }
    }

    // Check foreign keys from information_schema
    const [fks] = await db.promise().query(`
      SELECT TABLE_NAME, CONSTRAINT_NAME, REFERENCED_TABLE_NAME, COLUMN_NAME
      FROM information_schema.KEY_COLUMN_USAGE
      WHERE TABLE_SCHEMA = DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL
        AND TABLE_NAME IN ('beban_users','maintenance_rules','maintenance_schedules','maintenance_logs','notification_logs')
    `);
    console.log("Foreign keys:");
    fks.forEach((f) =>
      console.log(
        `${f.TABLE_NAME}.${f.COLUMN_NAME} -> ${f.REFERENCED_TABLE_NAME} (${f.CONSTRAINT_NAME})`
      )
    );

    // Check indexes
    for (const t of tables) {
      try {
        const [idx] = await db.promise().query(`SHOW INDEX FROM ${t}`);
        console.log(`${t} indexes: ${idx.length}`);
      } catch (err) {
        console.warn(`Index check for ${t} failed: ${err.message}`);
      }
    }

    console.log("Verification completed.");
    process.exit(0);
  } catch (err) {
    console.error("Verification failed:", err);
    process.exit(1);
  }
}

run();
