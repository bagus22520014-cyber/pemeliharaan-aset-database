import dotenv from "dotenv";
import mysql from "mysql2";

dotenv.config();

const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASS,
  database: process.env.DB_NAME,
});

connection.connect((err) => {
  if (err) {
    console.error("❌ Koneksi database gagal:", err.message);
    process.exit(1);
  }
  console.log("✅ Koneksi database berhasil");
});

// Create rusak table
const createRusakTable = `
CREATE TABLE IF NOT EXISTS rusak (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aset_id INT NOT NULL,
  TglRusak DATE,
  Kerusakan TEXT,
  jumlah_rusak INT,
  StatusRusak ENUM('temporary','permanent'),
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  INDEX idx_aset_id (aset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Create dipinjam table
const createDipinjamTable = `
CREATE TABLE IF NOT EXISTS dipinjam (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aset_id INT NOT NULL,
  Peminjam VARCHAR(255),
  TglPinjam DATE,
  TglKembali DATE NULL,
  jumlah_dipinjam INT,
  StatusPeminjaman ENUM('dipinjam','dikembalikan') DEFAULT 'dipinjam',
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  INDEX idx_aset_id (aset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Create dijual table
const createDijualTable = `
CREATE TABLE IF NOT EXISTS dijual (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aset_id INT NOT NULL,
  TglDijual DATE,
  HargaJual INT,
  Pembeli VARCHAR(255),
  jumlah_dijual INT,
  catatan TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  INDEX idx_aset_id (aset_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

console.log("🔧 Membuat tabel rusak, dipinjam, dijual...\n");

connection.query(createRusakTable, (err, result) => {
  if (err) {
    console.error("❌ Gagal membuat tabel rusak:", err.message);
    process.exit(1);
  }
  console.log("✅ Tabel rusak berhasil dibuat");

  connection.query(createDipinjamTable, (err, result) => {
    if (err) {
      console.error("❌ Gagal membuat tabel dipinjam:", err.message);
      process.exit(1);
    }
    console.log("✅ Tabel dipinjam berhasil dibuat");

    connection.query(createDijualTable, (err, result) => {
      if (err) {
        console.error("❌ Gagal membuat tabel dijual:", err.message);
        process.exit(1);
      }
      console.log("✅ Tabel dijual berhasil dibuat");

      console.log("\n🎉 Semua tabel berhasil dibuat!");
      console.log("\n📋 Struktur tabel:");
      console.log(
        "   - rusak: id, aset_id FK, TglRusak, Kerusakan, jumlah_rusak, StatusRusak, catatan"
      );
      console.log(
        "   - dipinjam: id, aset_id FK, Peminjam, TglPinjam, TglKembali, jumlah_dipinjam, StatusPeminjaman, catatan"
      );
      console.log(
        "   - dijual: id, aset_id FK, TglDijual, HargaJual, Pembeli, jumlah_dijual, catatan"
      );
      console.log(
        "\n💡 Gunakan aset_id sebagai FK ke tabel aset (bukan AsetId VARCHAR)"
      );

      connection.end();
      process.exit(0);
    });
  });
});
