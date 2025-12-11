import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

/**
 * Migration: Add approver columns to transaction tables
 * Columns added:
 *  - approval_by_user_id INT NULL
 *  - approval_by_username VARCHAR(100) NULL
 *  - approval_by_role VARCHAR(50) NULL
 */

const tables = ["aset", "perbaikan", "rusak", "dipinjam", "dijual", "mutasi"];

function addColumns() {
  console.log("Checking/adding approver columns to transaction tables...");

  let idx = 0;

  function next() {
    if (idx >= tables.length) {
      console.log("✓ Done adding approver columns to all tables");
      process.exit(0);
    }

    const table = tables[idx++];
    console.log(`Processing table: ${table}`);

    const checkQuery = `
      SELECT COLUMN_NAME FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?
      AND COLUMN_NAME IN ('approval_by_user_id','approval_by_username','approval_by_role')
    `;

    db.query(checkQuery, [process.env.DB_NAME, table], (err, rows) => {
      if (err) {
        console.error(`Error checking columns for ${table}:`, err);
        process.exit(1);
      }

      const existing = (rows || []).map((r) => r.COLUMN_NAME);

      const toAdd = [];
      if (!existing.includes("approval_by_user_id"))
        toAdd.push(
          `ALTER TABLE ${table} ADD COLUMN approval_by_user_id INT NULL`
        );
      if (!existing.includes("approval_by_username"))
        toAdd.push(
          `ALTER TABLE ${table} ADD COLUMN approval_by_username VARCHAR(100) NULL`
        );
      if (!existing.includes("approval_by_role"))
        toAdd.push(
          `ALTER TABLE ${table} ADD COLUMN approval_by_role VARCHAR(50) NULL`
        );

      if (toAdd.length === 0) {
        console.log(`  ✓ Approver columns already exist on ${table}`);
        return next();
      }

      // Execute alterations sequentially for this table
      let aidx = 0;
      function runAlter() {
        if (aidx >= toAdd.length) return next();
        const q = toAdd[aidx++];
        db.query(q, (err2) => {
          if (err2 && !err2.message.includes("Duplicate column")) {
            console.error(`Error altering ${table}:`, err2);
            process.exit(1);
          }
          runAlter();
        });
      }

      runAlter();
    });
  }

  next();
}

addColumns();
