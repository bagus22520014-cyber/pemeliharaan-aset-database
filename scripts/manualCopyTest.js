import db from "../db.js";

const idToCopy = parseInt(process.argv[2] || "0", 10);
if (!idToCopy) {
  console.error("Usage: node scripts/manualCopyTest.js <id>");
  process.exit(1);
}

db.query(
  "INSERT INTO aset_copy SELECT * FROM aset WHERE id = ?",
  [idToCopy],
  (err, result) => {
    if (err) {
      console.error("[manualCopyTest] copy error:", err.message || err);
      process.exit(1);
    }
    console.log("[manualCopyTest] copy result:", result);
    process.exit(0);
  }
);
