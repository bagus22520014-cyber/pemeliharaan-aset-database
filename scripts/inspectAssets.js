import db from "../db.js";

async function run() {
  try {
    const q = `
      SELECT a.*, b.kode as beban_kode, d.kode as departemen_kode, d.nama as departemen_nama
      FROM aset a
      LEFT JOIN beban b ON a.beban_id = b.id
      LEFT JOIN departemen d ON a.departemen_id = d.id
      ORDER BY a.id DESC
      LIMIT 50
    `;
    const [rows] = await db.promise().query(q);
    if (!rows || rows.length === 0) {
      console.log("No rows in aset table.");
      process.exit(0);
    }
    console.log(`Found ${rows.length} row(s) in aset:`);
    // print compactly
    rows.forEach((r) => {
      console.log({
        id: r.id,
        AsetId: r.AsetId,
        NamaAset: r.NamaAset,
        beban_kode: r.beban_kode,
        departemen: r.departemen_nama || r.departemen_kode,
      });
    });
    process.exit(0);
  } catch (err) {
    console.error("Error querying aset:", err);
    process.exit(2);
  }
}

run();
