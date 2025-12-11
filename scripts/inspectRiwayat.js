import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

const q = `SELECT id, jenis_aksi, tabel_ref, record_id, perubahan, created_at FROM riwayat ORDER BY created_at DESC LIMIT 20`;
db.query(q, (err, rows) => {
  if (err) {
    console.error("Error querying riwayat:", err);
    process.exit(1);
  }
  rows.forEach((r) => {
    let perubahan = r.perubahan;
    try {
      perubahan = perubahan ? JSON.parse(perubahan) : null;
    } catch (e) {}
    console.log(
      "ID:",
      r.id,
      "jenis_aksi:",
      r.jenis_aksi,
      "tabel_ref:",
      r.tabel_ref,
      "record_id:",
      r.record_id,
      "created_at:",
      r.created_at
    );
    console.log("  perubahan:", JSON.stringify(perubahan));
  });
  // Also inspect column type for jenis_aksi
  const q2 = `SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'riwayat' AND COLUMN_NAME = 'jenis_aksi'`;
  db.query(q2, [process.env.DB_NAME], (err2, cols) => {
    if (!err2 && cols && cols.length > 0) {
      console.log("jenis_aksi column type:", cols[0].COLUMN_TYPE);
    }
    process.exit(0);
  });
});
