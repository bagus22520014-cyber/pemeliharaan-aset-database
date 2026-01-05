import db from "../db.js";

async function run() {
  try {
    const [rows] = await db
      .promise()
      .query("SELECT id, username, role FROM user ORDER BY id ASC LIMIT 200");
    console.log("=== users ===");
    console.table(rows);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
