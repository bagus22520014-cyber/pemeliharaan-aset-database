import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

function alterTableIfNeeded() {
  // Check if column exists; if not, add it.
  const checks = [
    {
      column: "StatusAset",
      sql: `ALTER TABLE aset ADD COLUMN StatusAset ENUM('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif'`,
    },
    {
      column: "Keterangan",
      sql: `ALTER TABLE aset ADD COLUMN Keterangan TEXT NULL`,
    },
    // Kekurangan removed: use Keterangan instead for notes
  ];

  checks.forEach((c) => {
    const qCheck = `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset' AND COLUMN_NAME = ?`;
    db.query(qCheck, [process.env.DB_NAME, c.column], (err, res) => {
      if (err) {
        console.error(`Error checking column ${c.column}:`, err);
        return;
      }
      if (res.length > 0) {
        console.log(`Column ${c.column} already exists, skipping`);
        return;
      }
      // Add column
      db.query(c.sql, (err2) => {
        if (err2) {
          console.error(`Error adding column ${c.column}:`, err2);
          return;
        }
        console.log(`Column ${c.column} added successfully`);
      });
    });
  });
}

alterTableIfNeeded();

// Close pool gracefully
setTimeout(() => process.exit(0), 2000);
