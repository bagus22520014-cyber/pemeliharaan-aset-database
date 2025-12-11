import db from "./db.js";
import dotenv from "dotenv";
dotenv.config();

db.query("DESCRIBE notification", (err, result) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
});
