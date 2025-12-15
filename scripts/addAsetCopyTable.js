import db from "../db.js";

function createAsetCopy() {
  const q = `CREATE TABLE IF NOT EXISTS aset_copy LIKE aset`;
  db.query(q, (err) => {
    if (err) {
      console.error("[migrate] Failed to create aset_copy table:", err);
      process.exit(1);
    }
    console.log("[migrate] aset_copy table ensured (LIKE aset)");
    process.exit(0);
  });
}

createAsetCopy();
