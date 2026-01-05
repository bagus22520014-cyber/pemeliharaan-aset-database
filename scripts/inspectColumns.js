import db from "../db.js";

async function run() {
  const pairs = [
    { table: "aset", col: "id" },
    { table: "user", col: "id" },
    { table: "beban", col: "id" },
    { table: "maintenance_rules", col: "id" },
    { table: "maintenance_schedules", col: "id" },
  ];
  for (const p of pairs) {
    try {
      const [rows] = await db
        .promise()
        .query(
          `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_KEY FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?`,
          [p.table, p.col]
        );
      console.log(`${p.table}.${p.col}:`, rows[0]);
    } catch (err) {
      console.warn(`Error reading ${p.table}.${p.col}:`, err.message);
    }
  }
  process.exit(0);
}

run();
