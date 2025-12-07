import db from "./db.js";
import dotenv from "dotenv";
dotenv.config();

const q = "DESCRIBE aset";
db.query(q, (err, result) => {
  if (err) {
    console.error("error:", err);
    process.exit(1);
  }
  console.log("Required fields (NOT NULL):");
  const required = result.filter((f) => f.Null === "NO");
  console.log(JSON.stringify(required, null, 2));
  process.exit(0);
});
