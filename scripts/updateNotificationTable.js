import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

/**
 * Migration: Update notification table schema
 * Adds: dibaca (instead of is_read), waktu_dibuat, waktu_dibaca, judul, pesan, link
 */

function updateNotificationTable() {
  console.log("Updating notification table schema...");

  const alterations = [
    // Drop old column if exists, add new one
    `ALTER TABLE notification DROP COLUMN IF EXISTS is_read`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS dibaca TINYINT(1) DEFAULT 0`,

    // Add new columns
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS waktu_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS waktu_dibaca TIMESTAMP NULL DEFAULT NULL`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS judul VARCHAR(255) DEFAULT NULL`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS pesan TEXT DEFAULT NULL`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS link VARCHAR(500) DEFAULT NULL`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS tabel_ref VARCHAR(50) DEFAULT NULL`,
    `ALTER TABLE notification ADD COLUMN IF NOT EXISTS record_id INT(11) DEFAULT NULL`,

    // Modify existing columns
    `ALTER TABLE notification MODIFY COLUMN type ENUM('info','warning','success','error','approval') DEFAULT 'info'`,
    `ALTER TABLE notification MODIFY COLUMN message TEXT DEFAULT NULL`,
  ];

  let completed = 0;
  const total = alterations.length;

  alterations.forEach((query, index) => {
    db.query(query, (err) => {
      if (
        err &&
        !err.message.includes("Duplicate column") &&
        !err.message.includes("Can't DROP")
      ) {
        console.error(`Error executing query ${index + 1}:`, err.message);
      } else {
        console.log(`✓ Query ${index + 1}/${total} completed`);
      }

      completed++;
      if (completed === total) {
        console.log("\n✓ Notification table schema updated successfully");
        console.log("New columns:");
        console.log("  - dibaca TINYINT(1) DEFAULT 0");
        console.log("  - waktu_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP");
        console.log("  - waktu_dibaca TIMESTAMP NULL");
        console.log("  - judul VARCHAR(255)");
        console.log("  - pesan TEXT");
        console.log("  - link VARCHAR(500)");
        console.log("Updated columns:");
        console.log("  - type ENUM with 'approval' added");
        process.exit(0);
      }
    });
  });
}

// Run migration
updateNotificationTable();
