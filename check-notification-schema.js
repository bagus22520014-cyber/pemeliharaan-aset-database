import dotenv from "dotenv";
import db from "./db.js";

dotenv.config();

// Check notification table structure
db.query("DESCRIBE notification", (err, rows) => {
  if (err) {
    console.error("Error:", err);
    process.exit(1);
  }

  console.log("Notification table structure:");
  console.table(rows);

  // Check for admin users
  db.query(
    "SELECT id, username, role FROM user WHERE role = 'admin'",
    (err2, admins) => {
      if (err2) {
        console.error("Error fetching admins:", err2);
        process.exit(1);
      }

      console.log("\nAdmin users:");
      console.table(admins);

      // Check recent notifications
      db.query(
        "SELECT * FROM notification ORDER BY id DESC LIMIT 5",
        (err3, notifs) => {
          if (err3) {
            console.error("Error fetching notifications:", err3);
            process.exit(1);
          }

          console.log("\nRecent notifications:");
          console.table(notifs);

          process.exit(0);
        }
      );
    }
  );
});
