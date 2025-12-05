import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Updating riwayat table to support all operations...");

const updateTableSQL = `
ALTER TABLE riwayat 
MODIFY COLUMN jenis_aksi ENUM('input', 'edit', 'delete', 'perbaikan_input', 'perbaikan_edit', 'perbaikan_delete') NOT NULL,
ADD COLUMN tabel_ref ENUM('aset', 'perbaikan') DEFAULT 'aset' AFTER aset_id,
ADD COLUMN record_id INT NULL AFTER tabel_ref
`;

db.query(updateTableSQL, (err, result) => {
  if (err) {
    console.error("Error updating riwayat table:", err);
    process.exit(1);
  }
  console.log("Table 'riwayat' updated successfully");
  console.log(result);
  process.exit(0);
});
