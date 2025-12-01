import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanFromRequest,
} from "./middleware/auth.js";

const router = express.Router();

function mapRow(r) {
  if (!r) return r;
  return {
    id: r.id ?? null,
    AsetId: r.AsetId ?? null,
    tanggal: r.tanggal ?? null,
    PurchaseOrder: r.PurchaseOrder ?? null,
    vendor: r.vendor ?? null,
    bagian: r.bagian ?? null,
    nominal: r.nominal ?? null,
  };
}

// Logging
router.use((req, res, next) => {
  const role = getRoleFromRequest(req) || "(none)";
  const beban = getBebanFromRequest(req) || "(none)";
  console.log(
    `[perbaikan] ${req.method} ${req.originalUrl} - role=${role} beban=${beban}`
  );
  next();
});

// GET list: admin sees all; user sees repairs for assets in their Beban
router.get("/", requireUserOrAdmin, (req, res) => {
  const queryAset =
    req.query.asetId || req.query.AsetId || req.query.aset || null;
  if (queryAset) {
    // Handle request to list perbaikan for a specific AsetId
    const roleQ = getRoleFromRequest(req);
    if (roleQ === "admin") {
      db.query(
        "SELECT * FROM perbaikan WHERE AsetId = ?",
        [queryAset],
        (err, rows) => {
          if (err) return res.status(500).json(err);
          return res.json(rows.map(mapRow));
        }
      );
      return;
    }
    const bebanQ = getBebanFromRequest(req);
    if (!bebanQ || bebanQ === "") {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE a.Beban = ? AND p.AsetId = ?`;
    db.query(q, [bebanQ, queryAset], (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows.map(mapRow));
    });
    return;
  }
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query("SELECT * FROM perbaikan", (err, rows) => {
      if (err) return res.status(500).json(err);
      res.json(rows.map(mapRow));
    });
    return;
  }
  const beban = getBebanFromRequest(req);
  if (!beban || beban === "") {
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  }
  const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE a.Beban = ?`;
  db.query(q, [beban], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

// GET by id
// GET perbaikan by AsetId (useful shorthand)
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;
  const role = getRoleFromRequest(req);
  if (role === "admin") {
    db.query(
      "SELECT * FROM perbaikan WHERE AsetId = ?",
      [asetId],
      (err, rows) => {
        if (err) return res.status(500).json(err);
        return res.json(rows.map(mapRow));
      }
    );
    return;
  }
  const beban = getBebanFromRequest(req);
  if (!beban || beban === "")
    return res
      .status(403)
      .json({ message: "Akses ditolak: beban tidak ditemukan" });
  const q = `SELECT p.* FROM perbaikan p JOIN aset a ON a.AsetId = p.AsetId WHERE a.Beban = ? AND p.AsetId = ?`;
  db.query(q, [beban, asetId], (err, rows) => {
    if (err) return res.status(500).json(err);
    res.json(rows.map(mapRow));
  });
});

router.get("/:id", requireUserOrAdmin, (req, res) => {
  const { id } = req.params;
  const q = "SELECT p.* FROM perbaikan p WHERE p.id = ?";
  db.query(q, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
    const p = rows[0];
    const role = getRoleFromRequest(req);
    if (role === "admin") return res.json(mapRow(p));
    const beban = getBebanFromRequest(req);
    if (!beban || beban === "") {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const qAset = "SELECT Beban FROM aset WHERE AsetId = ?";
    db.query(qAset, [p.AsetId], (err2, rows2) => {
      if (err2) return res.status(500).json(err2);
      if (!rows2 || rows2.length === 0)
        return res.status(404).json({ message: "Parent aset tidak ditemukan" });
      const asetBeban = rows2[0].Beban ?? null;
      if (asetBeban !== beban)
        return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
      res.json(mapRow(p));
    });
  });
});

// Create perbaikan (user or admin). Check asset Beban for user.
router.post("/", requireUserOrAdmin, (req, res) => {
  const data = req.body;
  if (!data || !data.AsetId || !data.tanggal) {
    return res.status(400).json({ message: "AsetId dan tanggal diperlukan" });
  }
  const role = getRoleFromRequest(req);
  const beban = getBebanFromRequest(req);
  const checkAsetQ = "SELECT Beban FROM aset WHERE AsetId = ?";
  db.query(checkAsetQ, [data.AsetId], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Aset tidak ditemukan" });
    const asetBeban = rows[0].Beban ?? null;
    if (role !== "admin" && asetBeban !== beban) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: tidak punya akses ke Aset ini" });
    }
    const q = `INSERT INTO perbaikan (AsetId, tanggal, PurchaseOrder, vendor, bagian, nominal) VALUES (?, ?, ?, ?, ?, ?)`;
    const vals = [
      data.AsetId,
      data.tanggal,
      data.PurchaseOrder ?? null,
      data.vendor ?? null,
      data.bagian ?? null,
      data.nominal ?? null,
    ];
    db.query(q, vals, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      db.query(
        "SELECT * FROM perbaikan WHERE id = ?",
        [result.insertId],
        (err3, rows3) => {
          if (err3) return res.status(500).json(err3);
          res.status(201).json({
            message: "Perbaikan ditambahkan",
            perbaikan: mapRow(rows3[0]),
          });
        }
      );
    });
  });
});

// Update perbaikan (admin only)
router.put("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const data = req.body;
  const qSelect = "SELECT * FROM perbaikan WHERE id = ?";
  db.query(qSelect, [id], (err, rows) => {
    if (err) return res.status(500).json(err);
    if (!rows || rows.length === 0)
      return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
    const values = [
      data.AsetId,
      data.tanggal,
      data.PurchaseOrder,
      data.vendor,
      data.bagian,
      data.nominal,
      id,
    ];
    const q = `UPDATE perbaikan SET AsetId = COALESCE(?, AsetId), tanggal = COALESCE(?, tanggal), PurchaseOrder = COALESCE(?, PurchaseOrder), vendor = COALESCE(?, vendor), bagian = COALESCE(?, bagian), nominal = COALESCE(?, nominal) WHERE id = ?`;
    db.query(q, values, (err2, result) => {
      if (err2) return res.status(500).json(err2);
      db.query("SELECT * FROM perbaikan WHERE id = ?", [id], (err3, rows3) => {
        if (err3) return res.status(500).json(err3);
        res.json({
          message: "Perbaikan berhasil diupdate",
          perbaikan: mapRow(rows3[0]),
        });
      });
    });
  });
});

// Delete (admin only)
router.delete("/:id", requireAdmin, (req, res) => {
  const { id } = req.params;
  const q = "DELETE FROM perbaikan WHERE id = ?";
  db.query(q, [id], (err, r) => {
    if (err) return res.status(500).json(err);
    if (r.affectedRows === 0)
      return res.status(404).json({ message: "Perbaikan tidak ditemukan" });
    res.json({ message: "Perbaikan berhasil dihapus" });
  });
});

export default router;
