import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

/**
 * Migration: add approver columns to notification table
 * Columns: approver_user_id INT NULL, approver_username VARCHAR(100) NULL, approver_role VARCHAR(50) NULL
 */

function addColumns() {
  console.log("Checking notification table for approver columns...");

  const checkQuery = `
    SELECT COLUMN_NAME FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'notification'
    AND COLUMN_NAME IN ('approver_user_id','approver_username','approver_role')
  `;

  db.query(checkQuery, [process.env.DB_NAME], (err, rows) => {
    if (err) {
      console.error("Error checking notification columns:", err);
      process.exit(1);
    }

    const existing = (rows || []).map((r) => r.COLUMN_NAME);
    const toAdd = [];
    if (!existing.includes("approver_user_id"))
      toAdd.push(
        `ALTER TABLE notification ADD COLUMN approver_user_id INT NULL`
      );
    if (!existing.includes("approver_username"))
      toAdd.push(
        `ALTER TABLE notification ADD COLUMN approver_username VARCHAR(100) NULL`
      );
    if (!existing.includes("approver_role"))
      toAdd.push(
        `ALTER TABLE notification ADD COLUMN approver_role VARCHAR(50) NULL`
      );

    if (toAdd.length === 0) {
      console.log("✓ notification already has approver columns");
      process.exit(0);
    }

    let i = 0;
    function runNext() {
      if (i >= toAdd.length) {
        console.log("✓ Added approver columns to notification table");
        process.exit(0);
      }
      const q = toAdd[i++];
      db.query(q, (err2) => {
        if (err2 && !err2.message.includes("Duplicate column")) {
          console.error("Error altering notification:", err2);
          process.exit(1);
        }
        runNext();
      });
    }

    runNext();
  });
}

addColumns();
