import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

/**
 * Script untuk menghapus field Tempat dan Beban dari tabel aset
 *
 * Perubahan:
 * 1. Hapus kolom Tempat (lokasi detail sekarang di aset_lokasi)
 * 2. Hapus kolom Beban (sudah diganti dengan beban_id FK)
 *
 * Data lokasi dan tempat sekarang dikelola via tabel aset_lokasi
 */

console.log("=== Remove Tempat and Beban columns from aset table ===");

// Check if columns exist
const checkColumns = `
  SELECT COLUMN_NAME 
  FROM INFORMATION_SCHEMA.COLUMNS 
  WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset' 
  AND COLUMN_NAME IN ('Tempat', 'Beban')
`;

db.query(checkColumns, [process.env.DB_NAME], (err, rows) => {
  if (err) {
    console.error("Error checking columns:", err);
    process.exit(1);
  }

  const existingColumns = rows.map((r) => r.COLUMN_NAME);
  console.log(
    `Found columns to remove: ${existingColumns.join(", ") || "none"}`
  );

  if (existingColumns.length === 0) {
    console.log("✅ Columns already removed. Nothing to do.");
    process.exit(0);
  }

  // Build ALTER TABLE statement
  const alterStatements = [];

  if (existingColumns.includes("Tempat")) {
    alterStatements.push("DROP COLUMN Tempat");
  }

  if (existingColumns.includes("Beban")) {
    alterStatements.push("DROP COLUMN Beban");
  }

  if (alterStatements.length === 0) {
    console.log("✅ No columns to remove.");
    process.exit(0);
  }

  const alterSQL = `ALTER TABLE aset ${alterStatements.join(", ")}`;

  console.log(`\nExecuting SQL:\n${alterSQL}\n`);

  db.query(alterSQL, (err2) => {
    if (err2) {
      console.error("❌ Error altering table:", err2);
      process.exit(1);
    }

    console.log("✅ Successfully removed columns from aset table!");
    console.log("\nColumns removed:");
    existingColumns.forEach((col) => console.log(`  - ${col}`));

    console.log("\n📝 Notes:");
    console.log("  - Location details now managed via aset_lokasi table");
    console.log("  - Beban is now referenced via beban_id FK");
    console.log(
      "  - Update your routes/aset.js to remove Tempat and Beban references"
    );

    process.exit(0);
  });
});
