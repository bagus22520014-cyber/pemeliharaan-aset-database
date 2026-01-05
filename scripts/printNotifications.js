import db from "../db.js";

async function run() {
  try {
    const [nl] = await db
      .promise()
      .query(
        "SELECT id, schedule_id, asset_id, user_id, beban_id, type, send_date, payload FROM notification_logs ORDER BY send_date DESC LIMIT 200"
      );
    console.log("=== notification_logs ===");
    console.table(nl);

    const [n] = await db
      .promise()
      .query(
        "SELECT id, user_id, judul, pesan, dibaca, waktu_dibuat FROM notification ORDER BY waktu_dibuat DESC LIMIT 200"
      );
    console.log("=== notification (legacy) ===");
    console.table(n);

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
