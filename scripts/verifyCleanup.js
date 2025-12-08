import dotenv from "dotenv";
dotenv.config();
import db from "../db.js";

console.log("=== Verifying Database Cleanup ===\n");

// Check if aset_lokasi table exists
console.log("1. Checking for aset_lokasi table...");
db.query("SHOW TABLES LIKE 'aset_lokasi'", (err, tables) => {
  if (err) {
    console.error("❌ Error checking tables:", err.message);
    db.end();
    return;
  }

  if (tables && tables.length > 0) {
    console.log("❌ aset_lokasi table still exists!");
  } else {
    console.log("✅ aset_lokasi table not found (good)");
  }

  // Check aset table structure
  console.log("\n2. Checking aset table structure...");
  db.query("DESCRIBE aset", (err2, columns) => {
    if (err2) {
      console.error("❌ Error describing aset table:", err2.message);
      db.end();
      return;
    }

    const jumlahColumn = columns.find((col) => col.Field === "jumlah");
    const nilaiSatuanColumn = columns.find(
      (col) => col.Field === "nilai_satuan"
    );

    if (jumlahColumn) {
      console.log("❌ 'jumlah' column still exists in aset table!");
    } else {
      console.log("✅ 'jumlah' column not found in aset table (good)");
    }

    if (nilaiSatuanColumn) {
      console.log("❌ 'nilai_satuan' column still exists in aset table!");
    } else {
      console.log("✅ 'nilai_satuan' column not found in aset table (good)");
    }

    // Check transaction tables for lokasi_id
    console.log("\n3. Checking transaction tables for lokasi_id...");
    const transactionTables = ["perbaikan", "rusak", "dipinjam", "dijual"];
    let checkedCount = 0;

    transactionTables.forEach((tableName) => {
      db.query(`DESCRIBE ${tableName}`, (err3, cols) => {
        if (err3) {
          console.error(`❌ Error checking ${tableName}:`, err3.message);
        } else {
          const lokasiIdColumn = cols.find((col) => col.Field === "lokasi_id");
          if (lokasiIdColumn) {
            console.log(
              `❌ 'lokasi_id' column still exists in ${tableName} table!`
            );
          } else {
            console.log(
              `✅ 'lokasi_id' column not found in ${tableName} table (good)`
            );
          }
        }

        checkedCount++;
        if (checkedCount === transactionTables.length) {
          console.log("\n=== Verification Complete ===");
          db.end();
        }
      });
    });
  });
});
