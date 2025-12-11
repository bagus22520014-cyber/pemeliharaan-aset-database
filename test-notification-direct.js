import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

// Test notification creation directly
const qNotif = `
  INSERT INTO notification 
  (user_id, beban, tipe, judul, pesan, link, tabel_ref, record_id) 
  VALUES (?, NULL, 'approval', 'Test Persetujuan', 'Test message from script', NULL, 'test', 999)
`;

db.query(qNotif, [38], (err, result) => {
  if (err) {
    console.error("Error creating notification:", err);
    process.exit(1);
  }

  console.log("✓ Notification created successfully");
  console.log("  Insert ID:", result.insertId);

  // Check if it was created
  db.query(
    "SELECT * FROM notification WHERE id = ?",
    [result.insertId],
    (err2, rows) => {
      if (err2) {
        console.error("Error fetching notification:", err2);
        process.exit(1);
      }

      console.log("\n✓ Notification retrieved:");
      console.table(rows);

      process.exit(0);
    }
  );
});
