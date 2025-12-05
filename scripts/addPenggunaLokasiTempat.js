import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Adding Pengguna, Lokasi, and Tempat columns to aset table...");

const sql = `
ALTER TABLE aset
ADD COLUMN Pengguna VARCHAR(100) AFTER StatusAset,
ADD COLUMN Lokasi VARCHAR(255) AFTER Pengguna,
ADD COLUMN Tempat VARCHAR(150) AFTER Lokasi
`;

db.query(sql, (err, result) => {
  if (err) {
    if (err.code === "ER_DUP_FIELDNAME") {
      console.log("Columns already exist. Skipping.");
      process.exit(0);
    }
    console.error("Error adding columns:", err);
    process.exit(1);
  }
  console.log("Columns added successfully:", result);
  process.exit(0);
});
