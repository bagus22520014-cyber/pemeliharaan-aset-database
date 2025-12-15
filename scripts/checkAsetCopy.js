import db from "../db.js";

function check() {
  const qCount = `SELECT COUNT(*) as cnt FROM aset_copy`;
  db.query(qCount, (err, rows) => {
    if (err) {
      console.error(
        "[checkAsetCopy] Error querying aset_copy:",
        err.message || err
      );
      process.exit(1);
    }
    console.log("aset_copy count:", rows[0].cnt);
    const qLast = `SELECT id, AsetId, NamaAset, beban_id, departemen_id, StatusAset FROM aset_copy ORDER BY id DESC LIMIT 5`;
    db.query(qLast, (err2, rows2) => {
      if (err2) {
        console.error(
          "[checkAsetCopy] Error fetching rows:",
          err2.message || err2
        );
        process.exit(1);
      }
      console.log("Last rows in aset_copy:");
      console.table(rows2 || []);
      process.exit(0);
    });
  });
}

check();
