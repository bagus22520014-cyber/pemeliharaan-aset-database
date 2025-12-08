import db from "../db.js";

console.log("Verifying that jumlah and status columns are dropped...\n");

const checks = [
  { table: "rusak", columns: ["jumlah_rusak", "StatusRusak", "lokasi_id"] },
  {
    table: "dipinjam",
    columns: ["jumlah_dipinjam", "StatusPeminjaman", "lokasi_id"],
  },
  { table: "dijual", columns: ["jumlah_dijual", "lokasi_id"] },
  { table: "perbaikan", columns: ["status", "lokasi_id"] },
];

let totalChecks = 0;
let completedChecks = 0;

checks.forEach((check) => {
  totalChecks += check.columns.length;
});

checks.forEach(({ table, columns }) => {
  columns.forEach((column) => {
    const q = `
      SELECT COUNT(*) as count 
      FROM information_schema.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = ? 
        AND COLUMN_NAME = ?
    `;

    db.query(q, [table, column], (err, results) => {
      if (err) {
        console.error(`❌ Error checking ${table}.${column}:`, err);
      } else {
        const exists = results[0].count > 0;
        if (exists) {
          console.log(`❌ Column ${table}.${column} still exists!`);
        } else {
          console.log(`✅ Column ${table}.${column} successfully dropped`);
        }
      }

      completedChecks++;
      if (completedChecks === totalChecks) {
        console.log("\n=== Verification Complete ===");
        db.end();
      }
    });
  });
});
