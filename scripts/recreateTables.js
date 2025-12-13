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
  console.log("✅ Koneksi database berhasil\n");
});

console.log("⚠️  PERHATIAN: Script ini akan DROP dan RECREATE tabel!");
console.log("📋 Tabel yang akan dibuat ulang:");
console.log("   - riwayat");
console.log("   - perbaikan");
console.log("   - rusak");
console.log("   - dipinjam");
console.log("   - dijual\n");

// Drop existing tables
const dropTables = `
DROP TABLE IF EXISTS riwayat;
DROP TABLE IF EXISTS perbaikan;
DROP TABLE IF EXISTS rusak;
DROP TABLE IF EXISTS dipinjam;
DROP TABLE IF EXISTS dijual;
`;

// Create riwayat table
const createRiwayat = `
CREATE TABLE riwayat (
  id INT AUTO_INCREMENT PRIMARY KEY,
  jenis_aksi VARCHAR(50),
  user_id INT,
  role VARCHAR(20),
  aset_id INT,
  perubahan JSON,
  tabel_ref VARCHAR(50),
  record_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES user(id) ON DELETE SET NULL,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  INDEX idx_aset_id (aset_id),
  INDEX idx_user_id (user_id),
  INDEX idx_tabel_ref (tabel_ref),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Create perbaikan table
const createPerbaikan = `
CREATE TABLE perbaikan (
  id INT AUTO_INCREMENT PRIMARY KEY,
  aset_id INT NOT NULL,
  tanggal_perbaikan DATE NOT NULL,
  deskripsi TEXT,
  biaya INT DEFAULT 0,
  teknisi VARCHAR(255),
  status ENUM('pending','selesai','batal') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (aset_id) REFERENCES aset(id) ON DELETE CASCADE,
  INDEX idx_aset_id (aset_id),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

// Create rusak table
const createRusak = `
CREATE TABLE rusak (
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
const createDipinjam = `
CREATE TABLE dipinjam (
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
const createDijual = `
CREATE TABLE dijual (
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

console.log("🗑️  Dropping existing tables...\n");

// Drop tables one by one
const tablesToDrop = ["riwayat", "perbaikan", "rusak", "dipinjam", "dijual"];
let dropIndex = 0;

function dropNextTable() {
  if (dropIndex >= tablesToDrop.length) {
    console.log("✅ All tables dropped\n");
    createTables();
    return;
  }

  const table = tablesToDrop[dropIndex];
  connection.query(`DROP TABLE IF EXISTS ${table}`, (err) => {
    if (err) {
      console.error(`❌ Error dropping ${table}:`, err.message);
      process.exit(1);
    }
    console.log(`✅ Dropped ${table}`);
    dropIndex++;
    dropNextTable();
  });
}

function createTables() {
  console.log("\n🔧 Creating new tables...\n");

  // Create riwayat
  connection.query(createRiwayat, (err) => {
    if (err) {
      console.error("❌ Failed to create riwayat table:", err.message);
      process.exit(1);
    }
    console.log("✅ riwayat table created");

    // Create perbaikan
    connection.query(createPerbaikan, (err) => {
      if (err) {
        console.error("❌ Failed to create perbaikan table:", err.message);
        process.exit(1);
      }
      console.log("✅ perbaikan table created");

      // Create rusak
      connection.query(createRusak, (err) => {
        if (err) {
          console.error("❌ Failed to create rusak table:", err.message);
          process.exit(1);
        }
        console.log("✅ rusak table created");

        // Create dipinjam
        connection.query(createDipinjam, (err) => {
          if (err) {
            console.error("❌ Failed to create dipinjam table:", err.message);
            process.exit(1);
          }
          console.log("✅ dipinjam table created");

          // Create dijual
          connection.query(createDijual, (err) => {
            if (err) {
              console.error("❌ Failed to create dijual table:", err.message);
              process.exit(1);
            }
            console.log("✅ dijual table created");

            console.log("\n🎉 All tables successfully recreated!");
            console.log("\n📋 Struktur tabel:");
            console.log(
              "   - riwayat: jenis_aksi, user_id FK, aset_id FK, perubahan JSON, tabel_ref, record_id"
            );
            console.log(
              "   - perbaikan: aset_id FK, tanggal_perbaikan, deskripsi, biaya, teknisi, status"
            );
            console.log(
              "   - rusak: aset_id FK, TglRusak, Kerusakan, jumlah_rusak, StatusRusak, catatan"
            );
            console.log(
              "   - dipinjam: aset_id FK, Peminjam, TglPinjam, TglKembali, jumlah_dipinjam, StatusPeminjaman, catatan"
            );
            console.log(
              "   - dijual: aset_id FK, TglDijual, HargaJual, Pembeli, jumlah_dijual, catatan"
            );
            console.log(
              "\n💡 Semua tabel menggunakan aset_id sebagai FK ke tabel aset (bukan AsetId VARCHAR)"
            );
            console.log("⚠️  Data lama sudah terhapus!");

            connection.end();
            process.exit(0);
          });
        });
      });
    });
  });
}

dropNextTable();
