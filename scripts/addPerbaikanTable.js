import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

// Create perbaikan table if it doesn't exist
const checkQ = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'perbaikan'`;
db.query(checkQ, [process.env.DB_NAME], (err, rows) => {
  if (err) {
    console.error("Error checking for perbaikan table:", err);
    process.exit(1);
  }
  if (rows && rows.length > 0) {
    console.log("Table 'perbaikan' already exists; skipping creation.");
    process.exit(0);
  }
  const createQ = `
    CREATE TABLE perbaikan (
      id INT AUTO_INCREMENT PRIMARY KEY,
      AsetId VARCHAR(50) NOT NULL,
      tanggal DATE NOT NULL,
      PurchaseOrder VARCHAR(100),
      vendor VARCHAR(255),
      bagian VARCHAR(100),
      nominal INT,
      FOREIGN KEY (AsetId) REFERENCES aset(AsetId)
        ON UPDATE CASCADE
        ON DELETE CASCADE
    )
  `;
  db.query(createQ, (err2) => {
    if (err2) {
      console.error("Error creating perbaikan table:", err2);
      process.exit(1);
    }
    console.log("Table 'perbaikan' created successfully");
    process.exit(0);
  });
});

// keep process alive for async queries
setTimeout(() => process.exit(0), 2000);
