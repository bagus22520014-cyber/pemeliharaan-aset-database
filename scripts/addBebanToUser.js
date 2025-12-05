import db from "../db.js";
import dotenv from "dotenv";
import { toBebanArray } from "../routes/middleware/auth.js";
dotenv.config();

const username = process.argv[2];
const newBebanArgs = process.argv.slice(3);
if (!username || newBebanArgs.length === 0) {
  console.error(
    "Usage: node scripts/addBebanToUser.js <username> <beban1> [beban2] ..."
  );
  process.exit(1);
}

db.query(
  "SELECT beban FROM user WHERE username = ?",
  [username],
  (err, rows) => {
    if (err) {
      console.error("Error querying user", err);
      process.exit(1);
    }
    if (!rows || rows.length === 0) {
      console.error("User not found:", username);
      process.exit(1);
    }
    const raw = rows[0].beban ?? rows[0].Beban ?? "";
    const bebanList = toBebanArray(raw);
    const merged = Array.from(new Set([...bebanList, ...newBebanArgs]));
    const placeholders = merged.map(() => "?").join(",");
    const q = `UPDATE user SET beban = JSON_ARRAY(${placeholders}) WHERE username = ?`;
    const params = [...merged, username];
    db.query(q, params, (err2, res) => {
      if (err2) {
        console.error("Error updating user beban", err2);
        process.exit(1);
      }
      console.log("Updated user", username, "beban=", JSON.stringify(merged));
      process.exit(0);
    });
  }
);
