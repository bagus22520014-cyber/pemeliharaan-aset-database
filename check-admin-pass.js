import db from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const q = "SELECT username, password, role FROM user WHERE username = 'admin'";
db.query(q, (err, result) => {
  if (err) {
    console.error("error:", err);
    process.exit(1);
  }
  console.log("Admin user info:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
});
