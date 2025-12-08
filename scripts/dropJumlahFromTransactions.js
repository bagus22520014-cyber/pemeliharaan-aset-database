import db from "../db.js";

console.log("Starting to drop jumlah columns from transaction tables...");

const dropColumns = [
  { table: "rusak", column: "jumlah_rusak" },
  { table: "dipinjam", column: "jumlah_dipinjam" },
  { table: "dijual", column: "jumlah_dijual" },
  { table: "rusak", column: "StatusRusak" },
  { table: "dipinjam", column: "StatusPeminjaman" },
  { table: "perbaikan", column: "status" },
];

let completed = 0;

dropColumns.forEach(({ table, column }) => {
  const checkQuery = `
    SELECT COUNT(*) as count 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = ? 
      AND COLUMN_NAME = ?
  `;

  db.query(checkQuery, [table, column], (err, results) => {
    if (err) {
      console.error(`Error checking column ${column} in ${table}:`, err);
      completed++;
      if (completed === dropColumns.length) {
        console.log("\nAll operations completed.");
        db.end();
      }
      return;
    }

    const exists = results[0].count > 0;

    if (!exists) {
      console.log(`⚠️  Column ${column} does not exist in ${table} - skipping`);
      completed++;
      if (completed === dropColumns.length) {
        console.log("\nAll operations completed.");
        db.end();
      }
      return;
    }

    const dropQuery = `ALTER TABLE ${table} DROP COLUMN ${column}`;

    db.query(dropQuery, (err) => {
      if (err) {
        console.error(`❌ Error dropping ${column} from ${table}:`, err);
      } else {
        console.log(`✅ Dropped column ${column} from ${table}`);
      }

      completed++;
      if (completed === dropColumns.length) {
        console.log("\nAll operations completed.");
        db.end();
      }
    });
  });
});
