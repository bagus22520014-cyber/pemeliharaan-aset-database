import db from "../db.js";

async function run() {
  try {
    console.log("=== maintenance_schedules for rule 1 ===");
    const [s] = await db
      .promise()
      .query("SELECT * FROM maintenance_schedules WHERE rule_id = 1");
    console.table(s);

    console.log("=== aset id=1 ===");
    const [a] = await db
      .promise()
      .query("SELECT id, beban_id, AsetId, namaAset FROM aset WHERE id = 1");
    console.table(a);

    if (a && a.length > 0) {
      const bebanId = a[0].beban_id;
      console.log("=== beban_users for beban_id", bebanId, "===");
      const [bu] = await db
        .promise()
        .query(
          "SELECT bu.user_id, u.username FROM beban_users bu JOIN user u ON bu.user_id = u.id WHERE bu.beban_id = ?",
          [bebanId]
        );
      console.table(bu);
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
