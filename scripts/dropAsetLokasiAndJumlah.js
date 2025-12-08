import dotenv from "dotenv";
dotenv.config();
import db from "../db.js";

console.log("=== Drop aset_lokasi Table and jumlah Column ===\n");

// Step 1: Remove lokasi_id foreign key from transaction tables
console.log(
  "Step 1: Removing lokasi_id foreign keys from transaction tables..."
);
const dropFKQueries = [
  "ALTER TABLE perbaikan DROP FOREIGN KEY IF EXISTS fk_perbaikan_lokasi",
  "ALTER TABLE rusak DROP FOREIGN KEY IF EXISTS fk_rusak_lokasi",
  "ALTER TABLE dipinjam DROP FOREIGN KEY IF EXISTS fk_dipinjam_lokasi",
  "ALTER TABLE dijual DROP FOREIGN KEY IF EXISTS fk_dijual_lokasi",
  "ALTER TABLE perbaikan DROP COLUMN IF EXISTS lokasi_id",
  "ALTER TABLE rusak DROP COLUMN IF EXISTS lokasi_id",
  "ALTER TABLE dipinjam DROP COLUMN IF EXISTS lokasi_id",
  "ALTER TABLE dijual DROP COLUMN IF EXISTS lokasi_id",
];

let fkIndex = 0;
function dropNextFK() {
  if (fkIndex >= dropFKQueries.length) {
    console.log("✅ Foreign keys and lokasi_id columns removed\n");
    dropAsetLokasiTable();
    return;
  }

  db.query(dropFKQueries[fkIndex], (err) => {
    if (err && !err.message.includes("check that column/key exists")) {
      console.log(`⚠️  Query ${fkIndex + 1}: ${err.message}`);
    }
    fkIndex++;
    dropNextFK();
  });
}

function dropAsetLokasiTable() {
  // Step 2: Drop aset_lokasi table
  console.log("Step 2: Dropping aset_lokasi table...");
  db.query("DROP TABLE IF EXISTS aset_lokasi", (err) => {
    if (err) {
      console.error("❌ Error dropping aset_lokasi table:", err.message);
      db.end();
      return;
    }
    console.log("✅ aset_lokasi table dropped successfully\n");

    // Step 3: Remove jumlah column from aset table
    console.log("Step 3: Removing jumlah column from aset table...");
    db.query("ALTER TABLE aset DROP COLUMN IF EXISTS jumlah", (err2) => {
      if (err2) {
        console.error("❌ Error removing jumlah column:", err2.message);
        db.end();
        return;
      }
      console.log("✅ jumlah column removed from aset table successfully\n");

      console.log("=== Cleanup Complete ===");
      console.log("✅ Foreign keys removed from transaction tables");
      console.log("✅ lokasi_id columns removed from transaction tables");
      console.log("✅ aset_lokasi table dropped");
      console.log("✅ jumlah column removed from aset");

      db.end();
    });
  });
}

dropNextFK();
