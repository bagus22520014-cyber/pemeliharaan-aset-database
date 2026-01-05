#!/usr/bin/env node
import db from "../db.js";

// Usage:
//  node scripts/dedupe_riwayat.js         -> dry-run (list duplicates)
//  node scripts/dedupe_riwayat.js --apply -> actually delete duplicate rows (keep lowest id)

const args = process.argv.slice(2);
const apply = args.includes("--apply");

async function findDuplicates() {
  const q = `
    SELECT
      jenis_aksi,
      aset_id,
      tabel_ref,
      perubahan,
      COUNT(*) as cnt,
      GROUP_CONCAT(id ORDER BY id ASC) as ids,
      MIN(id) as keep_id
    FROM riwayat
    GROUP BY jenis_aksi, aset_id, tabel_ref, perubahan
    HAVING COUNT(*) > 1
  `;
  const [rows] = await db.promise().query(q);
  return rows;
}

async function run() {
  try {
    const dups = await findDuplicates();
    if (!dups || dups.length === 0) {
      console.log("No duplicate riwayat groups found.");
      process.exit(0);
    }

    for (const g of dups) {
      const ids = String(g.ids)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map(Number);
      const keep = Number(g.keep_id);
      const toDelete = ids.filter((id) => id !== keep);

      console.log("Found duplicate group:");
      console.log(
        `  jenis_aksi=${g.jenis_aksi} aset_id=${g.aset_id} tabel_ref=${g.tabel_ref} cnt=${g.cnt}`
      );
      console.log(`  keep_id=${keep} duplicates=[${toDelete.join(", ")}]`);
      try {
        const parsed = g.perubahan
          ? typeof g.perubahan === "string"
            ? g.perubahan
            : JSON.stringify(g.perubahan)
          : null;
        console.log(`  perubahan=${parsed}`);
      } catch {}

      if (apply && toDelete.length > 0) {
        const placeholders = toDelete.map(() => "?").join(",");
        const delQ = `DELETE FROM riwayat WHERE id IN (${placeholders})`;
        const [res] = await db.promise().execute(delQ, toDelete);
        console.log(`  Deleted ${res.affectedRows} rows.`);
      }
    }

    if (!apply)
      console.log(
        "\nDry-run complete. Re-run with --apply to remove duplicates."
      );
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(2);
  }
}

run();
