import db from "../db.js";
import dotenv from "dotenv";
import {
  toBebanArray,
  buildBebanFilterSQL,
} from "../routes/middleware/auth.js";
dotenv.config();

const username = process.argv[2];
if (!username) {
  console.error(
    "Usage: node scripts/showAccessibleAssetsForUser.js <username>"
  );
  process.exit(1);
}

db.query("SELECT * FROM user WHERE username = ?", [username], (err, rows) => {
  if (err) {
    console.error("Error querying user", err);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.error("User not found:", username);
    process.exit(1);
  }
  const user = rows[0];
  const bebanRaw = user.beban ?? user.Beban ?? "";
  const bebanList = toBebanArray(bebanRaw);
  console.log("User:", username, "beban:", JSON.stringify(bebanList));
  const { clause, params } = buildBebanFilterSQL("Beban", bebanList);
  const q = `SELECT * FROM aset WHERE ${clause}`;
  console.log("SQL:", q, "params:", params);
  db.query(q, params, (err2, asetRows) => {
    if (err2) {
      console.error("Error querying aset", err2);
      process.exit(1);
    }
    console.log("Accessible aset count:", (asetRows || []).length);
    (asetRows || []).forEach((r) => {
      console.log("-", r.AsetId, "Beban=", r.Beban, "NamaAset=", r.NamaAset);
    });
    process.exit(0);
  });
});
