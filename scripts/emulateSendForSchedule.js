import db from "../db.js";

async function run() {
  try {
    const [srows] = await db
      .promise()
      .query("SELECT * FROM maintenance_schedules WHERE id = ?", [15]);
    if (!srows || srows.length === 0) return console.log("no schedule");
    const s = srows[0];
    const [aRows] = await db
      .promise()
      .query("SELECT a.id, a.beban_id FROM aset a WHERE a.id = ?", [
        s.asset_id,
      ]);
    const bebanId = aRows[0].beban_id;
    const [users] = await db
      .promise()
      .query(
        "SELECT u.id FROM beban_users bu JOIN user u ON bu.user_id = u.id WHERE bu.beban_id = ?",
        [bebanId]
      );
    console.log("users for beban", bebanId, users);
    for (const u of users) {
      try {
        const vals = [
          s.id,
          s.asset_id,
          u.id,
          bebanId,
          "overdue_daily",
          new Date().toISOString().slice(0, 19).replace("T", " "),
          JSON.stringify({ due_date: s.due_date }),
        ];
        const [r] = await db
          .promise()
          .execute(
            "INSERT INTO notification_logs (schedule_id, asset_id, user_id, beban_id, type, send_date, payload) VALUES (?, ?, ?, ?, ?, ?, ?)",
            vals
          );
        console.log("inserted", r.insertId);
      } catch (e) {
        console.error("insert failed", e.code, e.sqlMessage);
      }
    }
    const [rows] = await db
      .promise()
      .query("SELECT * FROM notification_logs WHERE schedule_id = ?", [15]);
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
