import dotenv from "dotenv";
dotenv.config();
import db from "../db.js";

console.log("=== Adding mutasi Table ===\n");

const createMutasiTable = `
CREATE TABLE IF NOT EXISTS mutasi (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aset_id INT NOT NULL,
  TglMutasi DATE NOT NULL,
  departemen_asal_id INT,
  departemen_tujuan_id INT,
  ruangan_asal VARCHAR(255),
  ruangan_tujuan VARCHAR(255),
  alasan TEXT,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  FOREIGN KEY (departemen_asal_id) REFERENCES departemen(id) ON DELETE SET NULL,
  FOREIGN KEY (departemen_tujuan_id) REFERENCES departemen(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

db.query(createMutasiTable, (err) => {
  if (err) {
    console.error("❌ Error creating mutasi table:", err.message);
    db.end();
    return;
  }
  console.log("✅ mutasi table created successfully");
  console.log("\nTable structure:");
  console.log("- id: Auto-increment primary key");
  console.log("- aset_id: Foreign key to aset table");
  console.log("- TglMutasi: Date of mutation");
  console.log("- departemen_asal_id: Source department (nullable)");
  console.log("- departemen_tujuan_id: Destination department (nullable)");
  console.log("- ruangan_asal: Source room/location");
  console.log("- ruangan_tujuan: Destination room/location");
  console.log("- alasan: Reason for mutation");
  console.log("- catatan: Additional notes");
  console.log("- created_at: Record creation timestamp");
  console.log("- updated_at: Last update timestamp");

  console.log("\n=== Migration Complete ===");
  db.end();
});
