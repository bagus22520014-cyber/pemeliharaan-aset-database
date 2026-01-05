import db from "../db.js";

async function run() {
  try {
    const [rows] = await db
      .promise()
      .query("SHOW CREATE TABLE notification_logs");
    console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
