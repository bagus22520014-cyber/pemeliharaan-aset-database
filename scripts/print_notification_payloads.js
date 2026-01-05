import db from "../db.js";

async function run() {
  const [rows] = await db
    .promise()
    .query(
      `SELECT id, payload FROM notification_logs WHERE payload LIKE '%Jadwal pemeliharaan dibuat untuk aset %'`
    );
  for (const r of rows) {
    console.log("id=", r.id);
    console.log("raw payload:", r.payload);
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
