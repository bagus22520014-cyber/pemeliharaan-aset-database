import db from "../db.js";

async function run() {
  try {
    const vals = [
      15, // schedule_id from inspectMaintenance
      13, // asset_id
      2, // user_id
      8, // beban_id
      "overdue_daily",
      new Date().toISOString().slice(0, 19).replace("T", " "),
      JSON.stringify({ test: true }),
    ];
    const [r] = await db
      .promise()
      .execute(
        "INSERT INTO notification_logs (schedule_id, asset_id, user_id, beban_id, type, send_date, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
        vals
      );
    console.log("inserted", r.affectedRows, "id", r.insertId);
    const [rows] = await db
      .promise()
      .query(
        "SELECT * FROM notification_logs ORDER BY send_date DESC LIMIT 10"
      );
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
