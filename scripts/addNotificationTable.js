import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

console.log("Creating notification table...");

const createTableSQL = `
CREATE TABLE IF NOT EXISTS notification (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    beban VARCHAR(50) NULL,
    tipe ENUM('info', 'warning', 'success', 'error') DEFAULT 'info',
    judul VARCHAR(255) NOT NULL,
    pesan TEXT NOT NULL,
    link VARCHAR(500) NULL,
    tabel_ref ENUM('aset', 'perbaikan', 'user') NULL,
    record_id INT NULL,
    dibaca BOOLEAN DEFAULT FALSE,
    waktu_dibuat TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    waktu_dibaca TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE CASCADE,
    INDEX idx_user_dibaca (user_id, dibaca),
    INDEX idx_beban_dibaca (beban, dibaca)
)
`;

db.query(createTableSQL, (err, result) => {
  if (err) {
    console.error("Error creating notification table:", err);
    process.exit(1);
  }
  console.log("Table 'notification' created successfully or already exists");
  console.log(result);
  process.exit(0);
});
