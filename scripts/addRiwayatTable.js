import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Creating riwayat table...");

const createTableSQL = `
CREATE TABLE IF NOT EXISTS riwayat (
    id INT AUTO_INCREMENT PRIMARY KEY,
    jenis_aksi ENUM('input', 'edit') NOT NULL,
    user_id INT NOT NULL,
    role ENUM('admin','user') NOT NULL,
    aset_id INT NOT NULL,
    perubahan JSON NULL,
    waktu TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE
)
`;

db.query(createTableSQL, (err, result) => {
  if (err) {
    console.error("Error creating riwayat table:", err);
    process.exit(1);
  }
  console.log("Table 'riwayat' created successfully or already exists");
  console.log(result);
  process.exit(0);
});
