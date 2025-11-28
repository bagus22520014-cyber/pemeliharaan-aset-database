import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanFromRequest,
} from "./middleware/auth.js";
import express from "express";
import db from "../db.js";

const router = express.Router();

// Simple debugging middleware to log requests and role header
router.use((req, res, next) => {
  const role = req.headers["x-role"] || req.headers["role"] || "(none)";
  console.log(`[aset] ${req.method} ${req.originalUrl} - x-role=${role}`);
  next();
});

// GET semua aset (user/admin)
router.get("/", requireUserOrAdmin, (req, res) => {
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    const q = "SELECT * FROM aset";
    db.query(q, (err, result) => {
      if (err) return res.status(500).json(err);
      res.json(result);
    });
    return;
  }
  // for users, filter by beban associated with the user
  const beban = getBebanFromRequest(req);
  if (!beban || beban === "") {
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  }
  const q = "SELECT * FROM aset WHERE Beban = ?";
  db.query(q, [beban], (err, result) => {
    if (err) return res.status(500).json(err);
    res.json(result);
  });
});

// Tambah aset (user/admin)
router.post("/", requireUserOrAdmin, (req, res) => {
  const data = req.body;
  const q = `
    INSERT INTO aset 
    (AsetId, AccurateId, NamaAset, Spesifikasi, Grup, Beban, AkunPerkiraan, NilaiAset, TglPembelian, MasaManfaat)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.AsetId,
    data.AccurateId,
    data.NamaAset,
    data.Spesifikasi,
    data.Grup,
    data.Beban,
    data.AkunPerkiraan,
    data.NilaiAset,
    data.TglPembelian,
    data.MasaManfaat,
  ];

  db.query(q, values, (err) => {
    if (err) return res.status(500).json(err);
    res.json({ message: "Aset berhasil ditambahkan" });
  });
});

// GET aset by AsetId (user/admin)
router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q = "SELECT * FROM aset WHERE AsetId = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (!result || result.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    const asset = result[0];
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(asset);
    const beban = getBebanFromRequest(req);
    if (!beban || beban === "") {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    if (asset.Beban !== beban) {
      // For security, respond with 404 to avoid information leakage
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    }
    res.json(asset);
  });
});

// Update aset (admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;

  // Fetch current record first so we can apply partial updates safely
  const qSelect = "SELECT * FROM aset WHERE AsetId = ?";
  db.query(qSelect, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    }

    const current = rows[0];
    // Compose update values: use provided value or fallback to current
    // Use COALESCE(?, existing) so that if the client sends null/undefined we keep the existing value
    const values = [
      data.AccurateId,
      data.NamaAset,
      data.Spesifikasi,
      data.Grup,
      data.Beban,
      data.AkunPerkiraan,
      data.NilaiAset,
      data.TglPembelian,
      data.MasaManfaat,
      id,
    ];

    const q = `UPDATE aset SET AccurateId = COALESCE(?, AccurateId), NamaAset = COALESCE(?, NamaAset), Spesifikasi = COALESCE(?, Spesifikasi), Grup = COALESCE(?, Grup), Beban = COALESCE(?, Beban), AkunPerkiraan = COALESCE(?, AkunPerkiraan), NilaiAset = COALESCE(?, NilaiAset), TglPembelian = COALESCE(?, TglPembelian), MasaManfaat = COALESCE(?, MasaManfaat) WHERE AsetId = ?`;
    console.log(`[aset] UPDATE SQL: ${q} values=${JSON.stringify(values)}`);

    db.query(q, values, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      // result.affectedRows: number of rows matched/changed; changedRows shows changes.
      if (result.affectedRows === 0) {
        // We'll check if row existed above; affectedRows==0 likely means no change
        return res.json({ message: "Tidak ada perubahan (data sama)" });
      }
      res.json({
        message: "Aset berhasil diupdate",
        affectedRows: result.affectedRows,
        changedRows: result.changedRows,
      });
    });
  });
});

// Delete aset (admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const role = getRoleFromRequest(req);
  console.log(`[aset] DELETE handler invoked for AsetId=${id} role=${role}`);
  const q = "DELETE FROM aset WHERE AsetId = ?";
  db.query(q, [id], (err, result) => {
    if (err) return res.status(500).json(err);
    if (result.affectedRows === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    res.json({ message: "Aset berhasil dihapus" });
  });
});

export default router;
