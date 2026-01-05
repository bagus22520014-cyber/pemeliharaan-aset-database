import db from "../db.js";

async function run() {
  try {
    const [rules] = await db
      .promise()
      .query(
        "SELECT id, asset_id, title, interval_value, interval_unit, start_date, enabled, created_by FROM maintenance_rules ORDER BY id DESC LIMIT 50"
      );
    console.log("=== maintenance_rules ===");
    console.table(rules);

    const [schedules] = await db
      .promise()
      .query(
        "SELECT id, rule_id, asset_id, due_date, status, claimed_by FROM maintenance_schedules ORDER BY due_date ASC LIMIT 200"
      );
    console.log("=== maintenance_schedules ===");
    console.table(schedules);

    process.exit(0);
  } catch (err) {
    console.error("Error querying DB:", err);
    process.exit(1);
  }
}

run();
