import express from "express";
import db from "../db.js";
import { requireAdmin } from "./middleware/auth.js";

const router = express.Router();

// Dev helper: create a mutasi and an associated riwayat record with a specified submitter username.
// Admin only. Body: { aset_id, TglMutasi, departemen_tujuan_id, ruangan_tujuan, submitter_username }
router.post("/create-mutasi-with-submit", requireAdmin, (req, res) => {
  const {
    aset_id,
    TglMutasi,
    departemen_tujuan_id,
    ruangan_tujuan,
    submitter_username,
    alasan,
    catatan,
  } = req.body;

  if (!aset_id || !TglMutasi || !submitter_username) {
    return res
      .status(400)
      .json({ message: "aset_id, TglMutasi, submitter_username required" });
  }

  // Resolve submitter user id
  db.query(
    "SELECT id, role FROM user WHERE username = ?",
    [submitter_username],
    (errU, urows) => {
      if (errU) return res.status(500).json(errU);
      if (!urows || urows.length === 0)
        return res.status(404).json({ message: "submitter user not found" });
      const submitterId = urows[0].id;

      // Insert mutasi with status 'diajukan'
      const q = `INSERT INTO mutasi (aset_id, TglMutasi, departemen_asal_id, departemen_tujuan_id, ruangan_asal, ruangan_tujuan, alasan, catatan, approval_status) VALUES (?, ?, NULL, ?, NULL, ?, ?, ?, 'diajukan')`;
      db.query(
        q,
        [
          aset_id,
          TglMutasi,
          departemen_tujuan_id || null,
          ruangan_tujuan || null,
          alasan || null,
          catatan || null,
        ],
        (err, result) => {
          if (err) return res.status(500).json(err);
          const mutasiId = result.insertId;

          // Insert riwayat mutasi_input with submitter as user
          const perubahan = {
            TglMutasi,
            departemen_tujuan_id: departemen_tujuan_id || null,
            ruangan_tujuan: ruangan_tujuan || null,
            alasan: alasan || null,
          };
          const qRiwayat = `INSERT INTO riwayat (jenis_aksi, user_id, role, aset_id, perubahan, tabel_ref, record_id) VALUES (?, ?, ?, ?, ?, ?, ?)`;
          db.query(
            qRiwayat,
            [
              "mutasi_input",
              submitterId,
              urows[0].role,
              aset_id,
              JSON.stringify(perubahan),
              "mutasi",
              mutasiId,
            ],
            (errR) => {
              if (errR) return res.status(500).json(errR);
              return res.json({
                id: mutasiId,
                message: "Mutasi (with submitter riwayat) created",
              });
            }
          );
        }
      );
    }
  );
});

export default router;
