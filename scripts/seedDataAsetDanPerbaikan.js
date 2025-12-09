import dotenv from "dotenv";
import db from "../db.js";

dotenv.config();

// Data aset contoh dengan format AsetId: xxxx/beban/tahun
const asetData = [
  {
    AsetId: "0001/MLM/2023",
    AccurateId: "-",
    NamaAset: "Laptop Dell Latitude 5420",
    Spesifikasi: "Intel Core i5-1135G7, RAM 16GB, SSD 512GB",
    Grup: "KOMPUTER",
    beban_kode: "MLM",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-07 (Perlengkapan & Inventaris IT)",
    NilaiAset: 15000000,
    TglPembelian: "2023-01-15",
    MasaManfaat: 48, // bulan
    StatusAset: "aktif",
    Pengguna: "Ahmad Subagyo",
    Lokasi: "Kantor Pusat - Ruang IT",
    Keterangan: "Laptop untuk staff IT",
  },
  {
    AsetId: "0002/BJR-NET/2023",
    AccurateId: "-",
    NamaAset: "OLT ZTE C320",
    Spesifikasi: "16 Port GPON, Max 1024 ONT",
    Grup: "HEADEND",
    beban_kode: "BJR-NET",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-04 (Distribusi Jaringan / Headend)",
    NilaiAset: 85000000,
    TglPembelian: "2023-03-20",
    MasaManfaat: 60, // bulan
    StatusAset: "aktif",
    Pengguna: "Tim Teknik Bojonegoro",
    Lokasi: "Headend BJR",
    Keterangan: "OLT utama untuk area Bojonegoro",
  },
  {
    AsetId: "0003/SRG-NET/2022",
    AccurateId: "-",
    NamaAset: "Kendaraan Toyota Avanza",
    Spesifikasi: "1.3 G MT, Warna Hitam, Plat L",
    Grup: "KENDARAAN",
    beban_kode: "SRG-NET",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-03 (Kendaraan)",
    NilaiAset: 185000000,
    TglPembelian: "2022-06-10",
    MasaManfaat: 60, // bulan
    StatusAset: "aktif",
    Pengguna: "Teknisi Lapangan",
    Lokasi: "Kantor Serang",
    Keterangan: "Mobil operasional teknisi",
  },
  {
    AsetId: "0004/MLM/2024",
    AccurateId: "-",
    NamaAset: "AC Split Daikin 2 PK",
    Spesifikasi: "Inverter, Freon R32",
    Grup: "PERALATAN & INVENTARIS KANTOR",
    beban_kode: "MLM",
    departemen_kode: "HRDGA",
    AkunPerkiraan: "1701-05 (Peralatan & Inventaris Kantor)",
    NilaiAset: 8500000,
    TglPembelian: "2024-02-05",
    MasaManfaat: 36, // bulan
    StatusAset: "aktif",
    Pengguna: null,
    Lokasi: "Kantor Pusat - Ruang Meeting",
    Keterangan: "AC untuk ruang meeting utama",
  },
  {
    AsetId: "0005/BNT-MEDIA/2023",
    AccurateId: "-",
    NamaAset: "Server Dell PowerEdge R240",
    Spesifikasi: "Xeon E-2224, RAM 32GB, HDD 4TB x 2 RAID1",
    Grup: "KOMPUTER",
    beban_kode: "BNT-MEDIA",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-07 (Perlengkapan & Inventaris IT)",
    NilaiAset: 35000000,
    TglPembelian: "2023-08-12",
    MasaManfaat: 60, // bulan
    StatusAset: "diperbaiki",
    Pengguna: "Server Admin",
    Lokasi: "Data Center Banten",
    Keterangan: "Server untuk layanan streaming media",
  },
  {
    AsetId: "0006/MLG-NET/2024",
    AccurateId: "-",
    NamaAset: "Switch Cisco SG350-28P",
    Spesifikasi: "28 Port Gigabit PoE+, Layer 3",
    Grup: "DISTRIBUSI JARINGAN",
    beban_kode: "MLG-NET",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-04 (Distribusi Jaringan / Headend)",
    NilaiAset: 18500000,
    TglPembelian: "2024-01-20",
    MasaManfaat: 60, // bulan
    StatusAset: "aktif",
    Pengguna: "Tim Network",
    Lokasi: "Headend Malang",
    Keterangan: "Switch untuk distribusi jaringan area Malang",
  },
  {
    AsetId: "0007/SBY-NET/2023",
    AccurateId: "-",
    NamaAset: "Meja Kantor Eksekutif",
    Spesifikasi: "Kayu Jati, Ukuran 160x80cm",
    Grup: "PERALATAN & INVENTARIS KANTOR",
    beban_kode: "SBY-NET",
    departemen_kode: "HRDGA",
    AkunPerkiraan: "1701-05 (Peralatan & Inventaris Kantor)",
    NilaiAset: 4500000,
    TglPembelian: "2023-11-05",
    MasaManfaat: 48, // bulan
    StatusAset: "aktif",
    Pengguna: "Manager Regional",
    Lokasi: "Kantor Surabaya - Ruang Manager",
    Keterangan: null,
  },
  {
    AsetId: "0008/PDG-NET/2022",
    AccurateId: "-",
    NamaAset: "Generator Listrik Honda 5000 Watt",
    Spesifikasi: "Bensin, EU50IS, Silent Type",
    Grup: "PERALATAN & INVENTARIS KANTOR",
    beban_kode: "PDG-NET",
    departemen_kode: "TEK",
    AkunPerkiraan: "1701-05 (Peralatan & Inventaris Kantor)",
    NilaiAset: 22000000,
    TglPembelian: "2022-09-15",
    MasaManfaat: 60, // bulan
    StatusAset: "aktif",
    Pengguna: "Teknisi Padang",
    Lokasi: "Headend Padang",
    Keterangan: "Genset cadangan untuk headend",
  },
];

