import db from "../db.js";

async function run() {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, schedule_id, asset_id, user_id, beban_id, type, send_date, payload, created_at FROM notification_logs WHERE schedule_id = ? ORDER BY created_at DESC",
        [15]
      );
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
