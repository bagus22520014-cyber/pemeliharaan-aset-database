import db from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const q = "DESCRIBE dijual";
db.query(q, (err, result) => {
  if (err) {
    console.error("error:", err);
    process.exit(1);
  }
  console.log("dijual table structure:");
  console.log(JSON.stringify(result, null, 2));
  process.exit(0);
});