// Data perbaikan dengan teknisi (vendor)
const perbaikanData = [
  {
    AsetId: "0005/BNT-MEDIA/2023",
    tanggal_perbaikan: "2024-11-20",
    deskripsi: "Perbaikan hardware RAID controller yang rusak",
    biaya: 5500000,
    teknisi: "PT. Mitra Teknologi Indonesia",
    PurchaseOrder: "PO-2024-1120",
  },
  {
    AsetId: "0002/BJR-NET/2023",
    tanggal_perbaikan: "2024-10-15",
    deskripsi: "Service rutin dan cleaning optical port",
    biaya: 2500000,
    teknisi: "CV. Network Solutions",
    PurchaseOrder: "PO-2024-1015",
  },
  {
    AsetId: "0003/SRG-NET/2022",
    tanggal_perbaikan: "2024-09-05",
    deskripsi: "Ganti oli, tune up mesin, ganti filter udara",
    biaya: 1200000,
    teknisi: "Toyota Auto2000 Serang",
    PurchaseOrder: "-",
  },
  {
    AsetId: "0006/MLG-NET/2024",
    tanggal_perbaikan: "2024-12-01",
    deskripsi: "Update firmware ke versi terbaru",
    biaya: 0,
    teknisi: "Teknisi Internal",
    PurchaseOrder: "-",
  },
];

async function getBebanId(kode) {
  return new Promise((resolve, reject) => {
    db.query("SELECT id FROM beban WHERE kode = ?", [kode], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error(`Beban ${kode} not found`));
      resolve(results[0].id);
    });
  });
}

async function getDepartemenId(kode) {
  return new Promise((resolve, reject) => {
    db.query("SELECT id FROM departemen WHERE kode = ?", [kode], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error(`Departemen ${kode} not found`));
      resolve(results[0].id);
    });
  });
}

async function getAsetId(asetId) {
  return new Promise((resolve, reject) => {
    db.query("SELECT id FROM aset WHERE AsetId = ?", [asetId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return reject(new Error(`Aset ${asetId} not found`));
      resolve(results[0].id);
    });
  });
}

async function insertAset(aset) {
  const beban_id = await getBebanId(aset.beban_kode);
  const departemen_id = await getDepartemenId(aset.departemen_kode);

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO aset (
        AsetId, AccurateId, NamaAset, Spesifikasi, Grup, 
        beban_id, departemen_id, AkunPerkiraan, NilaiAset, 
        TglPembelian, MasaManfaat, StatusAset, Pengguna, 
        Lokasi, Keterangan
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [
        aset.AsetId,
        aset.AccurateId,
        aset.NamaAset,
        aset.Spesifikasi,
        aset.Grup,
        beban_id,
        departemen_id,
        aset.AkunPerkiraan,
        aset.NilaiAset,
        aset.TglPembelian,
        aset.MasaManfaat,
        aset.StatusAset,
        aset.Pengguna,
        aset.Lokasi,
        aset.Keterangan,
      ],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

async function insertPerbaikan(perbaikan) {
  const aset_id = await getAsetId(perbaikan.AsetId);

  return new Promise((resolve, reject) => {
    const query = `
      INSERT INTO perbaikan (
        aset_id, tanggal_perbaikan, deskripsi, 
        biaya, teknisi, PurchaseOrder
      ) VALUES (?, ?, ?, ?, ?, ?)
    `;

    db.query(
      query,
      [
        aset_id,
        perbaikan.tanggal_perbaikan,
        perbaikan.deskripsi,
        perbaikan.biaya,
        perbaikan.teknisi,
        perbaikan.PurchaseOrder,
      ],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
}

async function main() {
  console.log("🚀 Memulai seeding data aset dan perbaikan...\n");

  try {
    // Insert data aset
    console.log("📦 Mengisi data aset...");
    for (const aset of asetData) {
      try {
        await insertAset(aset);
        console.log(`✅ Berhasil insert aset: ${aset.AsetId} - ${aset.NamaAset}`);
      } catch (err) {
        if (err.code === "ER_DUP_ENTRY") {
          console.log(`⚠️  Aset sudah ada: ${aset.AsetId}`);
        } else {
          console.error(`❌ Gagal insert aset ${aset.AsetId}:`, err.message);
        }
      }
    }

    console.log("\n🔧 Mengisi data perbaikan...");
    for (const perbaikan of perbaikanData) {
      try {
        await insertPerbaikan(perbaikan);
        console.log(`✅ Berhasil insert perbaikan untuk aset: ${perbaikan.AsetId}`);
      } catch (err) {
        console.error(`❌ Gagal insert perbaikan untuk ${perbaikan.AsetId}:`, err.message);
      }
    }

    console.log("\n✨ Seeding selesai!");
  } catch (err) {
    console.error("❌ Error:", err);
  } finally {
    process.exit(0);
  }
}

main();
