import db from "../db.js";

async function run() {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, beban_id, nama FROM aset WHERE beban_id IS NOT NULL LIMIT 50"
      );
    console.log(rows);
    process.exit(0);
  } catch (err) {
    console.error(err?.message || err);
    process.exit(1);
  }
}

run();
