import db from "../db.js";

(async () => {
  try {
    const [rows] = await db
      .promise()
      .query(
        `SELECT id,schedule_id,asset_id,user_id,beban_id,type,send_date,payload,created_at,read_at FROM notification_logs WHERE user_id = ? ORDER BY id DESC LIMIT 100`,
        [1]
      );
    console.log(JSON.stringify(rows, null, 2));
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
  process.exit(0);
})();
