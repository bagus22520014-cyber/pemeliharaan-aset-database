import db from "../db.js";

db.query(
  "SELECT id, AsetId, NamaAset, approval_status FROM aset WHERE approval_status = 'diajukan'",
  (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    console.log(rows);
    process.exit(0);
  }
);
