import db from "../db.js";
import dotenv from "dotenv";
dotenv.config();

// This script ensures the `aset` table exists and optionally applies a desired schema.
// If the table doesn't exist, it will be created with the schema below.
// If the table exists, it reports column differences. Set APPLY_SCHEMA=true to alter columns to the provided schema (use with caution).

const DB = process.env.DB_NAME;
if (!DB) {
  console.error("Please set DB_NAME in your .env before running this script");
  process.exit(1);
}

const desiredSQL = `
CREATE TABLE aset (
  id INT AUTO_INCREMENT PRIMARY KEY,
  AsetId VARCHAR(50),
  AccurateId VARCHAR(50),
  NamaAset VARCHAR(255) NOT NULL,
  Spesifikasi TEXT,
  Grup ENUM('BANGUNAN','DISTRIBUSI JARINGAN','HEADEND','KENDARAAN','KOMPUTER','PERALATAN & INVENTARIS KANTOR','TANAH') NOT NULL,
  Beban ENUM('MLM','BJR-NET','BNT-NET','BTM-NET','GTO-NET','KDR-NET','LMP-NET','MLG-NET','PDG-NET','PKB-NET','PKP-NET','PLB-NET','SBY-NET','SMD-NET','SRG-NET','MLMKOB','MLMMET','MLMSDKB','MLMSL','BJR-MEDIA','BNT-MEDIA','BTM-MEDIA','GTO-MEDIA','KDR-MEDIA','LMP-MEDIA','MLG-MEDIA','PDG-MEDIA','PKB-MEDIA','PKP-MEDIA','PLB-MEDIA','SBY-MEDIA','SMD-MEDIA','SRG-MEDIA') NOT NULL,
  AkunPerkiraan ENUM('1701-01 (Tanah)','1701-02 (Bangunan)','1701-03 (Kendaraan)','1701-04 (Distribusi Jaringan / Headend)','1701-05 (Peralatan & Inventaris Kantor)','1701-06 (Renovasi & Instalasi Listrik)','1701-07 (Perlengkapan & Inventaris IT)'),
  NilaiAset INT,
  TglPembelian DATE,
  MasaManfaat INT,
  StatusAset ENUM('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif',
  Pengguna VARCHAR(100),
  Lokasi VARCHAR(255),
  Tempat VARCHAR(150),
  Keterangan TEXT,
  Gambar VARCHAR(255)
);
`;

const checkExistsQ = `SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset'`;

db.query(checkExistsQ, [DB], (err, rows) => {
  if (err) {
    console.error("Error checking aset table:", err);
    process.exit(1);
  }
  if (!rows || rows.length === 0) {
    console.log("Table 'aset' not found. Creating...");
    db.query(desiredSQL, (err2) => {
      if (err2) {
        console.error("Error creating aset table:", err2);
        process.exit(1);
      }
      console.log("Table 'aset' created successfully");
      process.exit(0);
    });
    return;
  }
  // Table exists — report columns
  const qCols = `SELECT COLUMN_NAME, COLUMN_TYPE, IS_NULLABLE, COLUMN_DEFAULT FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'aset'`;
  db.query(qCols, [DB], (err3, cols) => {
    if (err3) {
      console.error("Error reading aset columns:", err3);
      process.exit(1);
    }
    console.log("Found 'aset' table. Columns:");
    cols.forEach((c) => {
      console.log(
        ` - ${c.COLUMN_NAME} :: ${c.COLUMN_TYPE} ${
          c.IS_NULLABLE === "NO" ? "NOT NULL" : "NULL"
        } default=${c.COLUMN_DEFAULT}`
      );
    });
    if (process.env.APPLY_SCHEMA === "true") {
      console.log(
        "APPLY_SCHEMA=true — applying final creation schema changes."
      );
      // This is a light approach: attempt to alter missing columns. Do not drop existing columns.
      // We'll look for missing columns and add them with approximate settings.
      const desiredCols = [
        { name: "id", def: "INT AUTO_INCREMENT PRIMARY KEY" },
        { name: "AsetId", def: "VARCHAR(50)" },
        { name: "AccurateId", def: "VARCHAR(50)" },
        { name: "NamaAset", def: "VARCHAR(255) NOT NULL" },
        { name: "Spesifikasi", def: "TEXT" },
        {
          name: "Grup",
          def: `ENUM('BANGUNAN','DISTRIBUSI JARINGAN','HEADEND','KENDARAAN','KOMPUTER','PERALATAN & INVENTARIS KANTOR','TANAH') NOT NULL`,
        },
        {
          name: "Beban",
          def: `ENUM('MLM','BJR-NET','BNT-NET','BTM-NET','GTO-NET','KDR-NET','LMP-NET','MLG-NET','PDG-NET','PKB-NET','PKP-NET','PLB-NET','SBY-NET','SMD-NET','SRG-NET','MLMKOB','MLMMET','MLMSDKB','MLMSL','BJR-MEDIA','BNT-MEDIA','BTM-MEDIA','GTO-MEDIA','KDR-MEDIA','LMP-MEDIA','MLG-MEDIA','PDG-MEDIA','PKB-MEDIA','PKP-MEDIA','PLB-MEDIA','SBY-MEDIA','SMD-MEDIA','SRG-MEDIA') NOT NULL`,
        },
        {
          name: "AkunPerkiraan",
          def: `ENUM('1701-01 (Tanah)','1701-02 (Bangunan)','1701-03 (Kendaraan)','1701-04 (Distribusi Jaringan / Headend)','1701-05 (Peralatan & Inventaris Kantor)','1701-06 (Renovasi & Instalasi Listrik)','1701-07 (Perlengkapan & Inventaris IT)')`,
        },
        { name: "NilaiAset", def: "INT" },
        { name: "TglPembelian", def: "DATE" },
        { name: "MasaManfaat", def: "INT" },
        {
          name: "StatusAset",
          def: `ENUM('aktif','rusak','diperbaiki','dipinjam','dijual') NOT NULL DEFAULT 'aktif'`,
        },
        { name: "Pengguna", def: "VARCHAR(100)" },
        { name: "Lokasi", def: "VARCHAR(255)" },
        { name: "Tempat", def: "VARCHAR(150)" },
        { name: "Keterangan", def: "TEXT" },
        { name: "Gambar", def: "VARCHAR(255)" },
        { name: "FromMaster", def: "TINYINT(1) NOT NULL DEFAULT 0" },
      ];
      const existingColNames = new Set(cols.map((c) => c.COLUMN_NAME));
      const toAdd = desiredCols.filter((d) => !existingColNames.has(d.name));
      if (toAdd.length === 0) {
        console.log("No missing columns detected. Nothing else to do.");
        process.exit(0);
      }
      // Apply additions serially
      (function applyNext(i) {
        if (i >= toAdd.length) {
          console.log("All missing columns added successfully.");
          process.exit(0);
        }
        const col = toAdd[i];
        const sql = `ALTER TABLE aset ADD COLUMN ${col.name} ${col.def}`;
        console.log("Applying:", sql);
        db.query(sql, (err4) => {
          if (err4) {
            console.error("Error applying column", col.name, err4);
            process.exit(1);
          }
          console.log("Added column", col.name);
          applyNext(i + 1);
        });
      })(0);
    } else {
      console.log(
        "Run this script with APPLY_SCHEMA=true environment variable to automatically add missing columns (BE CAREFUL). Example:"
      );
      console.log("APPLY_SCHEMA=true node scripts/initAsetTable.js");
      process.exit(0);
    }
  });
});

// Wait a little to allow async operations; otherwise the script will exit before the query returns.
setTimeout(() => process.exit(0), 2000);
