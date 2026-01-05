import db from "../db.js";

async function run() {
  const username = process.argv[2] || "log_test";
  try {
    const [rows] = await db.promise().query(
      `SELECT bu.id, u.username, bu.user_id, bu.beban_id, b.kode FROM beban_users bu
       LEFT JOIN user u ON bu.user_id = u.id
       LEFT JOIN beban b ON bu.beban_id = b.id
       WHERE u.username = ?`,
      [username]
    );
    console.log("beban_users for", username, rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
run();
