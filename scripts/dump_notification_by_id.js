import db from "../db.js";

async function run() {
  const id = process.argv[2] || "11";
  const [rows] = await db
    .promise()
    .query("SELECT id, payload FROM notification_logs WHERE id = ?", [id]);
  if (!rows || rows.length === 0) {
    console.log("not found");
    process.exit(1);
  }
  const r = rows[0];
  console.log("id=", r.id);
  console.log("payload raw type:", typeof r.payload);
  console.log("payload raw:", r.payload);
  try {
    console.log("payload JSON:", JSON.stringify(r.payload));
  } catch (e) {
    console.log("stringify failed, fallback to util.inspect");
    const util = await import("util");
    console.log(util.inspect(r.payload, { depth: 4 }));
  }
  process.exit(0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
