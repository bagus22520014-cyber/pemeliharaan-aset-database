import db from "../db.js";

async function run() {
  try {
    const [rows] = await db
      .promise()
      .query(
        "SELECT id, record_id, aset_id FROM riwayat WHERE jenis_aksi = 'maintenance_rule_create' AND (perubahan IS NULL OR perubahan = '' ) AND record_id IS NOT NULL"
      );
    console.log(`Found ${rows.length} riwayat rows to backfill`);
    for (const r of rows) {
      try {
        const rid = r.record_id;
        const [mr] = await db
          .promise()
          .query(
            "SELECT id, asset_id, title, interval_value, interval_unit, start_date, anchor_type FROM maintenance_rules WHERE id = ? LIMIT 1",
            [rid]
          );
        if (!mr || mr.length === 0) {
          console.log(`Rule id ${rid} not found, skipping riwayat ${r.id}`);
          continue;
        }
        const rule = mr[0];
        const perubahan = {
          rule_id: rule.id,
          title: rule.title,
          interval_value: rule.interval_value,
          interval_unit: rule.interval_unit,
          start_date: rule.start_date,
          anchor_type: rule.anchor_type,
        };
        await db
          .promise()
          .execute("UPDATE riwayat SET perubahan = ? WHERE id = ?", [
            JSON.stringify(perubahan),
            r.id,
          ]);
        console.log(`Backfilled riwayat ${r.id} with rule ${rid}`);
      } catch (e) {
        console.error(`Error processing riwayat ${r.id}:`, e?.message || e);
      }
    }
    console.log("Backfill complete");
    process.exit(0);
  } catch (err) {
    console.error("Backfill failed:", err);
    process.exit(2);
  }
}

run();
