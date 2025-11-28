import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

db.query("SELECT * FROM user", (err, result) => {
  if (err) {
    console.error("error querying users", err);
    process.exit(1);
  }
  console.log("users:", JSON.stringify(result, null, 2));
  process.exit(0);
});
