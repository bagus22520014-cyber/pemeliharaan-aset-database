import db from "../db.js";

async function run() {
  const [rows] = await db
    .promise()
    .query(
      `SELECT id, payload FROM notification_logs WHERE payload LIKE '%Jadwal pemeliharaan dibuat untuk aset %'`
    );
  for (const r of rows) {
    console.log("id=", r.id);
    console.log("raw payload (type):", typeof r.payload);
    console.log("raw payload:", r.payload);
    let s =
      typeof r.payload === "string"
        ? r.payload.trim()
        : JSON.stringify(r.payload);
    s = s.replace(/([,{]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
    s = s.replace(/'/g, '"');
    console.log("transformed:", s);
    try {
      const p = JSON.parse(s);
      console.log("parsed object:", p);
    } catch (e) {
      console.error("parse error:", e.message);
    }
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
