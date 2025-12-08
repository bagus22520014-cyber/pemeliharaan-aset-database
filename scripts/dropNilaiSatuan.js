import dotenv from "dotenv";
dotenv.config();
import db from "../db.js";

console.log("=== Drop nilai_satuan Column ===\n");

console.log("Removing nilai_satuan column from aset table...");
db.query("ALTER TABLE aset DROP COLUMN IF EXISTS nilai_satuan", (err) => {
  if (err) {
    console.error("❌ Error removing nilai_satuan column:", err.message);
    db.end();
    return;
  }
  console.log("✅ nilai_satuan column removed from aset table successfully\n");

  console.log("=== Cleanup Complete ===");
  console.log("✅ nilai_satuan column removed from aset");

  db.end();
});
