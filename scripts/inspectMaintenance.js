import db from "../db.js";

async function run() {
  try {
    const ASET = process.argv[2] || "0001/MLG-NET/2025";
    console.log("Inspecting asset", ASET);

    const [ar] = await db
      .promise()
      .query(
        "SELECT id, AsetId, NamaAset, beban_id FROM aset WHERE AsetId = ? LIMIT 1",
        [ASET]
      );
    if (!ar || ar.length === 0) {
      console.log("Asset not found");
      process.exit(2);
    }
    const asset = ar[0];
    console.log("Asset:", asset);

    const [brows] = await db
      .promise()
      .query("SELECT * FROM beban WHERE id = ?", [asset.beban_id]);
    console.log("Beban:", brows);

    const [bu] = await db
      .promise()
      .query("SELECT * FROM beban_users WHERE beban_id = ?", [asset.beban_id]);
    console.log("Beban Users:", bu);

    const [rrows] = await db
      .promise()
      .query("SELECT * FROM maintenance_rules WHERE asset_id = ?", [asset.id]);
    console.log("Rules:", rrows);

    for (const r of rrows) {
      const [srows] = await db
        .promise()
        .query(
          "SELECT * FROM maintenance_schedules WHERE rule_id = ? ORDER BY due_date ASC",
          [r.id]
        );
      console.log("Schedules for rule", r.id, srows);
      for (const s of srows) {
        const [nls] = await db
          .promise()
          .query("SELECT * FROM notification_logs WHERE schedule_id = ?", [
            s.id,
          ]);
        console.log("Notification logs for schedule", s.id, nls);
      }
    }

    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

run();
