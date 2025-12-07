import express from "express";
import db from "../db.js";
import {
  requireAdmin,
  requireUserOrAdmin,
  getRoleFromRequest,
  getBebanListFromRequest,
  buildBebanFilterSQL,
} from "./middleware/auth.js";

const router = express.Router();

// Get all riwayat (user can access with beban filter, admin sees all)
router.get("/", requireUserOrAdmin, (req, res) => {
  const { aset_id, user_id, limit, tabel_ref } = req.query;
  const role = getRoleFromRequest(req);
  const beban = getBebanListFromRequest(req);

  let q = `
    SELECT r.*, 
           u.username, 
           a.AsetId, a.NamaAset, 
           b.kode as beban_kode
    FROM riwayat r
    LEFT JOIN user u ON r.user_id = u.id
    LEFT JOIN aset a ON r.aset_id = a.id
    LEFT JOIN beban b ON a.beban_id = b.id
  `;

  const conditions = [];
  const params = [];

  // User role: filter by beban
  if (role !== "admin") {
    if (!beban || beban.length === 0) {
      return res
        .status(403)
        .json({ message: "Akses ditolak: beban tidak ditemukan" });
    }
    const { clause, params: bebanParams } = buildBebanFilterSQL(
      "b.kode",
      beban
    );
    conditions.push(`(${clause})`);
    params.push(...bebanParams);
  }

  if (aset_id) {
    conditions.push("r.aset_id = ?");
    params.push(aset_id);
  }

  if (user_id) {
    conditions.push("r.user_id = ?");
    params.push(user_id);
  }

  if (tabel_ref) {
    conditions.push("r.tabel_ref = ?");
    params.push(tabel_ref);
  }

  if (conditions.length > 0) {
    q += " WHERE " + conditions.join(" AND ");
  }

  q += " ORDER BY r.created_at DESC";

  if (limit) {
    q += " LIMIT ?";
    params.push(parseInt(limit));
  }

  db.query(q, params, (err, result) => {
    if (err) return res.status(500).json(err);

    // Parse perubahan JSON
    const mapped = result.map((row) => ({
      id: row.id,
      jenis_aksi: row.jenis_aksi,
      user_id: row.user_id,
      username: row.username,
      role: row.role,
      aset_id: row.aset_id,
      AsetId: row.AsetId,
      NamaAset: row.NamaAset,
      tabel_ref: row.tabel_ref,
      record_id: row.record_id,
      perubahan: row.perubahan
        ? typeof row.perubahan === "string"
          ? JSON.parse(row.perubahan)
          : row.perubahan
        : null,
      created_at: row.created_at,
      waktu: row.waktu || row.created_at,
    }));

    res.json(mapped);
  });
});

// Get riwayat by specific aset AsetId (e.g., "0001/MLM/2024")
router.get("/aset/:asetId", requireUserOrAdmin, (req, res) => {
  const { asetId } = req.params;

  const q = `
    SELECT r.*, 
           u.username, 
           a.AsetId, a.NamaAset
    FROM riwayat r
    LEFT JOIN user u ON r.user_id = u.id
    LEFT JOIN aset a ON r.aset_id = a.id
    WHERE a.AsetId = ?
    ORDER BY r.created_at DESC
  `;

  db.query(q, [asetId], (err, result) => {
    if (err) return res.status(500).json(err);

    const mapped = result.map((row) => ({
      id: row.id,
      jenis_aksi: row.jenis_aksi,
      user_id: row.user_id,
      username: row.username,
      role: row.role,
      aset_id: row.aset_id,
      AsetId: row.AsetId,
      NamaAset: row.NamaAset,
      tabel_ref: row.tabel_ref,
      record_id: row.record_id,
      perubahan: row.perubahan
        ? typeof row.perubahan === "string"
          ? JSON.parse(row.perubahan)
          : row.perubahan
        : null,
      created_at: row.created_at,
      waktu: row.waktu || row.created_at,
    }));

    res.json(mapped);
  });
});

// Get riwayat by username
router.get("/user/:username", requireAdmin, (req, res) => {
  const { username } = req.params;

  const q = `
    SELECT r.*, 
           u.username, 
           a.AsetId, a.NamaAset
    FROM riwayat r
    LEFT JOIN user u ON r.user_id = u.id
    LEFT JOIN aset a ON r.aset_id = a.id
    WHERE u.username = ?
    ORDER BY r.created_at DESC
  `;

  db.query(q, [username], (err, result) => {
    if (err) return res.status(500).json(err);

    const mapped = result.map((row) => ({
      id: row.id,
      jenis_aksi: row.jenis_aksi,
      user_id: row.user_id,
      username: row.username,
      role: row.role,
      aset_id: row.aset_id,
      AsetId: row.AsetId,
      NamaAset: row.NamaAset,
      tabel_ref: row.tabel_ref,
      record_id: row.record_id,
      perubahan: row.perubahan
        ? typeof row.perubahan === "string"
          ? JSON.parse(row.perubahan)
          : row.perubahan
        : null,
      created_at: row.created_at,
      waktu: row.waktu || row.created_at,
    }));

    res.json(mapped);
  });
});

export default router;
