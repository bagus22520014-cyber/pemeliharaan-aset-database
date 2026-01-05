import db from "../db.js";

async function run() {
  const id = process.argv[2];
  if (!id) {
    console.error("Usage: node getAsetByNumericId.js <id>");
    process.exit(2);
  }
  try {
    const [rows] = await db
      .promise()
      .query("SELECT id, AsetId, NamaAset FROM aset WHERE id = ? LIMIT 1", [
        id,
      ]);
    if (!rows || rows.length === 0) {
      console.log("not found");
      process.exit(1);
    }
    console.log(rows[0]);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(3);
  }
}

run();
