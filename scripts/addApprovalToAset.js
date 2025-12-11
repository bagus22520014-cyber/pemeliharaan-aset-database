import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

/**
 * Migration: Add approval_status and approval_date columns to aset table
 */

function addApprovalColumnsToAset() {
  console.log("Checking if approval columns exist in aset table...");

  // Check if columns already exist
  const checkQuery = `
    SELECT COUNT(*) as count 
    FROM information_schema.COLUMNS 
    WHERE TABLE_SCHEMA = ? 
    AND TABLE_NAME = 'aset' 
    AND COLUMN_NAME IN ('approval_status', 'approval_date')
  `;

  db.query(checkQuery, [process.env.DB_NAME], (err, rows) => {
    if (err) {
      console.error("Error checking columns:", err);
      process.exit(1);
    }

    const existingCount = rows[0].count;

    if (existingCount === 2) {
      console.log("✓ Approval columns already exist in aset table");
      process.exit(0);
    }

    console.log(
      `Found ${existingCount} of 2 approval columns. Adding missing columns...`
    );

    // Add approval_status column
    const addApprovalStatus = `
      ALTER TABLE aset 
      ADD COLUMN IF NOT EXISTS approval_status ENUM('diajukan','disetujui','ditolak') DEFAULT 'diajukan'
    `;

    // Add approval_date column
    const addApprovalDate = `
      ALTER TABLE aset 
      ADD COLUMN IF NOT EXISTS approval_date DATETIME DEFAULT NULL
    `;

    db.query(addApprovalStatus, (err1) => {
      if (err1 && !err1.message.includes("Duplicate column")) {
        console.error("Error adding approval_status column:", err1);
        process.exit(1);
      }

      db.query(addApprovalDate, (err2) => {
        if (err2 && !err2.message.includes("Duplicate column")) {
          console.error("Error adding approval_date column:", err2);
          process.exit(1);
        }

        console.log("✓ Successfully added approval columns to aset table");
        console.log(
          "  - approval_status ENUM('diajukan','disetujui','ditolak') DEFAULT 'diajukan'"
        );
        console.log("  - approval_date DATETIME DEFAULT NULL");

        process.exit(0);
      });
    });
  });
}

// Run migration
addApprovalColumnsToAset();
